import { buildRubricNextStepInstruction } from "./rubric-display.ts";
import type {
  PointsModeModelResponse,
  PreparedMarkingInput,
  RubricAssessmentItem,
} from "./types.ts";

const MIN_MEANINGFUL_WORDS = 3;
const FRAGMENT_SEPARATOR_PATTERN = /\s+\+\s+/;
const EDGE_PUNCTUATION_PATTERN = /^[^a-z0-9]+|[^a-z0-9]+$/gi;
const NON_ALPHANUMERIC_PATTERN = /[^a-z0-9]+/gi;
const WHITESPACE_PATTERN = /\s+/g;

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
  shortResponse,
}: {
  item: RubricAssessmentItem | undefined;
  pointText: string;
  answerText: string;
  shortResponse: boolean;
}): RubricAssessmentItem {
  const evidence = item?.evidence?.trim() ?? "";

  if (
    !item ||
    item.status === "absent" ||
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
