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
import {
  fetchGeneratedLevelDescriptors,
  fetchGeneratedRubricPoints,
  mapDatabaseMarkingStyle,
  toNumericId,
  type GeneratedQuestionRecord,
  type SupabaseServerClient,
} from "@/lib/generated-practice-content";
import { createClient } from "@/utils/supabase/server";

type PracticeQuestionApiResult<T> = {
  status: number;
  body: T | ApiErrorResponse;
};

type MaybeEmbedded<T> = T | T[] | null;

type QuestionTopicRow = {
  id: number | string;
  name: string;
};

type QuestionSubtopicRow = {
  id: number | string;
  name: string;
  topics: MaybeEmbedded<QuestionTopicRow>;
};

const practiceSessionLengths = [5, 10, 20] as const;
const noApprovedQuestionsMessage =
  "No approved questions are available yet for the selected subtopics.";
const questionLoadErrorMessage =
  "Could not load a generated question right now.";
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

  const uniqueSubtopicIds = uniqueIntegers(normalizedSubtopicIds);
  const supabase = await createClient();

  let questionQuery = supabase
    .from("generated_questions")
    .select(
      `
        id,
        subtopic_id,
        question_text,
        marks,
        question_type,
        answer_focus,
        marking_style
      `,
    )
    .eq("status", "approved")
    .in("subtopic_id", uniqueSubtopicIds)
    .order("id", { ascending: true });

  if (questionFilterMode === "six-mark-only") {
    questionQuery = questionQuery.eq("marks", 6);
  } else if (questionFilterMode === "long-answer") {
    questionQuery = questionQuery.gte("marks", 3);
  }

  const { data, error } = await questionQuery;

  if (error) {
    console.error("[api/generate-question] Failed to load generated questions", {
      subjectId,
      selectedSubtopicIds: uniqueSubtopicIds,
      questionFilterMode,
      message: error.message,
    });

    return createErrorResult(500, questionLoadErrorMessage);
  }

  const questionRows = (data ?? []) as GeneratedQuestionRecord[];

  if (questionRows.length === 0) {
    return createErrorResult(404, noApprovedQuestionsMessage);
  }

  const nextQuestionRow =
    questionRows[(questionCursor ?? 0) % questionRows.length] ?? null;

  if (!nextQuestionRow) {
    return createErrorResult(404, noApprovedQuestionsMessage);
  }

  try {
    const nextQuestion = await buildGeneratedQuestionResponse(
      nextQuestionRow,
      supabase,
    );

    if (!nextQuestion) {
      console.error(
        "[api/generate-question] Generated question could not be mapped",
        {
          subjectId,
          questionId: String(nextQuestionRow.id),
          subtopicId: String(nextQuestionRow.subtopic_id),
        },
      );

      return createErrorResult(500, questionLoadErrorMessage);
    }

    return {
      status: 200,
      body: nextQuestion,
    };
  } catch (caughtError) {
    console.error("[api/generate-question] Failed to build generated question", {
      subjectId,
      questionId: String(nextQuestionRow.id),
      message:
        caughtError instanceof Error ? caughtError.message : String(caughtError),
    });

    return createErrorResult(500, questionLoadErrorMessage);
  }
}

async function buildGeneratedQuestionResponse(
  row: GeneratedQuestionRecord,
  supabase: SupabaseServerClient,
): Promise<GenerateQuestionResponse | null> {
  const normalizedQuestionType = mapDatabaseQuestionType(
    row.question_type,
    row.question_text,
    row.id,
  );

  if (!normalizedQuestionType) {
    return null;
  }

  const markingStyle = mapDatabaseMarkingStyle(row.marking_style, row.id);

  if (!markingStyle) {
    return null;
  }

  const subtopicRow = await fetchSubtopicContext(supabase, row.subtopic_id);
  const topicRow = takeFirst(subtopicRow?.topics);

  if (!subtopicRow || !topicRow) {
    return null;
  }

  const rubricPoints = await fetchGeneratedRubricPoints(supabase, row.id);
  const levelDescriptors =
    markingStyle === "levels"
      ? await fetchGeneratedLevelDescriptors(supabase, row.id)
      : [];

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
    markingStyle,
    rubricPoints,
    levelDescriptors,
  };
}

async function fetchSubtopicContext(
  supabase: SupabaseServerClient,
  subtopicId: number | string,
) {
  const { data, error } = await supabase
    .from("subtopics")
    .select(
      `
        id,
        name,
        topics!inner (
          id,
          name
        )
      `,
    )
    .eq("id", toNumericId(subtopicId))
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load subtopic context: ${error.message}`);
  }

  return (data ?? null) as QuestionSubtopicRow | null;
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
