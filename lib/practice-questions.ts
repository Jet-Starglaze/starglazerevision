import {
  BIOLOGY_PRACTICE_SUBJECT_SLUG,
  inferPracticeQuestionCommandWord,
  isPracticeQuestionCommandWord,
  normalizePracticeQuestionCommandWord,
  practiceQuestionFilterModes,
  type PracticeQuestionCommandWord,
  type PracticeQuestionFilterMode,
  type PracticeSessionLength,
} from "@/lib/mock-biology-practice";
import type {
  ApiErrorResponse,
  GenerateQuestionResponse,
} from "@/lib/mock-biology-practice-api";
import { createClient } from "@/utils/supabase/server";

type PracticeQuestionApiResult<T> = {
  status: number;
  body: T | ApiErrorResponse;
};

type MaybeEmbedded<T> = T | T[] | null;

type RubricPointRow = {
  id: number | string;
  point_text: string;
  order_number: number;
};

type QuestionTopicRow = {
  id: number | string;
  name: string;
};

type QuestionSubtopicRow = {
  id: number | string;
  name: string;
  topics: MaybeEmbedded<QuestionTopicRow>;
};

type QuestionRow = {
  id: number | string;
  subtopic_id: number | string;
  question_text: string;
  marks: number;
  question_type: string;
  answer_focus: string | null;
  rubric_points: RubricPointRow[] | null;
  subtopics: MaybeEmbedded<QuestionSubtopicRow>;
};

const practiceSessionLengths = [5, 10, 20] as const;
const legacyQuestionTypeValues = new Set([
  "6-mark",
  "six-mark",
  "long-answer",
  "long answer",
]);

export async function fetchPracticeQuestionFromSupabase(
  payload: unknown,
): Promise<PracticeQuestionApiResult<GenerateQuestionResponse>> {
  if (!isRecord(payload)) {
    return createErrorResult(400, "Invalid request body");
  }

  const {
    subjectId,
    selectedSubtopicIds,
    questionFilterMode,
    sessionLength,
    questionCursor,
  } = payload;

  if (typeof subjectId !== "string" || subjectId.length === 0) {
    return createErrorResult(400, "subjectId is required");
  }

  if (subjectId !== BIOLOGY_PRACTICE_SUBJECT_SLUG) {
    return createErrorResult(400, "Unsupported subjectId");
  }

  if (!Array.isArray(selectedSubtopicIds)) {
    return createErrorResult(
      400,
      "selectedSubtopicIds must be an array of numeric IDs",
    );
  }

  const normalizedSubtopicIds = normalizeNumericIds(selectedSubtopicIds);

  if (!normalizedSubtopicIds) {
    return createErrorResult(
      400,
      "selectedSubtopicIds must be an array of numeric IDs",
    );
  }

  if (normalizedSubtopicIds.length === 0) {
    return createErrorResult(400, "No subtopics selected");
  }

  if (!isPracticeQuestionFilterMode(questionFilterMode)) {
    return createErrorResult(400, "Invalid questionFilterMode");
  }

  if (!isPracticeSessionLength(sessionLength)) {
    return createErrorResult(400, "Invalid sessionLength");
  }

  if (questionCursor !== undefined && !isNonNegativeInteger(questionCursor)) {
    return createErrorResult(
      400,
      "questionCursor must be a non-negative integer",
    );
  }

  const supabase = await createClient();
  let query = supabase
    .from("questions")
    .select(
      `
        id,
        subtopic_id,
        question_text,
        marks,
        question_type,
        answer_focus,
        rubric_points (
          id,
          point_text,
          order_number
        ),
        subtopics!inner (
          id,
          name,
          topics!inner (
            id,
            name
          )
        )
      `,
    )
    .in("subtopic_id", uniqueIntegers(normalizedSubtopicIds))
    .order("id", { ascending: true });

  if (questionFilterMode === "six-mark-only") {
    query = query.eq("marks", 6);
  } else if (questionFilterMode === "long-answer") {
    query = query.gte("marks", 3);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[api/generate-question] Failed to load questions", {
      subjectId,
      selectedSubtopicIds: normalizedSubtopicIds,
      questionFilterMode,
      message: error.message,
    });

    return createErrorResult(500, "Could not load a saved question right now.");
  }

  const questionRows = (data ?? []) as QuestionRow[];

  if (questionRows.length === 0) {
    return createErrorResult(
      404,
      "No saved questions found yet for the selected subtopics.",
    );
  }

  const eligibleQuestions = questionRows
    .map(mapQuestionRow)
    .filter((question): question is GenerateQuestionResponse => question !== null);

  if (eligibleQuestions.length === 0) {
    console.error(
      "[api/generate-question] Loaded questions could not be mapped",
      {
        subjectId,
        selectedSubtopicIds: normalizedSubtopicIds,
        questionFilterMode,
        questionCount: questionRows.length,
      },
    );

    return createErrorResult(500, "Could not load a saved question right now.");
  }

  const nextQuestion =
    eligibleQuestions[(questionCursor ?? 0) % eligibleQuestions.length] ?? null;

  if (!nextQuestion) {
    return createErrorResult(
      404,
      "No saved questions found yet for the selected subtopics.",
    );
  }

  return {
    status: 200,
    body: nextQuestion,
  };
}

function mapQuestionRow(row: QuestionRow): GenerateQuestionResponse | null {
  const normalizedQuestionType = mapDatabaseQuestionType(
    row.question_type,
    row.question_text,
    row.id,
  );

  if (!normalizedQuestionType) {
    return null;
  }

  const subtopicRow = takeFirst(row.subtopics);
  const topicRow = takeFirst(subtopicRow?.topics);

  if (!subtopicRow || !topicRow) {
    return null;
  }

  const rubricPoints = sortRubricPoints(row.rubric_points).map((point) => ({
    id: toNumericId(point.id),
    pointText: point.point_text,
    orderNumber: point.order_number,
  }));

  return {
    questionId: String(toNumericId(row.id)),
    questionText: row.question_text,
    marks: row.marks,
    questionType: normalizedQuestionType,
    topicId: String(toNumericId(topicRow.id)),
    topicLabel: topicRow.name,
    subtopicId: String(toNumericId(subtopicRow.id)),
    subtopicLabel: subtopicRow.name,
    answerFocus: row.answer_focus ?? "",
    rubricPoints,
  };
}

function mapDatabaseQuestionType(
  questionType: unknown,
  questionText: string,
  questionId: number | string,
): PracticeQuestionCommandWord | null {
  if (typeof questionType !== "string") {
    return null;
  }

  const normalizedValue = normalizePracticeQuestionCommandWord(questionType);

  if (!normalizedValue) {
    return null;
  }

  if (legacyQuestionTypeValues.has(normalizedValue)) {
    const inferredCommandWord = inferPracticeQuestionCommandWord(questionText);

    if (inferredCommandWord) {
      console.warn("[api/generate-question] Legacy question_type mapped", {
        questionId: String(questionId),
        storedQuestionType: questionType,
        mappedQuestionType: inferredCommandWord,
      });

      return inferredCommandWord;
    }

    console.warn("[api/generate-question] Legacy question_type fallback used", {
      questionId: String(questionId),
      storedQuestionType: questionType,
      mappedQuestionType: "explain",
    });

    return "explain";
  }

  return isPracticeQuestionCommandWord(normalizedValue)
    ? normalizedValue
    : null;
}

function takeFirst<T>(value: MaybeEmbedded<T> | undefined): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function sortRubricPoints(value: RubricPointRow[] | null | undefined) {
  return [...(value ?? [])].sort((left, right) => {
    return left.order_number - right.order_number;
  });
}

function uniqueIntegers(value: number[]) {
  return Array.from(new Set(value));
}

function createErrorResult(
  status: number,
  error: string,
): PracticeQuestionApiResult<never> {
  return {
    status,
    body: { error },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isPracticeQuestionFilterMode(
  value: unknown,
): value is PracticeQuestionFilterMode {
  return (
    typeof value === "string" &&
    practiceQuestionFilterModes.includes(value as PracticeQuestionFilterMode)
  );
}

function isPracticeSessionLength(value: unknown): value is PracticeSessionLength {
  return (
    typeof value === "number" &&
    practiceSessionLengths.includes(value as PracticeSessionLength)
  );
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function normalizeNumericIds(value: unknown[]) {
  const normalizedIds: number[] = [];

  for (const item of value) {
    const normalizedValue = normalizeNumericId(item);

    if (normalizedValue === null) {
      return null;
    }

    normalizedIds.push(normalizedValue);
  }

  return normalizedIds;
}

function normalizeNumericId(value: unknown) {
  if (isPositiveInteger(value)) {
    return value;
  }

  if (typeof value === "string" && /^\d+$/.test(value)) {
    const parsedValue = Number(value);

    if (isPositiveInteger(parsedValue)) {
      return parsedValue;
    }
  }

  return null;
}

function toNumericId(value: number | string) {
  if (typeof value === "number") {
    return value;
  }

  const parsedValue = Number(value);

  if (!isPositiveInteger(parsedValue)) {
    throw new Error(`Invalid numeric identifier "${value}"`);
  }

  return parsedValue;
}
