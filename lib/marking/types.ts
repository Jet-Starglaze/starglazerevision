import type {
  ApiErrorResponse,
  MarkAnswerResponse,
  PracticeLevelDescriptor,
  PracticeMarkingStyle,
  PracticeRubricAssessment,
  PracticeStructuredFeedback,
} from "@/lib/mock-biology-practice-api";
import type { GeneratedMarkingRubricPoint } from "@/lib/generated-practice-content";

export type MarkingMode = PracticeMarkingStyle;

export type PreparedMarkingInput = {
  generatedQuestionId: number;
  answerText: string;
  questionText: string;
  marks: number;
  questionType: string;
  markingStyle: MarkingMode;
  answerFocus: string;
  rubricPoints: GeneratedMarkingRubricPoint[];
  levelDescriptors: PracticeLevelDescriptor[];
};

export type RubricAssessmentItem = PracticeRubricAssessment;

export type PointsModeModelResponse = {
  rubricAssessment: RubricAssessmentItem[];
  feedback: PracticeStructuredFeedback;
};

export type LevelsModeModelResponse = PointsModeModelResponse & {
  recommendedLevel: number;
  recommendedMark: number;
  levelReasoning: string;
};

export type FinalMarkingResult = MarkAnswerResponse;

export type MarkingPrompt = {
  systemPrompt: string;
  userPrompt: string;
};

export type ModelOutput = {
  modelName: string;
  rawOutput: string;
};

export type MarkingApiResult<T> = {
  status: number;
  body: T | ApiErrorResponse;
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
