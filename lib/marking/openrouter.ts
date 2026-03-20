import OpenAI from "openai";
import type {
  ApiFailure,
  MarkingPrompt,
  ModelOutput,
  PreparedMarkingInput,
} from "@/lib/marking/types";
import { createErrorResult } from "@/lib/marking/types";

type ModelClient = {
  modelName: string;
  openai: OpenAI;
};

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const MARKING_TEMPERATURE = 0;
const MODEL_TIMEOUT_MS = 90_000;
const MIN_MAX_COMPLETION_TOKENS = 360;
const BASE_MAX_COMPLETION_TOKENS = 140;
const PER_RUBRIC_POINT_MAX_COMPLETION_TOKENS = 42;
const MAX_COMPLETION_TOKENS_CAP = 640;
const RETRY_MAX_COMPLETION_TOKENS_CAP = 820;
const RETRY_EXTRA_COMPLETION_TOKENS = 180;
const MODEL_TOKEN_WARNING_THRESHOLD = 0.85;
const SHOULD_LOG_MODEL_LIMIT_WARNINGS = process.env.NODE_ENV === "development";

const SAFE_ERRORS = {
  markingMissingConfiguration:
    "AI review is missing its OpenRouter settings on this deployment.",
  markingInvalidCredentials:
    "OpenRouter rejected the API key for this deployment.",
  markingModelAccessDenied:
    "This deployment's OpenRouter key cannot use the selected model.",
  markingTimedOut: "AI review took too long. Please try again.",
  markingRateLimited:
    "AI review is busy right now. Please try again in a moment.",
  markingUnavailable:
    "AI review is temporarily unavailable. Please try again.",
  markingFailure: "Could not review this answer right now.",
};

export async function requestMarkingModelOutput(
  input: PreparedMarkingInput,
  prompt: MarkingPrompt,
): Promise<ModelOutput | ApiFailure> {
  const modelClient = createModelClientOrError(input);

  if ("status" in modelClient) {
    return modelClient;
  }

  try {
    const requestStartedAt = performance.now();
    const maxCompletionTokens = getMaxCompletionTokens(input);
    const completionResult = await requestCompletionWithRetry({
      modelClient,
      input,
      prompt,
      maxCompletionTokens,
    });
    const completion = completionResult.completion;
    const finalMaxCompletionTokens = completionResult.maxCompletionTokensUsed;
    const rawOutput = completion.choices[0]?.message?.content?.trim() ?? "";
    const completionTokensUsed = completion.usage?.completion_tokens ?? null;
    const finishReason = completion.choices[0]?.finish_reason ?? null;

    if (rawOutput.length === 0) {
      console.error("[api/mark-answer] OpenRouter returned empty content", {
        generatedQuestionId: input.generatedQuestionId,
        modelName: modelClient.modelName,
      });

      return createErrorResult(500, SAFE_ERRORS.markingFailure);
    }

    maybeWarnAboutModelTokenHeadroom({
      completionTokensUsed,
      finishReason,
      generatedQuestionId: input.generatedQuestionId,
      maxCompletionTokens: finalMaxCompletionTokens,
      modelName: modelClient.modelName,
    });

    return {
      modelName: modelClient.modelName,
      rawOutput,
      durationMs: roundTimingMs(performance.now() - requestStartedAt),
      maxCompletionTokens: finalMaxCompletionTokens,
      completionTokensUsed,
      finishReason,
    };
  } catch (caughtError) {
    const safeErrorMessage = getSafeModelRequestErrorMessage(caughtError);

    console.error("[api/mark-answer] OpenRouter request failed", {
      generatedQuestionId: input.generatedQuestionId,
      modelName: modelClient.modelName,
      safeErrorMessage,
      ...getModelErrorLogDetails(caughtError),
    });

    return createErrorResult(500, safeErrorMessage);
  }
}

async function requestCompletionWithRetry({
  modelClient,
  input,
  prompt,
  maxCompletionTokens,
}: {
  modelClient: ModelClient;
  input: PreparedMarkingInput;
  prompt: MarkingPrompt;
  maxCompletionTokens: number;
}) {
  const initialCompletion = await requestCompletion({
    modelClient,
    prompt,
    maxCompletionTokens,
  });
  const initialFinishReason = initialCompletion.choices[0]?.finish_reason ?? null;

  if (initialFinishReason !== "length") {
    return {
      completion: initialCompletion,
      maxCompletionTokensUsed: maxCompletionTokens,
    };
  }

  const retryMaxCompletionTokens = Math.min(
    RETRY_MAX_COMPLETION_TOKENS_CAP,
    maxCompletionTokens + RETRY_EXTRA_COMPLETION_TOKENS,
  );

  if (retryMaxCompletionTokens <= maxCompletionTokens) {
    return {
      completion: initialCompletion,
      maxCompletionTokensUsed: maxCompletionTokens,
    };
  }

  if (SHOULD_LOG_MODEL_LIMIT_WARNINGS) {
    console.warn(
      `[api/mark-answer] model-retry-length ${JSON.stringify({
        generatedQuestionId: input.generatedQuestionId,
        modelName: modelClient.modelName,
        initialMaxCompletionTokens: maxCompletionTokens,
        retryMaxCompletionTokens,
      })}`,
    );
  }

  const retryCompletion = await requestCompletion({
    modelClient,
    prompt,
    maxCompletionTokens: retryMaxCompletionTokens,
  });

  return {
    completion: retryCompletion,
    maxCompletionTokensUsed: retryMaxCompletionTokens,
  };
}

async function requestCompletion({
  modelClient,
  prompt,
  maxCompletionTokens,
}: {
  modelClient: ModelClient;
  prompt: MarkingPrompt;
  maxCompletionTokens: number;
}) {
  return modelClient.openai.chat.completions.create(
    {
      model: modelClient.modelName,
      temperature: MARKING_TEMPERATURE,
      max_tokens: maxCompletionTokens,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: prompt.systemPrompt,
        },
        {
          role: "user",
          content: prompt.userPrompt,
        },
      ],
    },
    {
      maxRetries: 0,
      timeout: MODEL_TIMEOUT_MS,
    },
  );
}

function getMaxCompletionTokens(input: PreparedMarkingInput) {
  return Math.min(
    MAX_COMPLETION_TOKENS_CAP,
    Math.max(
      MIN_MAX_COMPLETION_TOKENS,
      BASE_MAX_COMPLETION_TOKENS +
        input.rubricPoints.length * PER_RUBRIC_POINT_MAX_COMPLETION_TOKENS,
    ),
  );
}

function maybeWarnAboutModelTokenHeadroom({
  generatedQuestionId,
  modelName,
  maxCompletionTokens,
  completionTokensUsed,
  finishReason,
}: {
  generatedQuestionId: number;
  modelName: string;
  maxCompletionTokens: number;
  completionTokensUsed: number | null;
  finishReason: string | null;
}) {
  if (!SHOULD_LOG_MODEL_LIMIT_WARNINGS) {
    return;
  }

  const isNearTokenLimit =
    finishReason === "length" ||
    (completionTokensUsed !== null &&
      completionTokensUsed >=
        Math.ceil(maxCompletionTokens * MODEL_TOKEN_WARNING_THRESHOLD));

  if (!isNearTokenLimit) {
    return;
  }

  console.warn(
    `[api/mark-answer] model-token-headroom ${JSON.stringify({
      generatedQuestionId,
      modelName,
      modelMaxTokens: maxCompletionTokens,
      completionTokensUsed,
      finishReason,
      modelTokenHeadroom: "low",
    })}`,
  );
}

function createModelClientOrError(
  input: PreparedMarkingInput,
): ModelClient | ApiFailure {
  try {
    return createModelClient();
  } catch (caughtError) {
    const safeErrorMessage = getSafeModelClientErrorMessage();

    console.error("[api/mark-answer] OpenRouter configuration missing", {
      generatedQuestionId: input.generatedQuestionId,
      safeErrorMessage,
      ...getModelErrorLogDetails(caughtError),
    });

    return createErrorResult(500, safeErrorMessage);
  }
}

function createModelClient(): ModelClient {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  const modelName = process.env.OPENROUTER_MODEL?.trim();

  if (!apiKey || !modelName) {
    throw new Error("OPENROUTER_API_KEY and OPENROUTER_MODEL are required");
  }

  return {
    modelName,
    openai: new OpenAI({
      baseURL: OPENROUTER_BASE_URL,
      apiKey,
      maxRetries: 0,
      timeout: MODEL_TIMEOUT_MS,
    }),
  };
}

function getSafeModelClientErrorMessage() {
  return SAFE_ERRORS.markingMissingConfiguration;
}

function getSafeModelRequestErrorMessage(caughtError: unknown) {
  if (caughtError instanceof OpenAI.AuthenticationError) {
    return SAFE_ERRORS.markingInvalidCredentials;
  }

  if (caughtError instanceof OpenAI.PermissionDeniedError) {
    return SAFE_ERRORS.markingModelAccessDenied;
  }

  if (caughtError instanceof OpenAI.RateLimitError) {
    return SAFE_ERRORS.markingRateLimited;
  }

  if (caughtError instanceof OpenAI.APIConnectionTimeoutError) {
    return SAFE_ERRORS.markingTimedOut;
  }

  if (caughtError instanceof OpenAI.APIConnectionError) {
    return SAFE_ERRORS.markingUnavailable;
  }

  if (caughtError instanceof OpenAI.APIError) {
    if (caughtError.status === 408) {
      return SAFE_ERRORS.markingTimedOut;
    }

    if (caughtError.status === 429) {
      return SAFE_ERRORS.markingRateLimited;
    }

    if (caughtError.status === 401 || caughtError.status === 403) {
      return caughtError.status === 401
        ? SAFE_ERRORS.markingInvalidCredentials
        : SAFE_ERRORS.markingModelAccessDenied;
    }

    if (caughtError.status !== undefined && caughtError.status >= 500) {
      return SAFE_ERRORS.markingUnavailable;
    }
  }

  if (caughtError instanceof Error && /timed out/i.test(caughtError.message)) {
    return SAFE_ERRORS.markingTimedOut;
  }

  return SAFE_ERRORS.markingFailure;
}

function getModelErrorLogDetails(caughtError: unknown) {
  const apiError =
    caughtError instanceof OpenAI.APIError ? caughtError : undefined;

  return {
    errorName: caughtError instanceof Error ? caughtError.name : undefined,
    status: apiError?.status,
    code: apiError?.code,
    type: apiError?.type,
    requestId: apiError?.requestID,
    message:
      caughtError instanceof Error ? caughtError.message : String(caughtError),
  };
}

function roundTimingMs(value: number) {
  return Number(value.toFixed(1));
}
