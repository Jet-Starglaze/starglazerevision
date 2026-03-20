import type { PracticeRubricAssessment } from "@/lib/mock-biology-practice-api";

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
