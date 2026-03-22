import type { PracticeStructuredFeedback } from "@/lib/mock-biology-practice-api";
import type {
  PointsModeModelResponse,
  PreparedMarkingInput,
  RubricAssessmentItem,
} from "@/lib/marking/types";
import { buildRubricNextStepInstruction } from "@/lib/marking/rubric-display";

const lowSignalNextStepPatterns = [
  /^add one linked point$/,
  /^add a linked point$/,
  /^add another point$/,
  /^add more detail$/,
  /^add more detail to your answer$/,
  /^give more detail$/,
  /^explain more$/,
  /^be more specific$/,
  /^develop this further$/,
  /^develop this point$/,
  /^improve your answer$/,
  /^(add|give|include|write)\s+(more\s+)?detail\b/,
  /^(explain|develop|expand)\s+(this|it|that|further|more)\b/,
];

export function finalizePointsModeResponse(
  response: PointsModeModelResponse,
  input: PreparedMarkingInput,
): PointsModeModelResponse {
  return {
    ...response,
    feedback: finalizeStructuredFeedback(response, input),
  };
}

function finalizeStructuredFeedback(
  response: PointsModeModelResponse,
  input: PreparedMarkingInput,
): PracticeStructuredFeedback {
  const feedbackTarget = getFeedbackTarget(response.rubricAssessment);
  const nextStep =
    feedbackTarget && isLowSignalNextStep(response.feedback.nextStep)
      ? buildRubricNextStepInstruction({
          pointText: input.rubricPoints[feedbackTarget.index]?.pointText ??
            feedbackTarget.pointText,
          status: feedbackTarget.status,
        })
      : response.feedback.nextStep;

  return response.feedback.offTopicPoints?.length
    ? {
        nextStep,
        offTopicPoints: response.feedback.offTopicPoints,
      }
    : { nextStep };
}

function getFeedbackTarget(rubricAssessment: RubricAssessmentItem[]) {
  const firstAbsentIndex = rubricAssessment.findIndex(
    (item) => item.status === "absent",
  );

  if (firstAbsentIndex >= 0) {
    return {
      index: firstAbsentIndex,
      pointText: rubricAssessment[firstAbsentIndex]!.pointText,
      status: "absent" as const,
    };
  }

  const firstPartialIndex = rubricAssessment.findIndex(
    (item) => item.status === "partial",
  );

  if (firstPartialIndex >= 0) {
    return {
      index: firstPartialIndex,
      pointText: rubricAssessment[firstPartialIndex]!.pointText,
      status: "partial" as const,
    };
  }

  return null;
}

function isLowSignalNextStep(nextStep: string) {
  const normalizedNextStep = normalizeNextStep(nextStep);

  return lowSignalNextStepPatterns.some((pattern) =>
    pattern.test(normalizedNextStep),
  );
}

function normalizeNextStep(nextStep: string) {
  return nextStep
    .trim()
    .toLowerCase()
    .replace(/[.!?]+$/g, "")
    .replace(/\s+/g, " ");
}
