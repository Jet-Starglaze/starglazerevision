import { countMeaningfulWords } from "./marking/evidence.ts";
import { formatRubricPointDisplayText } from "./marking/rubric-display.ts";
import type {
  PracticeRubricAssessment,
  PracticeRubricPoint,
} from "./mock-biology-practice-api.ts";

export const MAX_PRACTICE_HINT_LEVEL = 3;

export type PracticeHintLevel = {
  level: 1 | 2 | 3;
  title: "Direction" | "Key ideas" | "Starter sentence";
  lines: string[];
};

export type PracticeReviewState = {
  present: PracticeRubricAssessment[];
  partial: PracticeRubricAssessment[];
  absent: PracticeRubricAssessment[];
  revealedMissing: PracticeRubricAssessment[];
  revealLimit: number;
  nextDraftTarget: string | null;
};

export function derivePracticeHints({
  questionText,
  answerFocus,
  rubricPoints,
  modelAnswer,
  maxScore,
}: {
  questionText: string;
  answerFocus: string;
  rubricPoints: PracticeRubricPoint[];
  modelAnswer: string | null;
  maxScore: number;
}): PracticeHintLevel[] {
  const orderedPoints = [...rubricPoints].sort(
    (left, right) => left.orderNumber - right.orderNumber,
  );
  const firstPoint = orderedPoints[0]?.pointText ?? "";
  const keyIdeaCount =
    maxScore >= 6 ? 3 : maxScore >= 4 ? 2 : Math.min(2, orderedPoints.length);
  const keyIdeas = orderedPoints
    .slice(0, Math.max(1, keyIdeaCount))
    .map((point) => formatRubricPointDisplayText(point.pointText));

  return [
    {
      level: 1,
      title: "Direction",
      lines: [buildDirectionHint(questionText, answerFocus)],
    },
    {
      level: 2,
      title: "Key ideas",
      lines:
        keyIdeas.length > 0
          ? keyIdeas
          : ["Start with the main biological idea the question is asking for."],
    },
    {
      level: 3,
      title: "Starter sentence",
      lines: [buildStarterSentence(firstPoint, modelAnswer)],
    },
  ];
}

export function isStuckPracticeAnswer(answerText: string) {
  return answerText.trim().length === 0 || countMeaningfulWords(answerText) < 3;
}

export function derivePracticeReviewState({
  rubricAssessment,
  score,
  maxScore,
}: {
  rubricAssessment: PracticeRubricAssessment[];
  score: number;
  maxScore: number;
}): PracticeReviewState {
  const present = rubricAssessment.filter((item) => item.status === "present");
  const partial = rubricAssessment.filter((item) => item.status === "partial");
  const absent = rubricAssessment.filter((item) => item.status === "absent");
  const revealLimit = getMissingPointRevealLimit(score, maxScore);
  const revealedMissing = absent.slice(0, revealLimit);
  const nextDraftTarget = buildNextDraftTarget({
    missingItems: revealedMissing,
    partialItems: partial,
  });

  return {
    present,
    partial,
    absent,
    revealedMissing,
    revealLimit,
    nextDraftTarget,
  };
}

export function getMissingPointRevealLimit(score: number, maxScore: number) {
  if (score >= maxScore) {
    return 0;
  }

  if (maxScore >= 6) {
    if (score <= 2) {
      return 3;
    }

    if (score <= 4) {
      return 2;
    }

    return 1;
  }

  if (maxScore === 4) {
    if (score <= 1) {
      return 2;
    }

    return 1;
  }

  return 1;
}

function buildDirectionHint(questionText: string, answerFocus: string) {
  const cleanedFocus = normalizeHintFragment(answerFocus);

  if (cleanedFocus) {
    return `Focus on ${cleanedFocus}.`;
  }

  const questionFocus = normalizeHintFragment(stripQuestionCommand(questionText));

  if (questionFocus) {
    return `Think about ${questionFocus}.`;
  }

  return "Think about the main biological structures and links involved.";
}

function buildStarterSentence(firstPointText: string, modelAnswer: string | null) {
  const displayPoint = formatRubricPointDisplayText(firstPointText);
  const starterPoint = normalizeSentenceBody(displayPoint);

  if (starterPoint) {
    const needsExplanationTail =
      typeof modelAnswer === "string" &&
      /\b(because|which|therefore|so that)\b/i.test(modelAnswer);

    return needsExplanationTail
      ? `Start with: "One important point is that ${starterPoint}, because ..."`
      : `Start with: "One important point is that ${starterPoint}."`;
  }

  return 'Start with: "One important point is that ..."';
}

function buildNextDraftTarget({
  missingItems,
  partialItems,
}: {
  missingItems: PracticeRubricAssessment[];
  partialItems: PracticeRubricAssessment[];
}) {
  const primaryMissingPoint = missingItems[0]?.pointText ?? null;

  if (primaryMissingPoint) {
    return `Add one clear sentence explaining that ${normalizeSentenceBody(
      formatRubricPointDisplayText(primaryMissingPoint),
    )}.`;
  }

  const primaryPartialPoint = partialItems[0]?.pointText ?? null;

  if (primaryPartialPoint) {
    return `Tighten one sentence so it clearly explains that ${normalizeSentenceBody(
      formatRubricPointDisplayText(primaryPartialPoint),
    )}.`;
  }

  return null;
}

function stripQuestionCommand(questionText: string) {
  return questionText
    .trim()
    .replace(
      /^(explain|describe|outline|state|suggest|compare|give|identify|name)\s+/i,
      "",
    )
    .replace(/[?!.]+$/g, "");
}

function normalizeHintFragment(value: string) {
  const trimmed = value.trim().replace(/\s+/g, " ").replace(/[?!.]+$/g, "");

  if (!trimmed) {
    return "";
  }

  return normalizeSentenceBody(trimmed);
}

function normalizeSentenceBody(value: string) {
  const trimmed = value.trim().replace(/\s+/g, " ").replace(/[?!.]+$/g, "");

  if (!trimmed) {
    return "";
  }

  if (/^[A-Z]{2,}\b/.test(trimmed)) {
    return trimmed;
  }

  return trimmed[0].toLowerCase() + trimmed.slice(1);
}
