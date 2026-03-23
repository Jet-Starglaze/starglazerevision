import type {
  PracticeQuestionCommandWord,
  PracticeQuestionFilterMode,
  PracticeSessionLength,
} from "@/lib/mock-biology-practice";

export type ApiErrorResponse = {
  error: string;
};

export type PracticeRubricPoint = {
  id: number;
  pointText: string;
  orderNumber: number;
};

export type PracticeRubricAssessmentStatus = "present" | "partial" | "absent";

export type PracticeRubricAssessment = {
  pointText: string;
  status: PracticeRubricAssessmentStatus;
  evidence: string;
};

export type PracticeStructuredFeedback = {
  nextStep: string;
  offTopicPoints?: string[];
};

export type GenerateQuestionSelectionStrategy = "fast-initial" | "weighted";

export type GenerateQuestionRequest = {
  subjectId: string;
  selectedSubtopicIds: number[];
  questionFilterMode: PracticeQuestionFilterMode;
  sessionLength: PracticeSessionLength;
  excludeQuestionIds?: number[];
  questionCursor?: number;
  selectionStrategy?: GenerateQuestionSelectionStrategy;
};

export type GenerateQuestionResponse = {
  questionId: string;
  questionText: string;
  marks: number;
  questionType: PracticeQuestionCommandWord;
  topicId: string;
  topicLabel: string;
  subtopicId: string;
  subtopicLabel: string;
  answerFocus: string;
  modelAnswer: string | null;
  rubricPoints: PracticeRubricPoint[];
};

export type MarkAnswerRequest = {
  generatedQuestionId: number;
  answerText: string;
  attemptNumber: number | null;
};

export type MarkAnswerResponse = {
  score: number;
  maxScore: number;
  rubricAssessment: PracticeRubricAssessment[];
  feedback: PracticeStructuredFeedback;
};
