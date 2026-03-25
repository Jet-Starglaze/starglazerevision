import { formatRequiredAreaLabel } from "./required-area-display.ts";
import { isMissingColumnError } from "./supabase-errors.ts";
import type { createClient } from "../utils/supabase/server.ts";

type PracticeStatsClient = Awaited<ReturnType<typeof createClient>>;

type PracticeMasteryBand = "weak" | "developing" | "strong";

type UserQuestionProgressRow = {
  generated_question_id: number | string;
  subtopic_id: number | string;
  attempts_total: number | null;
  best_score: number | null;
  completed: boolean | null;
  max_score: number | null;
  times_skipped: number | null;
  last_skipped_at: string | null;
};

type UserSubtopicProgressRow = {
  subtopic_id: number | string;
  questions_seen: number | null;
  questions_completed: number | null;
  avg_score_ratio: number | null;
  avg_attempts_per_question: number | null;
  mastery_band: string | null;
  last_practised_at: string | null;
};

type UserRequiredAreaProgressRow = {
  subtopic_id: number | string;
  required_area: string;
  times_tested: number | null;
  times_present: number | null;
  times_partial: number | null;
  times_absent: number | null;
  mastery_ratio: number | null;
  mastery_band: string | null;
  last_practised_at: string | null;
};

type GeneratedQuestionAttemptRow = {
  generated_question_id: number | string;
  subtopic_id: number | string;
  attempt_number: number;
  score: number;
  max_score: number;
  created_at: string | null;
};

type GeneratedQuestionLookupRow = {
  id: number | string;
  question_text: string;
};

type SubtopicLookupRow = {
  id: number | string;
  code: string;
  name: string;
};
let userQuestionProgressSkipColumnsAvailable: boolean | null = null;

export function resetPracticeStatsSkipColumnsAvailabilityForTests() {
  userQuestionProgressSkipColumnsAvailable = null;
}

export type PracticeStatsSummary = {
  questionsAttempted: number;
  questionsCompleted: number;
  questionsSkipped: number;
  averageScoreRatio: number;
  averageAttemptsPerQuestion: number;
  averageAttemptsToCompletion: number | null;
};

export type PracticeStatsSubtopicRow = {
  subtopicId: number;
  subtopicCode: string | null;
  subtopicName: string;
  questionsSeen: number;
  questionsCompleted: number;
  averageScoreRatio: number;
  averageAttemptsPerQuestion: number;
  masteryBand: PracticeMasteryBand | null;
  lastPractisedAt: string | null;
};

export type PracticeStatsRequiredAreaRow = {
  subtopicId: number;
  subtopicCode: string | null;
  subtopicName: string;
  requiredArea: string;
  requiredAreaLabel: string;
  timesTested: number;
  timesPresent: number;
  timesPartial: number;
  timesAbsent: number;
  masteryRatio: number;
  masteryBand: PracticeMasteryBand | null;
  lastPractisedAt: string | null;
};

export type PracticeStatsRecentAttemptRow = {
  generatedQuestionId: number;
  questionText: string;
  subtopicId: number;
  subtopicCode: string | null;
  subtopicName: string;
  attemptNumber: number;
  score: number;
  maxScore: number;
  createdAt: string | null;
};

export type PracticeStatsSkippedQuestionRow = {
  generatedQuestionId: number;
  questionText: string;
  subtopicId: number;
  subtopicCode: string | null;
  subtopicName: string;
  attemptsTotal: number;
  skippedAt: string | null;
};

export type PracticeStatsFocusNext = {
  weakestSubtopic: PracticeStatsSubtopicRow | null;
  weakestRequiredArea: PracticeStatsRequiredAreaRow | null;
  mostRecentlyPractisedSubtopic: PracticeStatsSubtopicRow | null;
};

export type PracticeStatsPayload = {
  summary: PracticeStatsSummary;
  subtopicProgress: PracticeStatsSubtopicRow[];
  requiredAreaProgress: PracticeStatsRequiredAreaRow[];
  recentAttempts: PracticeStatsRecentAttemptRow[];
  recentSkippedQuestions: PracticeStatsSkippedQuestionRow[];
  focusNext: PracticeStatsFocusNext;
};

export async function fetchPracticeStats(
  supabase: PracticeStatsClient,
  userId: string,
): Promise<PracticeStatsPayload> {
  const [
    summary,
    subtopicProgress,
    requiredAreaProgress,
    recentAttempts,
    recentSkippedQuestions,
  ] = await Promise.all([
    fetchPracticeStatsSummary(supabase, userId),
    fetchPracticeStatsSubtopicProgress(supabase, userId),
    fetchPracticeStatsRequiredAreaProgress(supabase, userId),
    fetchPracticeStatsRecentAttempts(supabase, userId),
    fetchPracticeStatsRecentSkippedQuestions(supabase, userId),
  ]);

  return {
    summary,
    subtopicProgress,
    requiredAreaProgress,
    recentAttempts,
    recentSkippedQuestions,
    focusNext: {
      weakestSubtopic: subtopicProgress[0] ?? null,
      weakestRequiredArea: requiredAreaProgress[0] ?? null,
      mostRecentlyPractisedSubtopic: getMostRecentlyPractisedSubtopic(
        subtopicProgress,
      ),
    },
  };
}

async function fetchPracticeStatsSummary(
  supabase: PracticeStatsClient,
  userId: string,
): Promise<PracticeStatsSummary> {
  const rows = await fetchUserQuestionProgressRowsForStats({
    supabase,
    userId,
  });

  return buildPracticeStatsSummary(rows);
}

async function fetchPracticeStatsSubtopicProgress(
  supabase: PracticeStatsClient,
  userId: string,
): Promise<PracticeStatsSubtopicRow[]> {
  const { data, error } = await supabase
    .from("user_subtopic_progress")
    .select(
      "subtopic_id, questions_seen, questions_completed, avg_score_ratio, avg_attempts_per_question, mastery_band, last_practised_at",
    )
    .eq("user_id", userId);

  if (error) {
    throw new Error(`Failed to load subtopic progress: ${error.message}`);
  }

  const rows = (data ?? []) as UserSubtopicProgressRow[];
  const subtopicLookup = await fetchSubtopicLookup(
    supabase,
    rows.map((row) => row.subtopic_id),
  );

  return rows
    .map((row) => {
      const subtopicId = toNumericId(row.subtopic_id);
      const subtopic = subtopicLookup.get(subtopicId);

      return {
        subtopicId,
        subtopicCode: subtopic?.code ?? null,
        subtopicName: subtopic?.name ?? `Subtopic ${subtopicId}`,
        questionsSeen: row.questions_seen ?? 0,
        questionsCompleted: row.questions_completed ?? 0,
        averageScoreRatio: row.avg_score_ratio ?? 0,
        averageAttemptsPerQuestion: row.avg_attempts_per_question ?? 0,
        masteryBand: normalizeMasteryBand(row.mastery_band),
        lastPractisedAt: row.last_practised_at ?? null,
      };
    })
    .sort(compareSubtopicProgressRows);
}

async function fetchPracticeStatsRequiredAreaProgress(
  supabase: PracticeStatsClient,
  userId: string,
): Promise<PracticeStatsRequiredAreaRow[]> {
  const { data, error } = await supabase
    .from("user_required_area_progress")
    .select(
      "subtopic_id, required_area, times_tested, times_present, times_partial, times_absent, mastery_ratio, mastery_band, last_practised_at",
    )
    .eq("user_id", userId);

  if (error) {
    throw new Error(`Failed to load required area progress: ${error.message}`);
  }

  const rows = (data ?? []) as UserRequiredAreaProgressRow[];
  const subtopicLookup = await fetchSubtopicLookup(
    supabase,
    rows.map((row) => row.subtopic_id),
  );

  return rows
    .map((row) => {
      const subtopicId = toNumericId(row.subtopic_id);
      const subtopic = subtopicLookup.get(subtopicId);

      return {
        subtopicId,
        subtopicCode: subtopic?.code ?? null,
        subtopicName: subtopic?.name ?? `Subtopic ${subtopicId}`,
        requiredArea: row.required_area,
        requiredAreaLabel: formatRequiredAreaLabel(row.required_area),
        timesTested: row.times_tested ?? 0,
        timesPresent: row.times_present ?? 0,
        timesPartial: row.times_partial ?? 0,
        timesAbsent: row.times_absent ?? 0,
        masteryRatio: row.mastery_ratio ?? 0,
        masteryBand: normalizeMasteryBand(row.mastery_band),
        lastPractisedAt: row.last_practised_at ?? null,
      };
    })
    .sort(compareRequiredAreaProgressRows);
}

async function fetchPracticeStatsRecentAttempts(
  supabase: PracticeStatsClient,
  userId: string,
): Promise<PracticeStatsRecentAttemptRow[]> {
  const { data, error } = await supabase
    .from("generated_question_attempts")
    .select(
      "generated_question_id, subtopic_id, attempt_number, score, max_score, created_at",
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    throw new Error(`Failed to load recent attempts: ${error.message}`);
  }

  const rows = (data ?? []) as GeneratedQuestionAttemptRow[];
  const [questionLookup, subtopicLookup] = await Promise.all([
    fetchGeneratedQuestionLookup(
      supabase,
      rows.map((row) => row.generated_question_id),
    ),
    fetchSubtopicLookup(
      supabase,
      rows.map((row) => row.subtopic_id),
    ),
  ]);

  return rows.map((row) => {
    const generatedQuestionId = toNumericId(row.generated_question_id);
    const subtopicId = toNumericId(row.subtopic_id);
    const question = questionLookup.get(generatedQuestionId);
    const subtopic = subtopicLookup.get(subtopicId);

    return {
      generatedQuestionId,
      questionText: question?.question_text ?? `Question ${generatedQuestionId}`,
      subtopicId,
      subtopicCode: subtopic?.code ?? null,
      subtopicName: subtopic?.name ?? `Subtopic ${subtopicId}`,
      attemptNumber: row.attempt_number,
      score: row.score,
      maxScore: row.max_score,
      createdAt: row.created_at ?? null,
    };
  });
}

async function fetchPracticeStatsRecentSkippedQuestions(
  supabase: PracticeStatsClient,
  userId: string,
): Promise<PracticeStatsSkippedQuestionRow[]> {
  if (userQuestionProgressSkipColumnsAvailable === false) {
    return [];
  }

  const { data, error } = await supabase
    .from("user_question_progress")
    .select(
      "generated_question_id, subtopic_id, attempts_total, times_skipped, last_skipped_at",
    )
    .eq("user_id", userId)
    .gt("times_skipped", 0)
    .not("last_skipped_at", "is", null)
    .order("last_skipped_at", { ascending: false })
    .limit(10);

  if (error) {
    if (isMissingUserQuestionProgressSkipColumnError(error)) {
      userQuestionProgressSkipColumnsAvailable = false;
      console.warn(
        "[practice-stats] Skip tracking columns unavailable on user_question_progress",
      );
      return [];
    }

    throw new Error(`Failed to load recent skipped questions: ${error.message}`);
  }

  userQuestionProgressSkipColumnsAvailable = true;

  const rows = (data ?? []) as UserQuestionProgressRow[];
  const [questionLookup, subtopicLookup] = await Promise.all([
    fetchGeneratedQuestionLookup(
      supabase,
      rows.map((row) => row.generated_question_id),
    ),
    fetchSubtopicLookup(
      supabase,
      rows.map((row) => row.subtopic_id),
    ),
  ]);

  return sortRecentSkippedQuestionRows(
    rows.map((row) => {
      const generatedQuestionId = toNumericId(row.generated_question_id);
      const subtopicId = toNumericId(row.subtopic_id);
      const question = questionLookup.get(generatedQuestionId);
      const subtopic = subtopicLookup.get(subtopicId);

      return {
        generatedQuestionId,
        questionText: question?.question_text ?? `Question ${generatedQuestionId}`,
        subtopicId,
        subtopicCode: subtopic?.code ?? null,
        subtopicName: subtopic?.name ?? `Subtopic ${subtopicId}`,
        attemptsTotal: row.attempts_total ?? 0,
        skippedAt: row.last_skipped_at ?? null,
      };
    }),
  );
}

async function fetchUserQuestionProgressRowsForStats({
  supabase,
  userId,
}: {
  supabase: PracticeStatsClient;
  userId: string;
}) {
  const includeSkipColumns = userQuestionProgressSkipColumnsAvailable !== false;
  const { data, error } = await supabase
    .from("user_question_progress")
    .select(buildUserQuestionProgressStatsSelect(includeSkipColumns))
    .eq("user_id", userId);

  if (error) {
    if (
      includeSkipColumns &&
      isMissingUserQuestionProgressSkipColumnError(error)
    ) {
      userQuestionProgressSkipColumnsAvailable = false;
      console.warn(
        "[practice-stats] Skip tracking columns unavailable on user_question_progress",
      );

      return fetchUserQuestionProgressRowsForStats({ supabase, userId });
    }

    throw new Error(`Failed to load practice stats summary: ${error.message}`);
  }

  if (includeSkipColumns) {
    userQuestionProgressSkipColumnsAvailable = true;
  }

  return (data ?? []).map((row) =>
    normalizeUserQuestionProgressRow(row as Partial<UserQuestionProgressRow>),
  );
}

async function fetchSubtopicLookup(
  supabase: PracticeStatsClient,
  subtopicIds: Array<number | string>,
) {
  const normalizedIds = uniqueNumericIds(subtopicIds);

  if (normalizedIds.length === 0) {
    return new Map<number, SubtopicLookupRow>();
  }

  const { data, error } = await supabase
    .from("subtopics")
    .select("id, code, name")
    .in("id", normalizedIds);

  if (error) {
    throw new Error(`Failed to load subtopic lookup: ${error.message}`);
  }

  const rows = (data ?? []) as SubtopicLookupRow[];

  return new Map(rows.map((row) => [toNumericId(row.id), row]));
}

async function fetchGeneratedQuestionLookup(
  supabase: PracticeStatsClient,
  generatedQuestionIds: Array<number | string>,
) {
  const normalizedIds = uniqueNumericIds(generatedQuestionIds);

  if (normalizedIds.length === 0) {
    return new Map<number, GeneratedQuestionLookupRow>();
  }

  const { data, error } = await supabase
    .from("generated_questions")
    .select("id, question_text")
    .in("id", normalizedIds);

  if (error) {
    throw new Error(`Failed to load generated question lookup: ${error.message}`);
  }

  const rows = (data ?? []) as GeneratedQuestionLookupRow[];

  return new Map(rows.map((row) => [toNumericId(row.id), row]));
}

function getMostRecentlyPractisedSubtopic(
  rows: PracticeStatsSubtopicRow[],
): PracticeStatsSubtopicRow | null {
  if (rows.length === 0) {
    return null;
  }

  return [...rows].sort((left, right) => {
    const leftTimestamp = left.lastPractisedAt ?? "";
    const rightTimestamp = right.lastPractisedAt ?? "";

    if (leftTimestamp !== rightTimestamp) {
      return rightTimestamp.localeCompare(leftTimestamp);
    }

    return left.subtopicName.localeCompare(right.subtopicName);
  })[0]!;
}

function compareSubtopicProgressRows(
  left: PracticeStatsSubtopicRow,
  right: PracticeStatsSubtopicRow,
) {
  if (left.averageScoreRatio !== right.averageScoreRatio) {
    return left.averageScoreRatio - right.averageScoreRatio;
  }

  const leftTimestamp = left.lastPractisedAt ?? "";
  const rightTimestamp = right.lastPractisedAt ?? "";

  if (leftTimestamp !== rightTimestamp) {
    return rightTimestamp.localeCompare(leftTimestamp);
  }

  return left.subtopicName.localeCompare(right.subtopicName);
}

function compareRequiredAreaProgressRows(
  left: PracticeStatsRequiredAreaRow,
  right: PracticeStatsRequiredAreaRow,
) {
  if (left.masteryRatio !== right.masteryRatio) {
    return left.masteryRatio - right.masteryRatio;
  }

  if (left.timesTested !== right.timesTested) {
    return right.timesTested - left.timesTested;
  }

  const requiredAreaComparison = left.requiredArea.localeCompare(right.requiredArea);

  if (requiredAreaComparison !== 0) {
    return requiredAreaComparison;
  }

  return left.subtopicName.localeCompare(right.subtopicName);
}

function normalizeMasteryBand(value: string | null): PracticeMasteryBand | null {
  if (value === "weak" || value === "developing" || value === "strong") {
    return value;
  }

  return null;
}

function uniqueNumericIds(values: Array<number | string>) {
  return Array.from(new Set(values.map((value) => toNumericId(value))));
}

function toNumericId(value: number | string) {
  if (typeof value === "number") {
    return value;
  }

  const parsedValue = Number(value);

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    throw new Error(`Invalid numeric identifier "${value}"`);
  }

  return parsedValue;
}

function roundMetric(value: number) {
  return Number(value.toFixed(4));
}

export function buildPracticeStatsSummary(rows: UserQuestionProgressRow[]) {
  const attemptedRows = rows.filter((row) => (row.attempts_total ?? 0) > 0);
  const completedRows = rows.filter((row) => row.completed === true);
  const skippedRows = rows.filter((row) => (row.times_skipped ?? 0) > 0);
  const totalBestScore = attemptedRows.reduce(
    (sum, row) => sum + (row.best_score ?? 0),
    0,
  );
  const totalMaxScore = attemptedRows.reduce(
    (sum, row) => sum + (row.max_score ?? 0),
    0,
  );
  const totalAttempts = attemptedRows.reduce(
    (sum, row) => sum + (row.attempts_total ?? 0),
    0,
  );
  const completedAttempts = completedRows.reduce(
    (sum, row) => sum + (row.attempts_total ?? 0),
    0,
  );

  return {
    questionsAttempted: attemptedRows.length,
    questionsCompleted: completedRows.length,
    questionsSkipped: skippedRows.length,
    averageScoreRatio:
      totalMaxScore > 0 ? roundMetric(totalBestScore / totalMaxScore) : 0,
    averageAttemptsPerQuestion:
      attemptedRows.length > 0
        ? roundMetric(totalAttempts / attemptedRows.length)
        : 0,
    averageAttemptsToCompletion:
      completedRows.length > 0
        ? roundMetric(completedAttempts / completedRows.length)
        : null,
  };
}

export function sortRecentSkippedQuestionRows(
  rows: PracticeStatsSkippedQuestionRow[],
) {
  return [...rows].sort((left, right) => {
    const leftTimestamp = left.skippedAt ?? "";
    const rightTimestamp = right.skippedAt ?? "";

    if (leftTimestamp !== rightTimestamp) {
      return rightTimestamp.localeCompare(leftTimestamp);
    }

    return left.questionText.localeCompare(right.questionText);
  });
}

function buildUserQuestionProgressStatsSelect(includeSkipColumns: boolean) {
  const selectColumns = [
    "generated_question_id",
    "subtopic_id",
    "attempts_total",
    "best_score",
    "completed",
    "max_score",
  ];

  if (includeSkipColumns) {
    selectColumns.push("times_skipped", "last_skipped_at");
  }

  return selectColumns.join(", ");
}

function normalizeUserQuestionProgressRow(
  row: Partial<UserQuestionProgressRow>,
): UserQuestionProgressRow {
  return {
    generated_question_id: row.generated_question_id ?? 0,
    subtopic_id: row.subtopic_id ?? 0,
    attempts_total: row.attempts_total ?? null,
    best_score: row.best_score ?? null,
    completed: row.completed ?? null,
    max_score: row.max_score ?? null,
    times_skipped: row.times_skipped ?? null,
    last_skipped_at: row.last_skipped_at ?? null,
  };
}

function isMissingUserQuestionProgressSkipColumnError(caughtError: unknown) {
  return (
    isMissingColumnError(caughtError, "times_skipped") ||
    isMissingColumnError(caughtError, "last_skipped_at")
  );
}
