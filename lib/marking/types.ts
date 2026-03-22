import type {
  ApiErrorResponse,
  MarkAnswerResponse,
  PracticeRubricAssessment,
  PracticeStructuredFeedback,
} from "@/lib/mock-biology-practice-api";
import type { GeneratedMarkingRubricPoint } from "@/lib/generated-practice-content";

export type PreparedMarkingInput = {
  generatedQuestionId: number;
  answerText: string;
  questionText: string;
  answerFocus: string;
  marks: number;
  questionType: string;
  rubricPoints: GeneratedMarkingRubricPoint[];
};

export type RubricAssessmentItem = PracticeRubricAssessment;

export type PointsModeModelResponse = {
  rubricAssessment: RubricAssessmentItem[];
  feedback: PracticeStructuredFeedback;
};

export type FinalMarkingResult = MarkAnswerResponse;

export type MarkingPrompt = {
  systemPrompt: string;
  userPrompt: string;
};

export type ModelOutput = {
  modelName: string;
  rawOutput: string;
  durationMs: number;
  maxCompletionTokens: number;
  completionTokensUsed: number | null;
  finishReason: string | null;
};

export type MarkingDiagnostics = {
  modelName: string | null;
  modelMaxTokens: number | null;
  completionTokensUsed: number | null;
  finishReason: string | null;
  questionTextChars: number;
  answerTextChars: number;
  promptChars: number;
  rubricPointCount: number;
  promptBuildMs: number | null;
  modelMs: number | null;
  parseMs: number | null;
  outputValidationMs: number | null;
  scoringMs: number | null;
  rawOutputChars: number | null;
};

export type MarkingApiResult<T> = {
  status: number;
  body: T | ApiErrorResponse;
  meta?: MarkingDiagnostics;
};

export type ApiFailure = MarkingApiResult<never>;

export function createErrorResult(status: number, error: string): ApiFailure {
  return {
    status,
    body: { error },
  };
}

export function isApiFailure(value: unknown): value is ApiFailure {
  return typeof value === "object" && value !== null && "status" in value && "body" in value;
}
