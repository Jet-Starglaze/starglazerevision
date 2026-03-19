import OpenAI from "openai";
import type {
  ApiErrorResponse,
  MarkAnswerResponse,
  PracticeLevelDescriptor,
  PracticeRubricAssessment,
  PracticeRubricAssessmentStatus,
  PracticeRubricPoint,
  PracticeStructuredFeedback,
} from "@/lib/mock-biology-practice-api";
import {
  fetchGeneratedLevelDescriptors,
  fetchGeneratedQuestionById,
  fetchGeneratedRubricPoints,
  mapDatabaseMarkingStyle,
  normalizeNumericId,
} from "@/lib/generated-practice-content";
import { createClient } from "@/utils/supabase/server";

type PracticeMarkingApiResult<T> = {
  status: number;
  body: T | ApiErrorResponse;
};

type ApiFailure = PracticeMarkingApiResult<never>;

type ValidMarkingRequest = {
  generatedQuestionId: number;
  answerText: string;
  attemptNumber: number | null;
};

type LoadedGeneratedQuestion = {
  id: number;
  questionText: string;
  marks: number;
  questionType: string;
  markingStyle: "points" | "levels";
  answerFocus: string;
  rubricPoints: PracticeRubricPoint[];
  levelDescriptors: PracticeLevelDescriptor[];
};

type ModelClient = {
  modelName: string;
  openai: OpenAI;
};

type ModelOutput = {
  modelName: string;
  rawOutput: string;
};

type MarkingMessage = {
  role: "system" | "user";
  content: string;
};

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const MARKING_TEMPERATURE = 0.1;
const MODEL_TIMEOUT_MS = 45_000;
const MODEL_MAX_COMPLETION_TOKENS = 1_600;

const SYSTEM_PROMPT = [
  "You are a strict A-level biology examiner.",
  "Evaluate each rubric point separately.",
  "Do not invent evidence.",
  "Only mark a point as present if the answer clearly states it.",
  "Return only valid JSON.",
].join(" ");

const SAFE_ERRORS = {
  questionNotFound: "Generated question not found.",
  markingCriteria: "Could not load marking criteria right now.",
  markingConfiguration:
    "AI review is not configured for this deployment yet.",
  markingTimedOut: "AI review took too long. Please try again.",
  markingRateLimited:
    "AI review is busy right now. Please try again in a moment.",
  markingUnavailable:
    "AI review is temporarily unavailable. Please try again.",
  markingFailure: "Could not review this answer right now.",
};

export async function markPracticeAnswer(
  payload: unknown,
): Promise<PracticeMarkingApiResult<MarkAnswerResponse>> {
  const request = validateMarkingRequest(payload);

  if (isApiFailure(request)) {
    return request;
  }

  const supabase = await createClient();
  const question = await loadGeneratedQuestionOrError(
    supabase,
    request.generatedQuestionId,
  );

  if (isApiFailure(question)) {
    return question;
  }

  const modelClient = createModelClientOrError(request.generatedQuestionId, question);

  if (isApiFailure(modelClient)) {
    return modelClient;
  }

  const modelOutput = await requestModelOutputOrError({
    answerText: request.answerText,
    generatedQuestionId: request.generatedQuestionId,
    modelClient,
    question,
  });

  if (isApiFailure(modelOutput)) {
    return modelOutput;
  }

  const parsedOutput = parseModelOutputOrError({
    generatedQuestionId: request.generatedQuestionId,
    markingStyle: question.markingStyle,
    modelName: modelOutput.modelName,
    rawOutput: modelOutput.rawOutput,
  });

  if (isApiFailure(parsedOutput)) {
    return parsedOutput;
  }

  const normalizedResponse = normalizeMarkingResponseOrError({
    generatedQuestionId: request.generatedQuestionId,
    modelName: modelOutput.modelName,
    parsedOutput,
    question,
    rawOutput: modelOutput.rawOutput,
  });

  if (isApiFailure(normalizedResponse)) {
    return normalizedResponse;
  }

  return {
    status: 200,
    body: normalizedResponse,
  };
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

async function loadGeneratedQuestionOrError(
  supabase: Awaited<ReturnType<typeof createClient>>,
  generatedQuestionId: number,
): Promise<LoadedGeneratedQuestion | ApiFailure> {
  try {
    return await loadGeneratedQuestionForMarking(supabase, generatedQuestionId);
  } catch (caughtError) {
    if (caughtError instanceof GeneratedQuestionNotFoundError) {
      return createErrorResult(404, SAFE_ERRORS.questionNotFound);
    }

    if (caughtError instanceof MissingMarkingCriteriaError) {
      console.error("[api/mark-answer] Missing generated marking criteria", {
        generatedQuestionId,
        message: caughtError.message,
      });

      return createErrorResult(500, SAFE_ERRORS.markingCriteria);
    }

    console.error("[api/mark-answer] Failed to load generated question", {
      generatedQuestionId,
      message:
        caughtError instanceof Error ? caughtError.message : String(caughtError),
    });

    return createErrorResult(500, SAFE_ERRORS.markingCriteria);
  }
}

async function loadGeneratedQuestionForMarking(
  supabase: Awaited<ReturnType<typeof createClient>>,
  generatedQuestionId: number,
): Promise<LoadedGeneratedQuestion> {
  const questionRow = await fetchGeneratedQuestionById(supabase, generatedQuestionId);

  if (!questionRow || questionRow.status !== "approved") {
    throw new GeneratedQuestionNotFoundError("Generated question unavailable");
  }

  const markingStyle = mapDatabaseMarkingStyle(
    questionRow.marking_style,
    questionRow.id,
  );

  if (!markingStyle) {
    throw new MissingMarkingCriteriaError("Unsupported marking style");
  }

  const rubricPoints = await fetchGeneratedRubricPoints(supabase, questionRow.id);

  if (rubricPoints.length === 0) {
    throw new MissingMarkingCriteriaError("No generated rubric points found");
  }

  const levelDescriptors =
    markingStyle === "levels"
      ? await fetchGeneratedLevelDescriptors(supabase, questionRow.id)
      : [];

  if (markingStyle === "levels" && levelDescriptors.length === 0) {
    throw new MissingMarkingCriteriaError(
      "No generated level descriptors found for a level-based question",
    );
  }

  return {
    id: generatedQuestionId,
    questionText: questionRow.question_text,
    marks: questionRow.marks,
    questionType: questionRow.question_type?.trim() || "unknown",
    markingStyle,
    answerFocus: questionRow.answer_focus?.trim() || "None provided",
    rubricPoints,
    levelDescriptors,
  };
}

function createModelClientOrError(
  generatedQuestionId: number,
  question: LoadedGeneratedQuestion,
): ModelClient | ApiFailure {
  try {
    return createModelClient();
  } catch (caughtError) {
    const safeErrorMessage = getSafeModelClientErrorMessage(caughtError);

    console.error("[api/mark-answer] OpenRouter configuration missing", {
      generatedQuestionId,
      markingStyle: question.markingStyle,
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
    throw new ModelConfigurationError(
      "OPENROUTER_API_KEY and OPENROUTER_MODEL are required",
    );
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

async function requestModelOutputOrError({
  answerText,
  generatedQuestionId,
  modelClient,
  question,
}: {
  answerText: string;
  generatedQuestionId: number;
  modelClient: ModelClient;
  question: LoadedGeneratedQuestion;
}): Promise<ModelOutput | ApiFailure> {
  const messages = buildMarkingMessages(question, answerText);

  try {
    const completion = await modelClient.openai.chat.completions.create(
      {
        model: modelClient.modelName,
        temperature: MARKING_TEMPERATURE,
        max_tokens: MODEL_MAX_COMPLETION_TOKENS,
        response_format: { type: "json_object" },
        messages,
      },
      {
        maxRetries: 0,
        timeout: MODEL_TIMEOUT_MS,
      },
    );

    const rawOutput = completion.choices[0]?.message?.content?.trim() ?? "";

    if (rawOutput.length === 0) {
      console.error("[api/mark-answer] OpenRouter returned empty content", {
        generatedQuestionId,
        markingStyle: question.markingStyle,
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
      generatedQuestionId,
      markingStyle: question.markingStyle,
      modelName: modelClient.modelName,
      safeErrorMessage,
      ...getModelErrorLogDetails(caughtError),
    });

    return createErrorResult(500, safeErrorMessage);
  }
}

function buildMarkingMessages(
  question: LoadedGeneratedQuestion,
  answerText: string,
): MarkingMessage[] {
  return [
    {
      role: "system",
      content: SYSTEM_PROMPT,
    },
    {
      role: "user",
      content: buildUserPrompt(question, answerText),
    },
  ];
}

function buildUserPrompt(
  question: LoadedGeneratedQuestion,
  answerText: string,
) {
  return [
    "Question",
    question.questionText,
    "",
    "Marks",
    String(question.marks),
    "",
    "Command word / question type",
    question.questionType,
    "",
    "Marking style",
    question.markingStyle,
    "",
    "Answer focus",
    question.answerFocus,
    "",
    "Rubric points",
    formatRubricPoints(question.rubricPoints),
    "",
    "Level descriptors",
    formatLevelDescriptors(question.levelDescriptors),
    "",
    "Student answer",
    answerText,
    "",
    "Instructions",
    [
      "1. Evaluate each rubric point separately in the listed order.",
      "2. Classify every point as present, partial, or absent.",
      "3. Evidence must be a direct quote or tight grounded paraphrase from the student answer.",
      "4. If a point is absent, evidence must be an empty string.",
      "5. Only mark a point present if the answer clearly states the biological idea.",
      "6. Do not invent evidence or generic praise.",
      "7. If the answer is very weak, say so clearly in the reasons and nextStep.",
      "8. Level is optional metadata only. Use null unless marking style is levels and a descriptor clearly fits.",
      "9. Return only valid JSON matching the schema exactly.",
    ].join("\n"),
    "",
    "Required JSON shape",
    JSON.stringify(createModelOutputExample(), null, 2),
  ].join("\n");
}

function formatRubricPoints(rubricPoints: PracticeRubricPoint[]) {
  return rubricPoints
    .map((point, index) => `${index + 1}. ${point.pointText}`)
    .join("\n");
}

function formatLevelDescriptors(levelDescriptors: PracticeLevelDescriptor[]) {
  if (levelDescriptors.length === 0) {
    return "None";
  }

  return levelDescriptors
    .map((descriptor) => {
      const communicationRequirement =
        descriptor.communicationRequirement ?? "None";

      return [
        `Level ${descriptor.levelNumber} (${descriptor.minMark}-${descriptor.maxMark})`,
        `Descriptor: ${descriptor.descriptorText}`,
        `Communication: ${communicationRequirement}`,
      ].join("\n");
    })
    .join("\n\n");
}

function createModelOutputExample() {
  return {
    level: null,
    rubricAssessment: [
      {
        pointText: "Rubric point text",
        status: "present",
        evidence: "Quote or tight grounded paraphrase from the student answer",
        reason: "Short examiner reason",
      },
    ],
    feedback: {
      nextStep: "One concise practical rewrite instruction",
    },
  };
}

function parseModelOutputOrError({
  generatedQuestionId,
  markingStyle,
  modelName,
  rawOutput,
}: {
  generatedQuestionId: number;
  markingStyle: "points" | "levels";
  modelName: string;
  rawOutput: string;
}): unknown | ApiFailure {
  try {
    return JSON.parse(rawOutput);
  } catch (caughtError) {
    console.error("[api/mark-answer] Invalid model JSON", {
      generatedQuestionId,
      markingStyle,
      modelName,
      rawModelOutput: rawOutput,
      message:
        caughtError instanceof Error ? caughtError.message : String(caughtError),
    });

    return createErrorResult(500, SAFE_ERRORS.markingFailure);
  }
}

function normalizeMarkingResponseOrError({
  generatedQuestionId,
  modelName,
  parsedOutput,
  question,
  rawOutput,
}: {
  generatedQuestionId: number;
  modelName: string;
  parsedOutput: unknown;
  question: LoadedGeneratedQuestion;
  rawOutput: string;
}): MarkAnswerResponse | ApiFailure {
  try {
    return normalizeMarkingResponse(parsedOutput, question);
  } catch (caughtError) {
    console.error("[api/mark-answer] Invalid model marking payload", {
      generatedQuestionId,
      markingStyle: question.markingStyle,
      modelName,
      rawModelOutput: rawOutput,
      message:
        caughtError instanceof Error ? caughtError.message : String(caughtError),
    });

    return createErrorResult(500, SAFE_ERRORS.markingFailure);
  }
}

function normalizeMarkingResponse(
  parsedOutput: unknown,
  question: LoadedGeneratedQuestion,
): MarkAnswerResponse {
  if (!isRecord(parsedOutput)) {
    throw new Error("Model output must be an object");
  }

  const rubricAssessment = normalizeRubricAssessment(
    parsedOutput.rubricAssessment,
    question.rubricPoints,
  );
  const feedback = normalizeFeedback(parsedOutput.feedback);
  const score = Math.min(question.marks, countPresentRubricPoints(rubricAssessment));

  return {
    score,
    maxScore: question.marks,
    level:
      question.markingStyle === "levels"
        ? normalizeLevelRecommendation(parsedOutput.level, question.levelDescriptors)
        : null,
    rubricAssessment,
    feedback,
  };
}

function normalizeRubricAssessment(
  value: unknown,
  rubricPoints: PracticeRubricPoint[],
) {
  if (!Array.isArray(value)) {
    throw new Error("rubricAssessment must be an array");
  }

  if (value.length !== rubricPoints.length) {
    throw new Error("rubricAssessment length must match rubric points");
  }

  return rubricPoints.map((point, index) =>
    normalizeRubricAssessmentItem(value[index], point.pointText, index),
  );
}

function normalizeRubricAssessmentItem(
  value: unknown,
  expectedPointText: string,
  index: number,
): PracticeRubricAssessment {
  if (!isRecord(value)) {
    throw new Error("Each rubric assessment item must be an object");
  }

  normalizeRequiredString(
    value.pointText,
    `rubricAssessment[${index}].pointText`,
  );

  if (
    value.pointIndex !== undefined &&
    (!isInteger(value.pointIndex) || value.pointIndex !== index + 1)
  ) {
    throw new Error("Rubric assessment pointIndex must match rubric order");
  }

  const status = normalizeRubricAssessmentStatus(value.status);

  if (!status) {
    throw new Error("Rubric assessment status is invalid");
  }

  const evidence = normalizeOptionalString(
    value.evidence,
    `rubricAssessment[${index}].evidence`,
  );
  const reason = normalizeRequiredString(
    value.reason,
    `rubricAssessment[${index}].reason`,
  );

  if (status === "absent" && evidence.length > 0) {
    throw new Error("Absent rubric points must not include evidence");
  }

  if (status !== "absent" && evidence.length === 0) {
    throw new Error("Present or partial rubric points must include evidence");
  }

  return {
    pointText: expectedPointText,
    status,
    evidence,
    reason,
  };
}

function normalizeFeedback(value: unknown): PracticeStructuredFeedback {
  if (!isRecord(value)) {
    throw new Error("feedback must be an object");
  }

  return {
    nextStep: normalizeRequiredString(value.nextStep, "feedback.nextStep"),
  };
}

function normalizeLevelRecommendation(
  value: unknown,
  levelDescriptors: PracticeLevelDescriptor[],
) {
  const normalizedLevel = normalizeLevelNumber(value);

  if (normalizedLevel === null) {
    return null;
  }

  const matchingDescriptor = levelDescriptors.find(
    (descriptor) => descriptor.levelNumber === normalizedLevel,
  );

  return matchingDescriptor ? normalizedLevel : null;
}

function normalizeRequiredString(value: unknown, fieldName: string) {
  if (typeof value !== "string") {
    throw new Error(`${fieldName} must be a string`);
  }

  const normalizedValue = value.trim();

  if (normalizedValue.length === 0) {
    throw new Error(`${fieldName} must not be empty`);
  }

  return normalizedValue;
}

function normalizeOptionalString(value: unknown, fieldName: string) {
  if (typeof value !== "string") {
    throw new Error(`${fieldName} must be a string`);
  }

  return value.trim();
}

function countPresentRubricPoints(rubricAssessment: PracticeRubricAssessment[]) {
  return rubricAssessment.filter((item) => item.status === "present").length;
}

function createErrorResult(status: number, error: string): ApiFailure {
  return {
    status,
    body: { error },
  };
}

function isApiFailure(value: unknown): value is ApiFailure {
  return isRecord(value) && typeof value.status === "number" && "body" in value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value);
}

function isRubricAssessmentStatus(
  value: unknown,
): value is PracticeRubricAssessmentStatus {
  return value === "present" || value === "partial" || value === "absent";
}

function normalizeRubricAssessmentStatus(
  value: unknown,
): PracticeRubricAssessmentStatus | null {
  if (isRubricAssessmentStatus(value)) {
    return value;
  }

  if (typeof value !== "string") {
    return null;
  }

  const normalizedValue = value.trim().toLowerCase();

  if (
    normalizedValue === "correct" ||
    normalizedValue === "covered" ||
    normalizedValue === "full" ||
    normalizedValue === "fully present"
  ) {
    return "present";
  }

  if (
    normalizedValue === "partially correct" ||
    normalizedValue === "partly correct" ||
    normalizedValue === "incomplete"
  ) {
    return "partial";
  }

  if (
    normalizedValue === "missing" ||
    normalizedValue === "not present" ||
    normalizedValue === "not addressed"
  ) {
    return "absent";
  }

  return null;
}

function normalizeLevelNumber(value: unknown) {
  if (isInteger(value)) {
    return value;
  }

  if (typeof value === "string") {
    const match = value.trim().match(/\d+/);

    if (match) {
      const parsedValue = Number(match[0]);

      if (isInteger(parsedValue)) {
        return parsedValue;
      }
    }
  }

  return null;
}

function getSafeModelClientErrorMessage(caughtError: unknown) {
  if (caughtError instanceof ModelConfigurationError) {
    return SAFE_ERRORS.markingConfiguration;
  }

  return SAFE_ERRORS.markingFailure;
}

function getSafeModelRequestErrorMessage(caughtError: unknown) {
  if (
    caughtError instanceof OpenAI.AuthenticationError ||
    caughtError instanceof OpenAI.PermissionDeniedError
  ) {
    return SAFE_ERRORS.markingConfiguration;
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
      return SAFE_ERRORS.markingConfiguration;
    }

    if (caughtError.status !== undefined && caughtError.status >= 500) {
      return SAFE_ERRORS.markingUnavailable;
    }
  }

  if (
    caughtError instanceof Error &&
    /timed out/i.test(caughtError.message)
  ) {
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

class GeneratedQuestionNotFoundError extends Error {}

class MissingMarkingCriteriaError extends Error {}

class ModelConfigurationError extends Error {}
