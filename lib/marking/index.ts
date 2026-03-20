import type { MarkAnswerResponse } from "@/lib/mock-biology-practice-api";
import { buildPointsMarkingPrompt } from "@/lib/marking/prompts";
import { requestMarkingModelOutput } from "@/lib/marking/openrouter";
import { computePointsModeScore } from "@/lib/marking/scoring";
import {
  createErrorResult,
  isApiFailure,
  type MarkingApiResult,
  type MarkingDiagnostics,
  type PointsModeModelResponse,
  type PreparedMarkingInput,
} from "@/lib/marking/types";
import {
  parseModelOutput,
  validatePointsModeResponse,
} from "@/lib/marking/validation";

const SAFE_ERRORS = {
  markingFailure: "Could not review this answer right now.",
};
const SHOULD_LOG_MATCHING_WARNINGS = process.env.NODE_ENV === "development";

export async function markAnswer(
  input: PreparedMarkingInput,
): Promise<MarkingApiResult<MarkAnswerResponse>> {
  const promptBuildResult = measureSync(() => buildPointsMarkingPrompt(input));
  const prompt = promptBuildResult.result;
  const baseDiagnostics: MarkingDiagnostics = {
    modelName: null,
    modelMaxTokens: null,
    completionTokensUsed: null,
    finishReason: null,
    questionTextChars: input.questionText.length,
    answerTextChars: input.answerText.length,
    promptChars: prompt.systemPrompt.length + prompt.userPrompt.length,
    rubricPointCount: input.rubricPoints.length,
    promptBuildMs: promptBuildResult.ms,
    modelMs: null,
    parseMs: null,
    outputValidationMs: null,
    scoringMs: null,
    rawOutputChars: null,
  };
  const modelOutput = await requestMarkingModelOutput(input, prompt);

  if (isApiFailure(modelOutput)) {
    return {
      ...modelOutput,
      meta: baseDiagnostics,
    };
  }

  const diagnostics: MarkingDiagnostics = {
    ...baseDiagnostics,
    modelName: modelOutput.modelName,
    modelMaxTokens: modelOutput.maxCompletionTokens,
    completionTokensUsed: modelOutput.completionTokensUsed,
    finishReason: modelOutput.finishReason,
    modelMs: modelOutput.durationMs,
    rawOutputChars: modelOutput.rawOutput.length,
  };

  let parsedOutput: unknown;
  let parseMs: number | null = null;

  try {
    const parseResult = measureSync(() => parseModelOutput(modelOutput.rawOutput));
    parsedOutput = parseResult.result;
    parseMs = parseResult.ms;
  } catch (caughtError) {
    console.error("[api/mark-answer] Invalid model JSON", {
      generatedQuestionId: input.generatedQuestionId,
      modelName: modelOutput.modelName,
      rawModelOutput: modelOutput.rawOutput,
      message:
        caughtError instanceof Error ? caughtError.message : String(caughtError),
    });

    return {
      ...createErrorResult(500, SAFE_ERRORS.markingFailure),
      meta: {
        ...diagnostics,
        parseMs,
      },
    };
  }

  try {
    const result = validateAndScorePointsModeResponse(parsedOutput, input);

    return {
      ...result.result,
      meta: {
        ...diagnostics,
        parseMs,
        outputValidationMs: result.outputValidationMs,
        scoringMs: result.scoringMs,
      },
    };
  } catch (caughtError) {
    console.error("[api/mark-answer] Invalid model marking payload", {
      generatedQuestionId: input.generatedQuestionId,
      modelName: modelOutput.modelName,
      rawModelOutput: modelOutput.rawOutput,
      message:
        caughtError instanceof Error ? caughtError.message : String(caughtError),
    });

    return {
      ...createErrorResult(500, SAFE_ERRORS.markingFailure),
      meta: {
        ...diagnostics,
        parseMs,
      },
    };
  }
}

function validateAndScorePointsModeResponse(
  parsedOutput: unknown,
  input: PreparedMarkingInput,
): {
  result: MarkingApiResult<MarkAnswerResponse>;
  outputValidationMs: number;
  scoringMs: number;
} {
  const validationResult = measureSync(() =>
    validatePointsModeResponse(parsedOutput, input),
  );
  maybeWarnAboutDuplicateEvidence(validationResult.result, input);
  const scoringResult = measureSync(() =>
    scorePointsModeResponse(validationResult.result, input),
  );

  return {
    result: scoringResult.result,
    outputValidationMs: validationResult.ms,
    scoringMs: scoringResult.ms,
  };
}

function scorePointsModeResponse(
  validatedResponse: PointsModeModelResponse,
  input: PreparedMarkingInput,
): MarkingApiResult<MarkAnswerResponse> {
  const score = computePointsModeScore(
    validatedResponse.rubricAssessment,
    input.marks,
  );

  return {
    status: 200,
    body: {
      score,
      maxScore: input.marks,
      rubricAssessment: validatedResponse.rubricAssessment,
      feedback: validatedResponse.feedback,
    },
  };
}

export type { PreparedMarkingInput } from "@/lib/marking/types";

function maybeWarnAboutDuplicateEvidence(
  validatedResponse: PointsModeModelResponse,
  input: PreparedMarkingInput,
) {
  if (!SHOULD_LOG_MATCHING_WARNINGS) {
    return;
  }

  const evidenceToMatches = new Map<
    string,
    Array<{ pointIndex: number; pointText: string; status: string }>
  >();

  validatedResponse.rubricAssessment.forEach((item, index) => {
    if (item.status === "absent") {
      return;
    }

    const normalizedEvidence = item.evidence.trim();

    if (normalizedEvidence.length === 0) {
      return;
    }

    const existingMatches = evidenceToMatches.get(normalizedEvidence) ?? [];
    existingMatches.push({
      pointIndex: index + 1,
      pointText: item.pointText,
      status: item.status,
    });
    evidenceToMatches.set(normalizedEvidence, existingMatches);
  });

  const duplicatedEvidence = Array.from(evidenceToMatches.entries())
    .filter(([, matches]) => matches.length > 1)
    .map(([evidence, matches]) => ({
      evidence,
      matches,
    }));

  if (duplicatedEvidence.length === 0) {
    return;
  }

  console.warn(
    `[api/mark-answer] duplicate-evidence-warning ${JSON.stringify({
      generatedQuestionId: input.generatedQuestionId,
      duplicates: duplicatedEvidence,
    })}`,
  );
}

function measureSync<T>(action: () => T) {
  const startedAt = performance.now();
  const result = action();

  return {
    result,
    ms: roundTimingMs(performance.now() - startedAt),
  };
}

function roundTimingMs(value: number) {
  return Number(value.toFixed(1));
}
