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

export type PracticeMarkingStyle = "points" | "levels";

export type PracticeLevelDescriptor = {
  levelNumber: number;
  minMark: number;
  maxMark: number;
  descriptorText: string;
  communicationRequirement: string | null;
};

export type PracticeRubricAssessmentStatus = "present" | "partial" | "absent";

export type PracticeRubricAssessment = {
  pointText: string;
  status: PracticeRubricAssessmentStatus;
  evidence: string;
  reason: string;
};

export type PracticeStructuredFeedback = {
  nextStep: string;
};

export type GenerateQuestionRequest = {
  subjectId: string;
  selectedSubtopicIds: number[];
  questionFilterMode: PracticeQuestionFilterMode;
  sessionLength: PracticeSessionLength;
  questionCursor?: number;
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
  markingStyle: PracticeMarkingStyle;
  rubricPoints: PracticeRubricPoint[];
  levelDescriptors: PracticeLevelDescriptor[];
};

export type MarkAnswerRequest = {
  generatedQuestionId: number;
  answerText: string;
  attemptNumber: number | null;
};

export type MarkAnswerResponse = {
  score: number;
  maxScore: number;
  level: number | null;
  rubricAssessment: PracticeRubricAssessment[];
  feedback: PracticeStructuredFeedback;
};
