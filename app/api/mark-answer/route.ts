import { NextResponse } from "next/server";
import type {
  ApiErrorResponse,
} from "@/lib/mock-biology-practice-api";
import {
  fetchGeneratedRubricPoints,
  fetchGeneratedQuestionById,
  normalizeNumericId,
} from "@/lib/generated-practice-content";
import { markAnswer, type PreparedMarkingInput } from "@/lib/marking";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 90;
const SHOULD_LOG_MARKING_TIMINGS = process.env.NODE_ENV === "development";

type MarkAnswerRouteResult<T> = {
  status: number;
  body: T | ApiErrorResponse;
};

type ApiFailure = MarkAnswerRouteResult<never>;

type ValidMarkingRequest = {
  generatedQuestionId: number;
  answerText: string;
  attemptNumber: number | null;
};

type LoadPreparedMarkingInputSuccess = {
  input: PreparedMarkingInput;
  meta: {
    dbQuestionMs: number;
    dbRubricMs: number;
    dbTotalMs: number;
  };
};

const SAFE_ERRORS = {
  questionNotFound: "Generated question not found.",
  markingCriteria: "Could not load marking criteria right now.",
};

export async function POST(request: Request) {
  const requestStartedAt = performance.now();
  let responseStatus = 500;
  let generatedQuestionId: number | null = null;
  let modelName: string | null = null;
  let modelMaxTokens: number | null = null;
  let completionTokensUsed: number | null = null;
  let finishReason: string | null = null;
  let rubricPointsCount: number | null = null;
  let questionTextChars: number | null = null;
  let answerTextChars: number | null = null;
  let requestBodyMs: number | null = null;
  let inputValidationMs: number | null = null;
  let dbQuestionMs: number | null = null;
  let dbRubricMs: number | null = null;
  let dbTotalMs: number | null = null;
  let promptBuildMs: number | null = null;
  let modelMs: number | null = null;
  let parseMs: number | null = null;
  let outputValidationMs: number | null = null;
  let scoringMs: number | null = null;
  let responseSerializationMs: number | null = null;
  let promptChars: number | null = null;
  let rawOutputChars: number | null = null;

  try {
    const requestBodyResult = await measureAsync(() =>
      request.json().catch(() => null),
    );
    requestBodyMs = requestBodyResult.ms;
    const payload = requestBodyResult.result;

    if (payload === null) {
      responseStatus = 400;
      const responseResult = createTimedJsonResponse(
        { error: "Invalid request body" },
        { status: 400 },
      );
      responseSerializationMs = responseResult.ms;
      return responseResult.result;
    }

    const validationResult = measureSync(() => validateMarkingRequest(payload));
    inputValidationMs = validationResult.ms;
    const validRequest = validationResult.result;

    if (isApiFailure(validRequest)) {
      responseStatus = validRequest.status;
      const responseResult = createTimedJsonResponse(validRequest.body, {
        status: validRequest.status,
      });
      responseSerializationMs = responseResult.ms;
      return responseResult.result;
    }

    generatedQuestionId = validRequest.generatedQuestionId;
    const markingInputResult = await loadPreparedMarkingInputOrError(validRequest);

    if (isApiFailure(markingInputResult)) {
      responseStatus = markingInputResult.status;
      const responseResult = createTimedJsonResponse(markingInputResult.body, {
        status: markingInputResult.status,
      });
      responseSerializationMs = responseResult.ms;
      return responseResult.result;
    }

    const { input: markingInput, meta: loadMeta } = markingInputResult;
    rubricPointsCount = markingInput.rubricPoints.length;
    questionTextChars = markingInput.questionText.length;
    answerTextChars = markingInput.answerText.length;
    dbQuestionMs = loadMeta.dbQuestionMs;
    dbRubricMs = loadMeta.dbRubricMs;
    dbTotalMs = loadMeta.dbTotalMs;
    maybeWarnAboutRubricSize(markingInput);

    const result = await markAnswer(markingInput);
    responseStatus = result.status;
    modelName = result.meta?.modelName ?? null;
    modelMaxTokens = result.meta?.modelMaxTokens ?? null;
    completionTokensUsed = result.meta?.completionTokensUsed ?? null;
    finishReason = result.meta?.finishReason ?? null;
    promptBuildMs = result.meta?.promptBuildMs ?? null;
    modelMs = result.meta?.modelMs ?? null;
    parseMs = result.meta?.parseMs ?? null;
    outputValidationMs = result.meta?.outputValidationMs ?? null;
    scoringMs = result.meta?.scoringMs ?? null;
    promptChars = result.meta?.promptChars ?? null;
    rawOutputChars = result.meta?.rawOutputChars ?? null;

    const responseResult = createTimedJsonResponse(result.body, {
      status: result.status,
    });
    responseSerializationMs = responseResult.ms;

    return responseResult.result;
  } finally {
    logTimingSummary({
      generatedQuestionId,
      modelName,
      modelMaxTokens,
      completionTokensUsed,
      finishReason,
      responseStatus,
      requestBodyMs,
      inputValidationMs,
      dbQuestionMs,
      dbRubricMs,
      dbTotalMs,
      promptBuildMs,
      modelMs,
      parseMs,
      outputValidationMs,
      scoringMs,
      responseSerializationMs,
      rubricPointsCount,
      questionTextChars,
      answerTextChars,
      promptChars,
      rawOutputChars,
      totalMs: roundTimingMs(performance.now() - requestStartedAt),
    });
  }
}

function validateMarkingRequest(
  payload: unknown,
): ValidMarkingRequest | ApiFailure {
  if (!isRecord(payload)) {
    return createErrorResult(400, "Invalid request body");
  }

  const generatedQuestionId = normalizeNumericId(payload.generatedQuestionId);

  if (generatedQuestionId === null) {
    return createErrorResult(400, "generatedQuestionId is required");
  }

  const answerText =
    typeof payload.answerText === "string" ? payload.answerText.trim() : "";

  if (answerText.length === 0) {
    return createErrorResult(400, "answerText is required");
  }

  if (
    payload.attemptNumber !== undefined &&
    payload.attemptNumber !== null &&
    (!isInteger(payload.attemptNumber) || payload.attemptNumber < 1)
  ) {
    return createErrorResult(
      400,
      "attemptNumber must be a positive integer or null",
    );
  }

  return {
    generatedQuestionId,
    answerText,
    attemptNumber: payload.attemptNumber ?? null,
  };
}

async function loadPreparedMarkingInputOrError(
  request: ValidMarkingRequest,
): Promise<LoadPreparedMarkingInputSuccess | ApiFailure> {
  const supabase = await createClient();
  const dbStartedAt = performance.now();

  try {
    const questionResult = await measureAsync(() =>
      fetchGeneratedQuestionById(supabase, request.generatedQuestionId),
    );
    const questionRow = questionResult.result;

    if (!questionRow) {
      return createErrorResult(404, SAFE_ERRORS.questionNotFound);
    }

    if (questionRow.status !== "approved") {
      console.warn("[api/mark-answer] Generated question not approved", {
        generatedQuestionId: request.generatedQuestionId,
        status: questionRow.status,
      });

      return createErrorResult(404, SAFE_ERRORS.questionNotFound);
    }

    const rubricResult = await measureAsync(() =>
      fetchGeneratedRubricPoints(supabase, questionRow.id),
    );
    const rubricPoints = rubricResult.result;

    if (rubricPoints.length === 0) {
      console.error("[api/mark-answer] Missing generated marking criteria", {
        generatedQuestionId: request.generatedQuestionId,
        message: "No generated rubric points found",
      });

      return createErrorResult(500, SAFE_ERRORS.markingCriteria);
    }

    return {
      input: {
        generatedQuestionId: request.generatedQuestionId,
        answerText: request.answerText,
        questionText: questionRow.question_text,
        marks: questionRow.marks,
        questionType: questionRow.question_type?.trim() || "unknown",
        rubricPoints,
      },
      meta: {
        dbQuestionMs: questionResult.ms,
        dbRubricMs: rubricResult.ms,
        dbTotalMs: roundTimingMs(performance.now() - dbStartedAt),
      },
    };
  } catch (caughtError) {
    console.error("[api/mark-answer] Failed to load generated question", {
      generatedQuestionId: request.generatedQuestionId,
      message:
        caughtError instanceof Error ? caughtError.message : String(caughtError),
    });

    return createErrorResult(500, SAFE_ERRORS.markingCriteria);
  }
}

function createErrorResult(status: number, error: string): ApiFailure {
  return {
    status,
    body: { error },
  };
}

function isApiFailure(value: unknown): value is ApiFailure {
  return typeof value === "object" && value !== null && "status" in value && "body" in value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value);
}

function maybeWarnAboutRubricSize(input: PreparedMarkingInput) {
  if (
    !SHOULD_LOG_MARKING_TIMINGS ||
    input.rubricPoints.length <= input.marks + 2
  ) {
    return;
  }

  console.warn(
    `[api/mark-answer] rubric-size-audit ${JSON.stringify({
      generatedQuestionId: input.generatedQuestionId,
      marks: input.marks,
      rubricPoints: input.rubricPoints.length,
    })}`,
  );
}

function logTimingSummary({
  generatedQuestionId,
  modelName,
  modelMaxTokens,
  completionTokensUsed,
  finishReason,
  responseStatus,
  requestBodyMs,
  inputValidationMs,
  dbQuestionMs,
  dbRubricMs,
  dbTotalMs,
  promptBuildMs,
  modelMs,
  parseMs,
  outputValidationMs,
  scoringMs,
  responseSerializationMs,
  rubricPointsCount,
  questionTextChars,
  answerTextChars,
  promptChars,
  rawOutputChars,
  totalMs,
}: {
  generatedQuestionId: number | null;
  modelName: string | null;
  modelMaxTokens: number | null;
  completionTokensUsed: number | null;
  finishReason: string | null;
  responseStatus: number;
  requestBodyMs: number | null;
  inputValidationMs: number | null;
  dbQuestionMs: number | null;
  dbRubricMs: number | null;
  dbTotalMs: number | null;
  promptBuildMs: number | null;
  modelMs: number | null;
  parseMs: number | null;
  outputValidationMs: number | null;
  scoringMs: number | null;
  responseSerializationMs: number | null;
  rubricPointsCount: number | null;
  questionTextChars: number | null;
  answerTextChars: number | null;
  promptChars: number | null;
  rawOutputChars: number | null;
  totalMs: number;
}) {
  if (!SHOULD_LOG_MARKING_TIMINGS) {
    return;
  }

  const modelTokenHeadroom =
    finishReason === "length" ||
    (modelMaxTokens !== null &&
      completionTokensUsed !== null &&
      completionTokensUsed >= Math.ceil(modelMaxTokens * 0.85))
      ? "low"
      : null;

  console.info(
    `[api/mark-answer] timing ${JSON.stringify({
      generatedQuestionId,
      modelName,
      modelMaxTokens,
      completionTokensUsed,
      finishReason,
      modelTokenHeadroom,
      status: responseStatus,
      requestBodyMs,
      inputValidationMs,
      dbQuestionMs,
      dbRubricMs,
      dbTotalMs,
      promptBuildMs,
      modelMs,
      parseMs,
      outputValidationMs,
      scoringMs,
      responseSerializationMs,
      totalMs,
      rubricPoints: rubricPointsCount,
      questionTextChars,
      answerTextChars,
      promptChars,
      modelOutputChars: rawOutputChars,
    })}`,
  );
}

async function measureAsync<T>(action: () => Promise<T>) {
  const startedAt = performance.now();
  const result = await action();

  return {
    result,
    ms: roundTimingMs(performance.now() - startedAt),
  };
}

function measureSync<T>(action: () => T) {
  const startedAt = performance.now();
  const result = action();

  return {
    result,
    ms: roundTimingMs(performance.now() - startedAt),
  };
}

function createTimedJsonResponse<T>(body: T, init: { status: number }) {
  return measureSync(() => NextResponse.json(body, init));
}

function roundTimingMs(value: number) {
  return Number(value.toFixed(1));
}
