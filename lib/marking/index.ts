import type { MarkAnswerResponse } from "@/lib/mock-biology-practice-api";
import {
  buildLevelsMarkingPrompt,
  buildPointsMarkingPrompt,
} from "@/lib/marking/prompts";
import { requestMarkingModelOutput } from "@/lib/marking/openrouter";
import {
  computePointsModeScore,
  validateLevelsModeLevel,
  validateLevelsModeMark,
} from "@/lib/marking/scoring";
import {
  createErrorResult,
  isApiFailure,
  type MarkingApiResult,
  type PreparedMarkingInput,
} from "@/lib/marking/types";
import {
  parseModelOutput,
  validateLevelsModeResponse,
  validatePointsModeResponse,
} from "@/lib/marking/validation";

const SAFE_ERRORS = {
  markingFailure: "Could not review this answer right now.",
};

export async function markAnswer(
  input: PreparedMarkingInput,
): Promise<MarkingApiResult<MarkAnswerResponse>> {
  const prompt =
    input.markingStyle === "levels"
      ? buildLevelsMarkingPrompt(input)
      : buildPointsMarkingPrompt(input);
  const modelOutput = await requestMarkingModelOutput(input, prompt);

  if (isApiFailure(modelOutput)) {
    return modelOutput;
  }

  let parsedOutput: unknown;

  try {
    parsedOutput = parseModelOutput(modelOutput.rawOutput);
  } catch (caughtError) {
    console.error("[api/mark-answer] Invalid model JSON", {
      generatedQuestionId: input.generatedQuestionId,
      markingStyle: input.markingStyle,
      modelName: modelOutput.modelName,
      rawModelOutput: modelOutput.rawOutput,
      message:
        caughtError instanceof Error ? caughtError.message : String(caughtError),
    });

    return createErrorResult(500, SAFE_ERRORS.markingFailure);
  }

  try {
    return input.markingStyle === "levels"
      ? scoreLevelsModeResponse(parsedOutput, input)
      : scorePointsModeResponse(parsedOutput, input);
  } catch (caughtError) {
    console.error("[api/mark-answer] Invalid model marking payload", {
      generatedQuestionId: input.generatedQuestionId,
      markingStyle: input.markingStyle,
      modelName: modelOutput.modelName,
      rawModelOutput: modelOutput.rawOutput,
      message:
        caughtError instanceof Error ? caughtError.message : String(caughtError),
    });

    return createErrorResult(500, SAFE_ERRORS.markingFailure);
  }
}

function scorePointsModeResponse(
  parsedOutput: unknown,
  input: PreparedMarkingInput,
): MarkingApiResult<MarkAnswerResponse> {
  const validatedResponse = validatePointsModeResponse(parsedOutput, input);
  const score = computePointsModeScore(
    validatedResponse.rubricAssessment,
    input.marks,
  );

  return {
    status: 200,
    body: {
      score,
      maxScore: input.marks,
      level: null,
      levelReasoning: null,
      rubricAssessment: validatedResponse.rubricAssessment,
      feedback: validatedResponse.feedback,
    },
  };
}

function scoreLevelsModeResponse(
  parsedOutput: unknown,
  input: PreparedMarkingInput,
): MarkingApiResult<MarkAnswerResponse> {
  const validatedResponse = validateLevelsModeResponse(parsedOutput, input);
  const levelDescriptor = validateLevelsModeLevel(
    input.levelDescriptors,
    validatedResponse.recommendedLevel,
  );
  const score = validateLevelsModeMark(
    levelDescriptor,
    validatedResponse.recommendedMark,
    input.marks,
  );

  return {
    status: 200,
    body: {
      score,
      maxScore: input.marks,
      level: levelDescriptor.levelNumber,
      levelReasoning: validatedResponse.levelReasoning,
      rubricAssessment: validatedResponse.rubricAssessment,
      feedback: validatedResponse.feedback,
    },
  };
}

export type { PreparedMarkingInput } from "@/lib/marking/types";
