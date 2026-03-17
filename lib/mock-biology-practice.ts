export const BIOLOGY_PRACTICE_SUBJECT_SLUG = "ocr-a-level-biology-a";

export const practiceQuestionFilterModes = [
  "mixed",
  "six-mark-only",
  "long-answer",
] as const;

export type PracticeQuestionFilterMode =
  (typeof practiceQuestionFilterModes)[number];

export type PracticeQuestionCommandWord = string;

export const knownPracticeQuestionCommandWords = [
  "explain",
  "describe",
  "compare",
  "define",
  "calculate",
  "suggest",
] as const;

export type KnownPracticeQuestionCommandWord =
  (typeof knownPracticeQuestionCommandWords)[number];

export type PracticeSessionLength = 5 | 10 | 20;

export type PracticeSubtopic = {
  id: number;
  slug: string;
  code: string;
  name: string;
};

export type PracticeTopic = {
  id: number;
  slug: string;
  name: string;
  subtopics: PracticeSubtopic[];
};

export type PracticeModule = {
  id: number;
  slug: string;
  label: string;
  name: string;
  topics: PracticeTopic[];
};

export function normalizePracticeQuestionCommandWord(value: string) {
  return value.trim().toLowerCase();
}

export function isKnownPracticeQuestionCommandWord(
  value: string,
): value is KnownPracticeQuestionCommandWord {
  return knownPracticeQuestionCommandWords.includes(
    value as KnownPracticeQuestionCommandWord,
  );
}

export function isPracticeQuestionCommandWord(
  value: unknown,
): value is PracticeQuestionCommandWord {
  return (
    typeof value === "string" &&
    /^[a-z]+(?:-[a-z]+)*$/.test(normalizePracticeQuestionCommandWord(value))
  );
}

export function inferPracticeQuestionCommandWord(questionText: string) {
  const firstWordMatch = questionText.trim().match(/^([A-Za-z-]+)/);

  if (!firstWordMatch) {
    return null;
  }

  const normalizedFirstWord = normalizePracticeQuestionCommandWord(
    firstWordMatch[1],
  );

  return isKnownPracticeQuestionCommandWord(normalizedFirstWord)
    ? normalizedFirstWord
    : null;
}
