import { formatRequiredAreaLabel } from "@/lib/required-area-display";
import { createClient } from "@/utils/supabase/server";

type PracticeStatsClient = Awaited<ReturnType<typeof createClient>>;

type PracticeMasteryBand = "weak" | "developing" | "strong";

type UserQuestionProgressRow = {
  attempts_total: number | null;
  best_score: number | null;
  completed: boolean | null;
  max_score: number | null;
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

export type PracticeStatsSummary = {
  questionsAttempted: number;
  questionsCompleted: number;
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
  ] = await Promise.all([
    fetchPracticeStatsSummary(supabase, userId),
    fetchPracticeStatsSubtopicProgress(supabase, userId),
    fetchPracticeStatsRequiredAreaProgress(supabase, userId),
    fetchPracticeStatsRecentAttempts(supabase, userId),
  ]);

  return {
    summary,
    subtopicProgress,
    requiredAreaProgress,
    recentAttempts,
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
  const { data, error } = await supabase
    .from("user_question_progress")
    .select("attempts_total, best_score, completed, max_score")
    .eq("user_id", userId);

  if (error) {
    throw new Error(`Failed to load practice stats summary: ${error.message}`);
  }

  const rows = (data ?? []) as UserQuestionProgressRow[];
  const questionsAttempted = rows.length;
  const completedRows = rows.filter((row) => row.completed === true);
  const totalBestScore = rows.reduce((sum, row) => sum + (row.best_score ?? 0), 0);
  const totalMaxScore = rows.reduce((sum, row) => sum + (row.max_score ?? 0), 0);
  const totalAttempts = rows.reduce(
    (sum, row) => sum + (row.attempts_total ?? 0),
    0,
  );
  const completedAttempts = completedRows.reduce(
    (sum, row) => sum + (row.attempts_total ?? 0),
    0,
  );

  return {
    questionsAttempted,
    questionsCompleted: completedRows.length,
    averageScoreRatio:
      totalMaxScore > 0 ? roundMetric(totalBestScore / totalMaxScore) : 0,
    averageAttemptsPerQuestion:
      questionsAttempted > 0 ? roundMetric(totalAttempts / questionsAttempted) : 0,
    averageAttemptsToCompletion:
      completedRows.length > 0
        ? roundMetric(completedAttempts / completedRows.length)
        : null,
  };
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
