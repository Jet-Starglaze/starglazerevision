import type {
  PracticeLevelDescriptor,
  PracticeRubricAssessment,
} from "@/lib/mock-biology-practice-api";

export function countPresentRubricPoints(
  rubricAssessment: PracticeRubricAssessment[],
) {
  return rubricAssessment.filter((item) => item.status === "present").length;
}

export function computePointsModeScore(
  rubricAssessment: PracticeRubricAssessment[],
  maxScore: number,
) {
  return Math.min(maxScore, countPresentRubricPoints(rubricAssessment));
}

export function validateLevelsModeLevel(
  levelDescriptors: PracticeLevelDescriptor[],
  recommendedLevel: number,
) {
  const matchingDescriptor =
    levelDescriptors.find(
      (descriptor) => descriptor.levelNumber === recommendedLevel,
    ) ?? null;

  if (!matchingDescriptor) {
    throw new Error("recommendedLevel must match an available level descriptor");
  }

  return matchingDescriptor;
}

export function validateLevelsModeMark(
  descriptor: PracticeLevelDescriptor,
  recommendedMark: number,
  maxScore: number,
) {
  if (
    recommendedMark < descriptor.minMark ||
    recommendedMark > descriptor.maxMark ||
    recommendedMark > maxScore
  ) {
    throw new Error("recommendedMark must fall inside the selected level band");
  }

  return recommendedMark;
}
