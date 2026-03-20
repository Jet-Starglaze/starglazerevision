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
const MARKING_TEMPERATURE = 0.1;
const MODEL_TIMEOUT_MS = 90_000;
const MODEL_MAX_COMPLETION_TOKENS = 1_600;

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
    const completion = await modelClient.openai.chat.completions.create(
      {
        model: modelClient.modelName,
        temperature: MARKING_TEMPERATURE,
        max_tokens: MODEL_MAX_COMPLETION_TOKENS,
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

    const rawOutput = completion.choices[0]?.message?.content?.trim() ?? "";

    if (rawOutput.length === 0) {
      console.error("[api/mark-answer] OpenRouter returned empty content", {
        generatedQuestionId: input.generatedQuestionId,
        markingStyle: input.markingStyle,
        modelName: modelClient.modelName,
      });

      return createErrorResult(500, SAFE_ERRORS.markingFailure);
    }

    return {
      modelName: modelClient.modelName,
      rawOutput,
    };
  } catch (caughtError) {
    const safeErrorMessage = getSafeModelRequestErrorMessage(caughtError);

    console.error("[api/mark-answer] OpenRouter request failed", {
      generatedQuestionId: input.generatedQuestionId,
      markingStyle: input.markingStyle,
      modelName: modelClient.modelName,
      safeErrorMessage,
      ...getModelErrorLogDetails(caughtError),
    });

    return createErrorResult(500, safeErrorMessage);
  }
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
      markingStyle: input.markingStyle,
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
