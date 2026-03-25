import { buildRubricNextStepInstruction } from "./rubric-display.ts";
import type {
  PointsModeModelResponse,
  PreparedMarkingInput,
  RubricAssessmentItem,
} from "./types.ts";

const MIN_MEANINGFUL_WORDS = 3;
const FRAGMENT_SEPARATOR_PATTERN = /\s+\+\s+/;
const ANSWER_SPAN_SEPARATOR_PATTERN = /(?:\r?\n)+|[.!?;:]+/g;
const EDGE_PUNCTUATION_PATTERN = /^[^a-z0-9]+|[^a-z0-9]+$/gi;
const NON_ALPHANUMERIC_PATTERN = /[^a-z0-9]+/gi;
const WHITESPACE_PATTERN = /\s+/g;
const WORD_TOKEN_PATTERN = /[a-z0-9]+/gi;
const SHOULD_LOG_MATCH_RECOVERY = process.env.NODE_ENV === "development";
const DIRECT_MATCH_STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "as",
  "at",
  "by",
  "for",
  "from",
  "in",
  "into",
  "of",
  "on",
  "or",
  "the",
  "to",
  "with",
]);
const NEGATION_MATCH_TOKENS = new Set([
  "never",
  "no",
  "none",
  "not",
  "without",
]);

type IndexedToken = {
  normalized: string;
  start: number;
  end: number;
};

export function countMeaningfulWords(answerText: string) {
  return answerText
    .split(/\s+/)
    .filter((token) => isMeaningfulToken(token)).length;
}

export function isAnswerTooShortToMark(answerText: string) {
  return countMeaningfulWords(answerText) < MIN_MEANINGFUL_WORDS;
}

export function isShortResponseQuestion(marks: number) {
  return marks < 3;
}

export function isEvidenceTraceable(evidence: string, answerText: string) {
  const normalizedAnswer = normalizeTraceableText(answerText);

  if (normalizedAnswer.length === 0) {
    return false;
  }

  const fragments = extractEvidenceFragments(evidence);

  if (fragments.length === 0) {
    return false;
  }

  return fragments.every((fragment) => {
    const normalizedFragment = normalizeTraceableText(fragment);

    return (
      normalizedFragment.length > 0 &&
      normalizedAnswer.includes(normalizedFragment)
    );
  });
}

export function createAllAbsentPointsModeResponse(
  input: PreparedMarkingInput,
): PointsModeModelResponse {
  return {
    rubricAssessment: input.rubricPoints.map((point) =>
      createAbsentRubricAssessmentItem(point.pointText.trim()),
    ),
    feedback: {
      nextStep: buildFailSafeNextStep(input),
    },
  };
}

export function sanitizePointsModeResponse(
  response: PointsModeModelResponse,
  input: PreparedMarkingInput,
): PointsModeModelResponse {
  const shortResponse = isShortResponseQuestion(input.marks);
  const sanitizedRubricAssessment = input.rubricPoints.map((point, index) =>
    sanitizeRubricAssessmentItem({
      item: response.rubricAssessment[index],
      pointText: point.pointText.trim(),
      answerText: input.answerText,
      generatedQuestionId: input.generatedQuestionId,
      shortResponse,
    }),
  );
  const everyPointAbsent = sanitizedRubricAssessment.every(
    (item) => item.status === "absent",
  );

  return {
    rubricAssessment: sanitizedRubricAssessment,
    feedback: everyPointAbsent
      ? {
          nextStep: buildFailSafeNextStep(input),
        }
      : response.feedback,
  };
}

function sanitizeRubricAssessmentItem({
  item,
  pointText,
  answerText,
  generatedQuestionId,
  shortResponse,
}: {
  item: RubricAssessmentItem | undefined;
  pointText: string;
  answerText: string;
  generatedQuestionId: number;
  shortResponse: boolean;
}): RubricAssessmentItem {
  const evidence = item?.evidence?.trim() ?? "";

  if (item?.status === "absent") {
    return (
      recoverAbsentRubricAssessmentItem({
        answerText,
        generatedQuestionId,
        pointText,
      }) ?? createAbsentRubricAssessmentItem(pointText)
    );
  }

  if (
    !item ||
    evidence.length === 0 ||
    !isEvidenceTraceable(evidence, answerText) ||
    (shortResponse && !hasClearShortResponseEvidence(evidence))
  ) {
    return createAbsentRubricAssessmentItem(pointText);
  }

  return {
    pointText,
    status: item.status,
    evidence,
  };
}

function hasClearShortResponseEvidence(evidence: string) {
  const fragments = extractEvidenceFragments(evidence);

  return (
    fragments.length === 1 && countMeaningfulWords(fragments[0] ?? "") >= 2
  );
}

function recoverAbsentRubricAssessmentItem({
  answerText,
  generatedQuestionId,
  pointText,
}: {
  answerText: string;
  generatedQuestionId: number;
  pointText: string;
}) {
  const recoveredEvidence = findDirectPointRecoveryEvidence(pointText, answerText);

  if (!recoveredEvidence) {
    return null;
  }

  maybeWarnAboutRecoveredAbsentPoint({
    generatedQuestionId,
    pointText,
    recoveredEvidence,
  });

  return {
    pointText,
    status: "present" as const,
    evidence: recoveredEvidence,
  };
}

function createAbsentRubricAssessmentItem(pointText: string): RubricAssessmentItem {
  return {
    pointText,
    status: "absent",
    evidence: "",
  };
}

function buildFailSafeNextStep(input: PreparedMarkingInput) {
  const firstPointText = input.rubricPoints[0]?.pointText?.trim();

  return firstPointText
    ? buildRubricNextStepInstruction({
        pointText: firstPointText,
        status: "absent",
      })
    : "Answer with one clear biological point from the mark scheme.";
}

function isMeaningfulToken(token: string) {
  const trimmedToken = token.replace(EDGE_PUNCTUATION_PATTERN, "");

  if (trimmedToken.length === 0) {
    return false;
  }

  return trimmedToken.replace(NON_ALPHANUMERIC_PATTERN, "").length >= 2;
}

function extractEvidenceFragments(evidence: string) {
  const trimmedEvidence = evidence.trim();

  if (trimmedEvidence.length === 0) {
    return [];
  }

  const rawFragments = trimmedEvidence
    .split(FRAGMENT_SEPARATOR_PATTERN)
    .map((fragment) => fragment.trim())
    .filter((fragment) => fragment.length > 0);

  if (rawFragments.length === 0) {
    return [];
  }

  return rawFragments.every((fragment) => isQuotedEvidenceFragment(fragment))
    ? rawFragments
        .map((fragment) => unquoteEvidenceFragment(fragment))
        .filter((fragment) => fragment.length > 0)
    : [trimmedEvidence];
}

function isQuotedEvidenceFragment(fragment: string) {
  return (
    (fragment.startsWith('"') && fragment.endsWith('"')) ||
    (fragment.startsWith("'") && fragment.endsWith("'"))
  );
}

function unquoteEvidenceFragment(fragment: string) {
  return fragment.slice(1, -1).trim();
}

function normalizeTraceableText(value: string) {
  return value
    .toLowerCase()
    .replace(NON_ALPHANUMERIC_PATTERN, " ")
    .trim()
    .replace(WHITESPACE_PATTERN, " ");
}

function findDirectPointRecoveryEvidence(pointText: string, answerText: string) {
  if (countMeaningfulWords(answerText) < MIN_MEANINGFUL_WORDS) {
    return null;
  }

  const pointTokens = extractMeaningfulMatchTokens(pointText);

  if (pointTokens.length < 2) {
    return null;
  }

  const answerSpans = getAnswerSpans(answerText);

  for (const answerSpan of answerSpans) {
    const spanTokens = extractIndexedMeaningfulTokens(answerSpan.text, answerSpan.start);

    if (spanTokens.length < pointTokens.length) {
      continue;
    }

    const matchedWindow = findOrderedTokenWindowWithSingleGap(
      pointTokens,
      spanTokens,
    );

    if (!matchedWindow) {
      continue;
    }

    if (
      containsNegationToken(
        spanTokens,
        matchedWindow.startTokenIndex,
        matchedWindow.endTokenIndex,
      )
    ) {
      continue;
    }

    const matchedText = answerText
      .slice(
        spanTokens[matchedWindow.startTokenIndex]!.start,
        spanTokens[matchedWindow.endTokenIndex]!.end,
      )
      .trim();

    if (matchedText.length === 0) {
      continue;
    }

    return JSON.stringify(matchedText);
  }

  return null;
}

function extractMeaningfulMatchTokens(value: string) {
  const matches = value.toLowerCase().match(WORD_TOKEN_PATTERN) ?? [];

  return matches.filter((token) => isMeaningfulMatchToken(token));
}

function getAnswerSpans(answerText: string) {
  const spans: Array<{ start: number; end: number; text: string }> = [];
  let currentStart = 0;

  ANSWER_SPAN_SEPARATOR_PATTERN.lastIndex = 0;

  for (const separatorMatch of answerText.matchAll(ANSWER_SPAN_SEPARATOR_PATTERN)) {
    const separatorIndex = separatorMatch.index ?? currentStart;
    appendAnswerSpan(spans, answerText, currentStart, separatorIndex);
    currentStart = separatorIndex + separatorMatch[0].length;
  }

  appendAnswerSpan(spans, answerText, currentStart, answerText.length);

  return spans;
}

function appendAnswerSpan(
  spans: Array<{ start: number; end: number; text: string }>,
  answerText: string,
  rawStart: number,
  rawEnd: number,
) {
  let start = rawStart;
  let end = rawEnd;

  while (start < end && /\s/.test(answerText[start] ?? "")) {
    start += 1;
  }

  while (end > start && /\s/.test(answerText[end - 1] ?? "")) {
    end -= 1;
  }

  if (end <= start) {
    return;
  }

  spans.push({
    start,
    end,
    text: answerText.slice(start, end),
  });
}

function extractIndexedMeaningfulTokens(text: string, offset: number) {
  const tokens: IndexedToken[] = [];
  const tokenPattern = new RegExp(WORD_TOKEN_PATTERN.source, WORD_TOKEN_PATTERN.flags);
  let tokenMatch: RegExpExecArray | null = tokenPattern.exec(text);

  while (tokenMatch) {
    const rawToken = tokenMatch[0];

    if (isMeaningfulMatchToken(rawToken)) {
      tokens.push({
        normalized: rawToken.toLowerCase(),
        start: offset + tokenMatch.index,
        end: offset + tokenMatch.index + rawToken.length,
      });
    }

    tokenMatch = tokenPattern.exec(text);
  }

  return tokens;
}

function isMeaningfulMatchToken(token: string) {
  const normalizedToken = token.toLowerCase();

  return (
    isMeaningfulToken(normalizedToken) &&
    !DIRECT_MATCH_STOP_WORDS.has(normalizedToken)
  );
}

function findOrderedTokenWindowWithSingleGap(
  pointTokens: string[],
  answerTokens: IndexedToken[],
) {
  for (let answerIndex = 0; answerIndex < answerTokens.length; answerIndex += 1) {
    if (answerTokens[answerIndex]!.normalized !== pointTokens[0]) {
      continue;
    }

    const endTokenIndex = findOrderedTokenWindowEndIndex({
      answerTokens,
      gapCount: 0,
      pointIndex: 1,
      pointTokens,
      previousAnswerIndex: answerIndex,
    });

    if (endTokenIndex !== null) {
      return {
        startTokenIndex: answerIndex,
        endTokenIndex,
      };
    }
  }

  return null;
}

function findOrderedTokenWindowEndIndex({
  answerTokens,
  gapCount,
  pointIndex,
  pointTokens,
  previousAnswerIndex,
}: {
  answerTokens: IndexedToken[];
  gapCount: number;
  pointIndex: number;
  pointTokens: string[];
  previousAnswerIndex: number;
}): number | null {
  if (pointIndex >= pointTokens.length) {
    return previousAnswerIndex;
  }

  for (
    let answerIndex = previousAnswerIndex + 1;
    answerIndex < answerTokens.length;
    answerIndex += 1
  ) {
    if (answerTokens[answerIndex]!.normalized !== pointTokens[pointIndex]) {
      continue;
    }

    const nextGapCount =
      gapCount + (answerIndex === previousAnswerIndex + 1 ? 0 : 1);

    if (nextGapCount > 1) {
      continue;
    }

    const endTokenIndex = findOrderedTokenWindowEndIndex({
      answerTokens,
      gapCount: nextGapCount,
      pointIndex: pointIndex + 1,
      pointTokens,
      previousAnswerIndex: answerIndex,
    });

    if (endTokenIndex !== null) {
      return endTokenIndex;
    }
  }

  return null;
}

function containsNegationToken(
  answerTokens: IndexedToken[],
  startTokenIndex: number,
  endTokenIndex: number,
) {
  for (let tokenIndex = startTokenIndex; tokenIndex <= endTokenIndex; tokenIndex += 1) {
    if (NEGATION_MATCH_TOKENS.has(answerTokens[tokenIndex]!.normalized)) {
      return true;
    }
  }

  return false;
}

function maybeWarnAboutRecoveredAbsentPoint({
  generatedQuestionId,
  pointText,
  recoveredEvidence,
}: {
  generatedQuestionId: number;
  pointText: string;
  recoveredEvidence: string;
}) {
  if (!SHOULD_LOG_MATCH_RECOVERY) {
    return;
  }

  console.warn(
    `[api/mark-answer] recovered-absent-point-match ${JSON.stringify({
      generatedQuestionId,
      pointText,
      recoveredEvidence,
      recoveryStrategy: "ordered_tokens_single_gap",
    })}`,
  );
}
