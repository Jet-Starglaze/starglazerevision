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
  GenerateQuestionSelectionStrategy,
  GenerateQuestionResponse,
} from "@/lib/mock-biology-practice-api";
import {
  fetchGeneratedRubricPoints,
  toNumericId,
  type GeneratedQuestionRecord,
  type SupabaseServerClient,
} from "@/lib/generated-practice-content";
import {
  fetchUserQuestionProgressForQuestions,
  getAuthenticatedUserId,
  type UserQuestionProgressSnapshot,
} from "@/lib/practice-progress";
import { createClient } from "@/utils/supabase/server";

type PracticeQuestionApiResult<T> = {
  status: number;
  body: T | ApiErrorResponse;
};

type GeneratedQuestionBuildResult =
  | {
      accepted: true;
      question: GenerateQuestionResponse;
      normalizedQuestionType: PracticeQuestionCommandWord;
      rubricPointCount: number;
    }
  | {
      accepted: false;
      stage: "status" | "question_type" | "subtopic_context" | "rubric";
      reason:
        | "status mismatch"
        | "invalid question_type"
        | "subject/topic/subtopic join mismatch"
        | "missing rubric";
      details?: Record<string, unknown>;
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
const authRequiredMessage = "Authentication required.";
const FAST_INITIAL_QUESTION_WINDOW_SIZE = 12;
const SHOULD_LOG_GENERATE_QUESTION_DEBUG =
  process.env.NODE_ENV === "development";
let generatedQuestionModelAnswerAvailable: boolean | null = null;
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
    excludeQuestionIds,
    questionFilterMode,
    sessionLength,
    questionCursor,
    selectionStrategy,
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

  const normalizedExcludedQuestionIds =
    excludeQuestionIds === undefined
      ? []
      : Array.isArray(excludeQuestionIds)
        ? normalizeNumericIds(excludeQuestionIds)
        : null;

  if (normalizedExcludedQuestionIds === null) {
    return createErrorResult(
      400,
      "excludeQuestionIds must be an array of numeric IDs",
    );
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

  if (
    selectionStrategy !== undefined &&
    !isGenerateQuestionSelectionStrategy(selectionStrategy)
  ) {
    return createErrorResult(400, "Invalid selectionStrategy");
  }

  const uniqueSubtopicIds = uniqueIntegers(normalizedSubtopicIds);
  const uniqueExcludedQuestionIds = uniqueIntegers(normalizedExcludedQuestionIds);
  const supabase = await createClient();
  const userId = await getAuthenticatedUserId(supabase);
  const effectiveQuestionCursor = questionCursor ?? 0;
  const effectiveSelectionStrategy = selectionStrategy ?? "weighted";

  if (!userId) {
    return createErrorResult(401, authRequiredMessage);
  }

  logGenerateQuestionDebug("request-received", {
    subjectId,
    selectedSubtopicIds,
    normalizedSubtopicIds,
    uniqueSubtopicIds,
    excludeQuestionIds: uniqueExcludedQuestionIds,
    questionFilterMode,
    sessionLength,
    questionCursor: effectiveQuestionCursor,
    selectionStrategy: effectiveSelectionStrategy,
  });

  logGenerateQuestionDebug("query-filters", {
    selectedSubtopicIds: uniqueSubtopicIds,
    excludeQuestionIds: uniqueExcludedQuestionIds,
    statusFilter: "approved",
    questionFilterMode,
    marksFilter: describeMarksFilter(questionFilterMode),
    selectionStrategy: effectiveSelectionStrategy,
  });

  try {
    const nextQuestion =
      effectiveSelectionStrategy === "fast-initial"
        ? await selectFastInitialGeneratedQuestion({
            effectiveQuestionCursor,
            excludeQuestionIds: uniqueExcludedQuestionIds,
            questionFilterMode,
            selectedSubtopicIds: uniqueSubtopicIds,
            subjectId,
            supabase,
            userId,
          })
        : await selectWeightedGeneratedQuestion({
            effectiveQuestionCursor,
            excludeQuestionIds: uniqueExcludedQuestionIds,
            questionFilterMode,
            selectedSubtopicIds: uniqueSubtopicIds,
            subjectId,
            supabase,
            userId,
          });

    if (!nextQuestion) {
      console.error(
        "[api/generate-question] No usable generated question found",
        {
          subjectId,
          selectedSubtopicIds: uniqueSubtopicIds,
          questionFilterMode,
          selectionStrategy: effectiveSelectionStrategy,
        },
      );

      return createErrorResult(404, noApprovedQuestionsMessage);
    }

    return {
      status: 200,
      body: nextQuestion,
    };
  } catch (caughtError) {
    console.error("[api/generate-question] Failed to build generated question", {
      subjectId,
      questionCursor: questionCursor ?? 0,
      selectionStrategy: effectiveSelectionStrategy,
      message:
        caughtError instanceof Error ? caughtError.message : String(caughtError),
    });

    return createErrorResult(500, questionLoadErrorMessage);
  }
}

async function selectFastInitialGeneratedQuestion({
  effectiveQuestionCursor,
  excludeQuestionIds,
  questionFilterMode,
  selectedSubtopicIds,
  subjectId,
  supabase,
  userId,
}: {
  effectiveQuestionCursor: number;
  excludeQuestionIds: number[];
  questionFilterMode: PracticeQuestionFilterMode;
  selectedSubtopicIds: number[];
  subjectId: string;
  supabase: SupabaseServerClient;
  userId: string;
}): Promise<GenerateQuestionResponse | null> {
  const fastWindowRows = await loadGeneratedQuestionRows({
    effectiveQuestionCursor,
    excludeQuestionIds,
    questionFilterMode,
    selectedSubtopicIds,
    subjectId,
    supabase,
    strategy: "fast-initial",
    limit: FAST_INITIAL_QUESTION_WINDOW_SIZE,
  });

  logGenerateQuestionDebug("fast-initial-window", {
    questionCursor: effectiveQuestionCursor,
    requestedWindowSize: FAST_INITIAL_QUESTION_WINDOW_SIZE,
    returnedWindowSize: fastWindowRows.length,
  });

  if (fastWindowRows.length === 0) {
    return null;
  }

  const {
    nextQuestion: fastInitialQuestion,
    rowsAfterStatus,
    rowsAfterQuestionType,
    rowsAfterSubtopicContext,
    rowsAfterRubric,
  } = await buildNextQuestionFromOrderedRows(shuffleArray(fastWindowRows), supabase);

  logGenerateQuestionDebug("fast-initial-filter-summary", {
    totalFetchedRows: fastWindowRows.length,
    rowsAfterStatus,
    rowsAfterQuestionType,
    rowsAfterSubtopicContext,
    rowsAfterRubric,
    acceptedQuestionId: fastInitialQuestion?.questionId ?? null,
  });

  if (fastInitialQuestion) {
    return fastInitialQuestion;
  }

  logGenerateQuestionDebug("fast-initial-fallback", {
    questionCursor: effectiveQuestionCursor,
    fastWindowSize: fastWindowRows.length,
    reason: "no valid question in fast window",
  });

  return selectWeightedGeneratedQuestion({
    effectiveQuestionCursor,
    excludeQuestionIds,
    questionFilterMode,
    selectedSubtopicIds,
    subjectId,
    supabase,
    userId,
  });
}

async function selectWeightedGeneratedQuestion({
  effectiveQuestionCursor,
  excludeQuestionIds,
  questionFilterMode,
  selectedSubtopicIds,
  subjectId,
  supabase,
  userId,
}: {
  effectiveQuestionCursor: number;
  excludeQuestionIds: number[];
  questionFilterMode: PracticeQuestionFilterMode;
  selectedSubtopicIds: number[];
  subjectId: string;
  supabase: SupabaseServerClient;
  userId: string;
}): Promise<GenerateQuestionResponse | null> {
  const questionRows = await loadGeneratedQuestionRows({
    effectiveQuestionCursor,
    excludeQuestionIds,
    questionFilterMode,
    selectedSubtopicIds,
    subjectId,
    supabase,
    strategy: "weighted",
  });

  if (questionRows.length === 0) {
    return null;
  }

  const userQuestionProgress = await fetchUserQuestionProgressForQuestions(
    supabase,
    userId,
    questionRows.map((row) => row.id),
  );

  return buildNextGeneratedQuestionResponse(
    questionRows,
    effectiveQuestionCursor,
    supabase,
    userQuestionProgress,
  );
}

async function loadGeneratedQuestionRows({
  effectiveQuestionCursor,
  excludeQuestionIds,
  questionFilterMode,
  selectedSubtopicIds,
  subjectId,
  supabase,
  strategy,
  limit,
}: {
  effectiveQuestionCursor: number;
  excludeQuestionIds: number[];
  questionFilterMode: PracticeQuestionFilterMode;
  selectedSubtopicIds: number[];
  subjectId: string;
  supabase: SupabaseServerClient;
  strategy: GenerateQuestionSelectionStrategy;
  limit?: number;
}) {
  let questionRows: GeneratedQuestionRecord[];

  try {
    questionRows = await fetchGeneratedQuestionRows({
      excludeQuestionIds,
      questionFilterMode,
      selectedSubtopicIds,
      supabase,
      limit,
    });
  } catch (caughtError) {
    console.error("[api/generate-question] Failed to load generated questions", {
      subjectId,
      selectedSubtopicIds,
      questionFilterMode,
      selectionStrategy: strategy,
      limit: limit ?? null,
      message:
        caughtError instanceof Error ? caughtError.message : String(caughtError),
    });

    throw caughtError;
  }

  logGenerateQuestionDebug("query-rows-fetched", {
    questionCursor: effectiveQuestionCursor,
    selectionStrategy: strategy,
    limit: limit ?? null,
    count: questionRows.length,
    rows: questionRows.map(summarizeGeneratedQuestionRow),
  });

  return questionRows;
}

async function buildNextGeneratedQuestionResponse(
  questionRows: GeneratedQuestionRecord[],
  questionCursor: number,
  supabase: SupabaseServerClient,
  userQuestionProgress: UserQuestionProgressSnapshot[],
): Promise<GenerateQuestionResponse | null> {
  const orderedQuestionRows = rankQuestionRowsForUser(
    questionRows,
    questionCursor,
    userQuestionProgress,
  );
  let rowsAfterStatus = 0;
  let rowsAfterQuestionType = 0;
  let rowsAfterSubtopicContext = 0;
  let rowsAfterRubric = 0;
  let nextQuestion: GenerateQuestionResponse | null = null;

  logGenerateQuestionDebug("candidate-order", {
    questionCursor,
    orderedQuestionIds: orderedQuestionRows.map((row) => String(row.id)),
  });

  ({
    nextQuestion,
    rowsAfterStatus,
    rowsAfterQuestionType,
    rowsAfterSubtopicContext,
    rowsAfterRubric,
  } = await buildNextQuestionFromOrderedRows(orderedQuestionRows, supabase));

  logGenerateQuestionDebug("filter-summary", {
    totalFetchedRows: orderedQuestionRows.length,
    rowsAfterStatus,
    rowsAfterQuestionType,
    rowsAfterSubtopicContext,
    rowsAfterRubric,
    acceptedQuestionId: nextQuestion?.questionId ?? null,
  });

  return nextQuestion;
}

async function buildNextQuestionFromOrderedRows(
  questionRows: GeneratedQuestionRecord[],
  supabase: SupabaseServerClient,
): Promise<{
  nextQuestion: GenerateQuestionResponse | null;
  rowsAfterStatus: number;
  rowsAfterQuestionType: number;
  rowsAfterSubtopicContext: number;
  rowsAfterRubric: number;
}> {
  let rowsAfterStatus = 0;
  let rowsAfterQuestionType = 0;
  let rowsAfterSubtopicContext = 0;
  let rowsAfterRubric = 0;
  let nextQuestion: GenerateQuestionResponse | null = null;

  for (const row of questionRows) {
    const buildResult = await buildGeneratedQuestionResponse(row, supabase);

    if (buildResult.accepted) {
      rowsAfterStatus += 1;
      rowsAfterQuestionType += 1;
      rowsAfterSubtopicContext += 1;
      rowsAfterRubric += 1;

      logGenerateQuestionDebug("row-accepted", {
        questionId: String(row.id),
        normalizedQuestionType: buildResult.normalizedQuestionType,
        rubricPointCount: buildResult.rubricPointCount,
      });

      nextQuestion ??= buildResult.question;

      if (!SHOULD_LOG_GENERATE_QUESTION_DEBUG) {
        return {
          nextQuestion,
          rowsAfterStatus,
          rowsAfterQuestionType,
          rowsAfterSubtopicContext,
          rowsAfterRubric,
        };
      }

      continue;
    }

    if (buildResult.stage !== "status") {
      rowsAfterStatus += 1;
    }

    if (
      buildResult.stage !== "status" &&
      buildResult.stage !== "question_type"
    ) {
      rowsAfterQuestionType += 1;
    }

    if (
      buildResult.stage !== "status" &&
      buildResult.stage !== "question_type" &&
      buildResult.stage !== "subtopic_context"
    ) {
      rowsAfterSubtopicContext += 1;
    }

    logGenerateQuestionDebug("row-rejected", {
      questionId: String(row.id),
      stage: buildResult.stage,
      reason: buildResult.reason,
      ...buildResult.details,
    });
  }

  return {
    nextQuestion,
    rowsAfterStatus,
    rowsAfterQuestionType,
    rowsAfterSubtopicContext,
    rowsAfterRubric,
  };
}

async function buildGeneratedQuestionResponse(
  row: GeneratedQuestionRecord,
  supabase: SupabaseServerClient,
): Promise<GeneratedQuestionBuildResult> {
  if (row.status !== "approved") {
    return {
      accepted: false,
      stage: "status",
      reason: "status mismatch",
      details: {
        status: row.status,
      },
    };
  }

  const normalizedQuestionType = mapDatabaseQuestionType(
    row.question_type,
    row.question_text,
    row.id,
  );

  if (!normalizedQuestionType) {
    return {
      accepted: false,
      stage: "question_type",
      reason: "invalid question_type",
      details: {
        storedQuestionType: row.question_type,
        normalizedQuestionType:
          typeof row.question_type === "string"
            ? normalizeStoredQuestionType(row.question_type)
            : null,
      },
    };
  }

  const subtopicRow = await fetchSubtopicContext(supabase, row.subtopic_id);
  const topicRow = takeFirst(subtopicRow?.topics);

  if (!subtopicRow || !topicRow) {
    return {
      accepted: false,
      stage: "subtopic_context",
      reason: "subject/topic/subtopic join mismatch",
      details: {
        subtopicId: String(row.subtopic_id),
        subtopicFound: Boolean(subtopicRow),
        topicFound: Boolean(topicRow),
      },
    };
  }

  const rubricPoints = await fetchGeneratedRubricPoints(supabase, row.id);

  if (rubricPoints.length === 0) {
    console.warn("[api/generate-question] Skipping question without rubric points", {
      questionId: String(row.id),
      subtopicId: String(row.subtopic_id),
    });

    return {
      accepted: false,
      stage: "rubric",
      reason: "missing rubric",
      details: {
        questionId: String(row.id),
        subtopicId: String(row.subtopic_id),
      },
    };
  }

  return {
    accepted: true,
    normalizedQuestionType,
    rubricPointCount: rubricPoints.length,
    question: {
      questionId: String(toNumericId(row.id)),
      questionText: row.question_text,
      marks: row.marks,
      questionType: normalizedQuestionType,
      topicId: String(toNumericId(topicRow.id)),
      topicLabel: topicRow.name,
      subtopicId: String(toNumericId(subtopicRow.id)),
      subtopicLabel: subtopicRow.name,
      answerFocus: row.answer_focus ?? "",
      modelAnswer: normalizeStoredModelAnswer(row.model_answer),
      rubricPoints,
    },
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

  const normalizedValue = normalizeStoredQuestionType(questionType);

  if (normalizedValue !== normalizePracticeQuestionCommandWord(questionType)) {
    logGenerateQuestionDebug("question-type-normalized", {
      questionId: String(questionId),
      storedQuestionType: questionType,
      normalizedQuestionType: normalizedValue,
    });
  }

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

function normalizeStoredQuestionType(value: string) {
  return normalizePracticeQuestionCommandWord(value).replace(/[_\s]+/g, "-");
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

function rankQuestionRowsForUser(
  questionRows: GeneratedQuestionRecord[],
  questionCursor: number,
  userQuestionProgress: UserQuestionProgressSnapshot[],
) {
  const progressByQuestionId = new Map(
    userQuestionProgress.map((progress) => [
      toNumericId(progress.generated_question_id),
      progress,
    ]),
  );
  const candidates = questionRows.map((row) => {
    const progress = progressByQuestionId.get(toNumericId(row.id)) ?? null;

    return {
      row,
      progress,
      weaknessRatio: getWeaknessRatio(progress),
    };
  });
  const mostRecentAttemptedQuestionId = getMostRecentAttemptedQuestionId(candidates);
  const unseenCandidates = shuffleArray(
    candidates.filter((candidate) => candidate.progress === null),
  );
  const seenCandidates = shuffleArray(
    candidates.filter((candidate) => candidate.progress !== null),
  ).sort((left, right) => left.weaknessRatio - right.weaknessRatio);
  const orderedSeenCandidates = moveQuestionToEnd(
    seenCandidates,
    mostRecentAttemptedQuestionId,
  );
  const orderedCandidates = [...unseenCandidates, ...orderedSeenCandidates];

  logGenerateQuestionDebug("selection-ranked-order", {
    questionCursor,
    unseenQuestionIds: unseenCandidates.map((candidate) => String(candidate.row.id)),
    seenQuestionIds: orderedSeenCandidates.map((candidate) => ({
      questionId: String(candidate.row.id),
      weaknessRatio: candidate.weaknessRatio,
      lastAttemptedAt: candidate.progress?.last_attempted_at ?? null,
    })),
    mostRecentAttemptedQuestionId:
      mostRecentAttemptedQuestionId === null
        ? null
        : String(mostRecentAttemptedQuestionId),
  });

  return orderedCandidates.map((candidate) => candidate.row);
}

function getWeaknessRatio(progress: UserQuestionProgressSnapshot | null) {
  if (!progress) {
    return -1;
  }

  if (typeof progress.max_score !== "number" || progress.max_score <= 0) {
    return 1;
  }

  const bestScore = typeof progress.best_score === "number" ? progress.best_score : 0;

  return bestScore / progress.max_score;
}

function getMostRecentAttemptedQuestionId(
  candidates: Array<{
    row: GeneratedQuestionRecord;
    progress: UserQuestionProgressSnapshot | null;
    weaknessRatio: number;
  }>,
) {
  let mostRecentQuestionId: number | null = null;
  let mostRecentAttemptedAt: string | null = null;

  for (const candidate of candidates) {
    const attemptedAt = candidate.progress?.last_attempted_at ?? null;

    if (!attemptedAt) {
      continue;
    }

    if (mostRecentAttemptedAt === null || attemptedAt > mostRecentAttemptedAt) {
      mostRecentAttemptedAt = attemptedAt;
      mostRecentQuestionId = toNumericId(candidate.row.id);
    }
  }

  return mostRecentQuestionId;
}

function moveQuestionToEnd<T extends { row: GeneratedQuestionRecord }>(
  candidates: T[],
  questionIdToMove: number | null,
) {
  if (questionIdToMove === null || candidates.length <= 1) {
    return candidates;
  }

  const retainedCandidates: T[] = [];
  let movedCandidate: T | null = null;

  for (const candidate of candidates) {
    if (toNumericId(candidate.row.id) === questionIdToMove && movedCandidate === null) {
      movedCandidate = candidate;
      continue;
    }

    retainedCandidates.push(candidate);
  }

  return movedCandidate ? [...retainedCandidates, movedCandidate] : candidates;
}

function shuffleArray<T>(items: T[]) {
  const nextItems = [...items];

  for (let index = nextItems.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    const currentItem = nextItems[index]!;

    nextItems[index] = nextItems[swapIndex]!;
    nextItems[swapIndex] = currentItem;
  }

  return nextItems;
}

function summarizeGeneratedQuestionRow(row: GeneratedQuestionRecord) {
  return {
    id: String(row.id),
    subtopicId: String(row.subtopic_id),
    marks: row.marks,
    questionType: row.question_type,
    status: row.status,
    questionTextPreview: row.question_text.slice(0, 120),
  };
}

function describeMarksFilter(questionFilterMode: PracticeQuestionFilterMode) {
  if (questionFilterMode === "six-mark-only") {
    return "marks = 6";
  }

  if (questionFilterMode === "long-answer") {
    return "marks >= 3";
  }

  return "none (mixed mode keeps all approved rows)";
}

async function fetchGeneratedQuestionRows({
  excludeQuestionIds,
  questionFilterMode,
  selectedSubtopicIds,
  supabase,
  limit,
}: {
  excludeQuestionIds: number[];
  questionFilterMode: PracticeQuestionFilterMode;
  selectedSubtopicIds: number[];
  supabase: SupabaseServerClient;
  limit?: number;
}): Promise<GeneratedQuestionRecord[]> {
  const includeModelAnswer = generatedQuestionModelAnswerAvailable !== false;
  let questionQuery = supabase
    .from("generated_questions")
    .select(buildGeneratedQuestionSelect(includeModelAnswer))
    .eq("status", "approved")
    .in("subtopic_id", selectedSubtopicIds)
    .order("id", { ascending: true });

  if (excludeQuestionIds.length > 0) {
    questionQuery = questionQuery.not("id", "in", `(${excludeQuestionIds.join(",")})`);
  }

  if (questionFilterMode === "six-mark-only") {
    questionQuery = questionQuery.eq("marks", 6);
  } else if (questionFilterMode === "long-answer") {
    questionQuery = questionQuery.gte("marks", 3);
  }

  if (typeof limit === "number") {
    questionQuery = questionQuery.limit(limit);
  }

  const { data, error } = await questionQuery;

  if (error) {
    if (includeModelAnswer && isMissingColumnError(error, "model_answer")) {
      generatedQuestionModelAnswerAvailable = false;

      console.warn(
        "[api/generate-question] model_answer unavailable on generated_questions",
      );

      return fetchGeneratedQuestionRows({
        excludeQuestionIds,
        questionFilterMode,
        selectedSubtopicIds,
        supabase,
        limit,
      });
    }

    throw new Error(error.message);
  }

  if (includeModelAnswer) {
    generatedQuestionModelAnswerAvailable = true;
  }

  return (data ?? [])
    .map((row) => normalizeGeneratedQuestionRow(row))
    .filter((row) => !excludeQuestionIds.includes(toNumericId(row.id)));
}

type GeneratedQuestionRecordWithOptionalModelAnswer =
  Omit<GeneratedQuestionRecord, "model_answer"> & {
    model_answer?: string | null;
  };

function buildGeneratedQuestionSelect(includeModelAnswer: boolean) {
  const selectColumns = [
    "id",
    "subtopic_id",
    "question_text",
    "marks",
    "question_type",
    "answer_focus",
    "status",
  ];

  if (includeModelAnswer) {
    selectColumns.push("model_answer");
  }

  return selectColumns.join(", ");
}

function normalizeGeneratedQuestionRow(row: unknown): GeneratedQuestionRecord {
  const questionRow = row as GeneratedQuestionRecordWithOptionalModelAnswer;

  return {
    ...questionRow,
    model_answer: questionRow.model_answer ?? null,
  };
}

function normalizeStoredModelAnswer(modelAnswer: string | null) {
  if (typeof modelAnswer !== "string") {
    return null;
  }

  const trimmedModelAnswer = modelAnswer.trim();

  return trimmedModelAnswer.length > 0 ? trimmedModelAnswer : null;
}

function isMissingColumnError(caughtError: unknown, columnName: string) {
  const errorMessage =
    caughtError instanceof Error ? caughtError.message : String(caughtError);

  return errorMessage.toLowerCase().includes(columnName.toLowerCase());
}

function logGenerateQuestionDebug(
  message: string,
  details: Record<string, unknown>,
) {
  if (!SHOULD_LOG_GENERATE_QUESTION_DEBUG) {
    return;
  }

  console.info(`[api/generate-question][debug] ${message}`, details);
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

function isGenerateQuestionSelectionStrategy(
  value: unknown,
): value is GenerateQuestionSelectionStrategy {
  return value === "fast-initial" || value === "weighted";
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
