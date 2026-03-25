import type { MarkAnswerResponse } from "@/lib/mock-biology-practice-api";
import {
  sanitizePointsModeResponse,
} from "@/lib/marking/evidence";
import { finalizePointsModeResponse } from "@/lib/marking/feedback";
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
const SHOULD_LOG_MARKING_FLOW = process.env.NODE_ENV === "development";
const SHOULD_LOG_MATCHING_WARNINGS = process.env.NODE_ENV === "development";

export async function markAnswer(
  input: PreparedMarkingInput,
): Promise<MarkingApiResult<MarkAnswerResponse>> {
  const baseDiagnostics = createBaseDiagnostics(input);
  const promptBuildResult = measureSync(() => buildPointsMarkingPrompt(input));
  const prompt = promptBuildResult.result;
  const promptDiagnostics: MarkingDiagnostics = {
    modelName: null,
    modelMaxTokens: null,
    completionTokensUsed: null,
    finishReason: null,
    questionTextChars: baseDiagnostics.questionTextChars,
    answerTextChars: baseDiagnostics.answerTextChars,
    promptChars: prompt.systemPrompt.length + prompt.userPrompt.length,
    rubricPointCount: baseDiagnostics.rubricPointCount,
    promptBuildMs: promptBuildResult.ms,
    modelMs: null,
    parseMs: null,
    outputValidationMs: null,
    scoringMs: null,
    rawOutputChars: null,
  };
  logMarkingFlowEvent("model_call_start", {
    generatedQuestionId: input.generatedQuestionId,
    answerChars: input.answerText.length,
    marks: input.marks,
    questionType: input.questionType,
    rubricPoints: input.rubricPoints.length,
  });
  const modelOutput = await requestMarkingModelOutput(input, prompt);

  if (isApiFailure(modelOutput)) {
    logMarkingFlowEvent("model_call_failed", {
      generatedQuestionId: input.generatedQuestionId,
      status: modelOutput.status,
      error:
        typeof modelOutput.body === "object" &&
        modelOutput.body !== null &&
        "error" in modelOutput.body &&
        typeof modelOutput.body.error === "string"
          ? modelOutput.body.error
          : "Unknown model error",
    });
    return {
      ...modelOutput,
      meta: promptDiagnostics,
    };
  }

  const diagnostics: MarkingDiagnostics = {
    ...promptDiagnostics,
    modelName: modelOutput.modelName,
    modelMaxTokens: modelOutput.maxCompletionTokens,
    completionTokensUsed: modelOutput.completionTokensUsed,
    finishReason: modelOutput.finishReason,
    modelMs: modelOutput.durationMs,
    rawOutputChars: modelOutput.rawOutput.length,
  };
  logMarkingFlowEvent("model_call_complete", {
    generatedQuestionId: input.generatedQuestionId,
    modelName: modelOutput.modelName,
    completionTokensUsed: modelOutput.completionTokensUsed,
    finishReason: modelOutput.finishReason,
    modelMs: modelOutput.durationMs,
  });

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
  const sanitizationResult = measureSync(() =>
    sanitizePointsModeResponse(validationResult.result, input),
  );
  const finalizedResponse = finalizePointsModeResponse(
    sanitizationResult.result,
    input,
  );
  maybeWarnAboutDuplicateEvidence(finalizedResponse, input);
  const scoringResult = measureSync(() =>
    scorePointsModeResponse(finalizedResponse, input),
  );

  return {
    result: scoringResult.result,
    outputValidationMs: roundTimingMs(
      validationResult.ms + sanitizationResult.ms,
    ),
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
      reviewSource: "ai_review",
      score,
      maxScore: input.marks,
      rubricAssessment: validatedResponse.rubricAssessment,
      feedback: validatedResponse.feedback,
    },
  };
}

export type { PreparedMarkingInput } from "@/lib/marking/types";

function createBaseDiagnostics(input: PreparedMarkingInput): MarkingDiagnostics {
  return {
    modelName: null,
    modelMaxTokens: null,
    completionTokensUsed: null,
    finishReason: null,
    questionTextChars: input.questionText.length,
    answerTextChars: input.answerText.length,
    promptChars: 0,
    rubricPointCount: input.rubricPoints.length,
    promptBuildMs: null,
    modelMs: null,
    parseMs: null,
    outputValidationMs: null,
    scoringMs: null,
    rawOutputChars: null,
  };
}

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

function logMarkingFlowEvent(
  event: string,
  details: Record<string, unknown>,
) {
  if (!SHOULD_LOG_MARKING_FLOW) {
    return;
  }

  console.info(`[api/mark-answer] ${event} ${JSON.stringify(details)}`);
}
