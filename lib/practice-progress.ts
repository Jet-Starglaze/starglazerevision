import type { PracticeRubricAssessment } from "./mock-biology-practice-api.ts";
import {
  toNumericId,
  type GeneratedMarkingRubricPoint,
  type SupabaseServerClient,
} from "./generated-practice-content.ts";
import {
  hasReachedPracticeCompletionThreshold,
} from "./practice-completion.ts";
import { isMissingColumnError } from "./supabase-errors.ts";

export type GeneratedQuestionAttemptRow = {
  generated_question_id: number | string;
  subtopic_id: number | string;
  attempt_number: number;
  score: number;
  max_score: number;
  created_at: string | null;
};

export type ExistingQuestionProgressRow = {
  attempts_total: number | null;
  best_score: number | null;
  max_score: number | null;
  last_score: number | null;
  completed: boolean | null;
  times_seen: number | null;
  completed_at: string | null;
  last_attempted_at: string | null;
  times_skipped: number | null;
  last_skipped_at: string | null;
};

export type UserQuestionProgressSnapshot = {
  generated_question_id: number | string;
  best_score: number | null;
  max_score: number | null;
  last_attempted_at: string | null;
};

type SubtopicQuestionProgressRow = {
  generated_question_id: number | string;
  completed: boolean | null;
  last_attempted_at: string | null;
  last_skipped_at: string | null;
};

export type UserQuestionProgressUpdate = {
  user_id: string;
  generated_question_id: number;
  subtopic_id: number;
  attempts_total: number;
  best_score: number;
  max_score: number;
  last_score: number;
  completed: boolean;
  completed_at: string | null;
  last_attempted_at: string | null;
  times_seen: number;
  times_skipped: number;
  last_skipped_at: string | null;
};

export type UserSubtopicProgressUpdate = {
  user_id: string;
  subtopic_id: number;
  questions_seen: number;
  questions_completed: number;
  total_attempts: number;
  total_score: number;
  total_max_score: number;
  avg_score_ratio: number;
  avg_attempts_per_question: number;
  mastery_band: PracticeMasteryBand;
  last_practised_at: string;
};

type QuestionAttemptSummary = {
  attemptsTotal: number;
  bestScore: number;
  latestAttemptAt: string | null;
  latestMaxScore: number;
};

type UserRequiredAreaProgressRow = {
  required_area: string;
  times_tested: number | null;
  times_present: number | null;
  times_partial: number | null;
  times_absent: number | null;
};

type UserRequiredAreaProgressUpdate = {
  user_id: string;
  subtopic_id: number;
  required_area: string;
  times_tested: number;
  times_present: number;
  times_partial: number;
  times_absent: number;
  mastery_ratio: number;
  mastery_band: PracticeMasteryBand;
  last_practised_at: string;
};

type RequiredAreaProgressIncrement = {
  requiredArea: string;
  timesTested: number;
  timesPresent: number;
  timesPartial: number;
  timesAbsent: number;
};

export type PracticeMasteryBand = "weak" | "developing" | "strong";
let userQuestionProgressSkipColumnsAvailable: boolean | null = null;

export function resetPracticeProgressSkipColumnsAvailabilityForTests() {
  userQuestionProgressSkipColumnsAvailable = null;
}

export async function getAuthenticatedUserId(
  supabase: SupabaseServerClient,
): Promise<string | null> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw new Error(`Failed to load authenticated user: ${error.message}`);
  }

  return user?.id ?? null;
}
export {
  getPracticeCompletionThreshold,
  hasReachedPracticeCompletionThreshold,
} from "./practice-completion.ts";

export async function fetchUserQuestionProgressForQuestions(
  supabase: SupabaseServerClient,
  userId: string,
  generatedQuestionIds: Array<number | string>,
): Promise<UserQuestionProgressSnapshot[]> {
  const normalizedQuestionIds = uniqueNumericIds(generatedQuestionIds);

  if (normalizedQuestionIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("user_question_progress")
    .select("generated_question_id, best_score, max_score, last_attempted_at")
    .eq("user_id", userId)
    .in("generated_question_id", normalizedQuestionIds);

  if (error) {
    throw new Error(`Failed to load user question progress: ${error.message}`);
  }

  return (data ?? []) as UserQuestionProgressSnapshot[];
}

export async function recordGeneratedQuestionAttemptAndProgress({
  supabase,
  userId,
  generatedQuestionId,
  subtopicId,
  attemptNumber,
  score,
  maxScore,
  answerText,
}: {
  supabase: SupabaseServerClient;
  userId: string;
  generatedQuestionId: number | string;
  subtopicId: number | string;
  attemptNumber: number | null;
  score: number;
  maxScore: number;
  answerText: string;
}) {
  const normalizedQuestionId = toNumericId(generatedQuestionId);
  const normalizedSubtopicId = toNumericId(subtopicId);
  const resolvedAttemptNumber =
    attemptNumber ??
    (await getNextAttemptNumber(supabase, userId, normalizedQuestionId));

  await ensureAttemptRecorded({
    supabase,
    userId,
    generatedQuestionId: normalizedQuestionId,
    subtopicId: normalizedSubtopicId,
    attemptNumber: resolvedAttemptNumber,
    score,
    maxScore,
    answerText,
  });

  const [existingQuestionProgress, questionAttempts] = await Promise.all([
    fetchExistingQuestionProgress(
      supabase,
      userId,
      normalizedQuestionId,
    ),
    fetchQuestionAttempts(supabase, userId, normalizedQuestionId),
  ]);

  const questionProgressUpdate = buildUserQuestionProgressUpdate({
    userId,
    generatedQuestionId: normalizedQuestionId,
    subtopicId: normalizedSubtopicId,
    maxScore,
    existingQuestionProgress,
    questionAttempts,
  });

  await upsertUserQuestionProgress(supabase, questionProgressUpdate);

  const [subtopicAttempts, subtopicQuestionProgress] = await Promise.all([
    fetchSubtopicAttempts(supabase, userId, normalizedSubtopicId),
    fetchSubtopicQuestionProgress(supabase, userId, normalizedSubtopicId),
  ]);
  const subtopicProgressUpdate = buildUserSubtopicProgressUpdate({
    userId,
    subtopicId: normalizedSubtopicId,
    attempts: subtopicAttempts,
    questionProgressRows: subtopicQuestionProgress,
  });

  await upsertUserSubtopicProgress(supabase, subtopicProgressUpdate);
}

export async function recordSkippedQuestionProgress({
  supabase,
  userId,
  generatedQuestionId,
  subtopicId,
  maxScore,
}: {
  supabase: SupabaseServerClient;
  userId: string;
  generatedQuestionId: number | string;
  subtopicId: number | string;
  maxScore: number;
}) {
  const normalizedQuestionId = toNumericId(generatedQuestionId);
  const normalizedSubtopicId = toNumericId(subtopicId);
  const [existingQuestionProgress, questionAttempts] = await Promise.all([
    fetchExistingQuestionProgress(supabase, userId, normalizedQuestionId),
    fetchQuestionAttempts(supabase, userId, normalizedQuestionId),
  ]);

  if (userQuestionProgressSkipColumnsAvailable === false) {
    throw new Error(
      "Skip tracking columns are unavailable on user_question_progress.",
    );
  }

  const questionProgressUpdate = buildUserQuestionProgressUpdate({
    userId,
    generatedQuestionId: normalizedQuestionId,
    subtopicId: normalizedSubtopicId,
    maxScore,
    existingQuestionProgress,
    questionAttempts,
    skippedAt: new Date().toISOString(),
  });

  await upsertUserQuestionProgress(supabase, questionProgressUpdate);

  const [subtopicAttempts, subtopicQuestionProgress] = await Promise.all([
    fetchSubtopicAttempts(supabase, userId, normalizedSubtopicId),
    fetchSubtopicQuestionProgress(supabase, userId, normalizedSubtopicId),
  ]);
  const subtopicProgressUpdate = buildUserSubtopicProgressUpdate({
    userId,
    subtopicId: normalizedSubtopicId,
    attempts: subtopicAttempts,
    questionProgressRows: subtopicQuestionProgress,
  });

  await upsertUserSubtopicProgress(supabase, subtopicProgressUpdate);
}

export async function recordUserRequiredAreaProgress({
  supabase,
  userId,
  subtopicId,
  rubricPoints,
  rubricAssessment,
}: {
  supabase: SupabaseServerClient;
  userId: string;
  subtopicId: number | string;
  rubricPoints: GeneratedMarkingRubricPoint[];
  rubricAssessment: PracticeRubricAssessment[];
}) {
  const normalizedSubtopicId = toNumericId(subtopicId);
  const requiredAreaIncrements = buildRequiredAreaProgressIncrements(
    rubricPoints,
    rubricAssessment,
  );

  if (requiredAreaIncrements.length === 0) {
    return;
  }

  const requiredAreas = requiredAreaIncrements.map(
    (increment) => increment.requiredArea,
  );
  const lastPractisedAt = new Date().toISOString();

  await ensureRequiredAreaProgressRowsExist({
    supabase,
    userId,
    subtopicId: normalizedSubtopicId,
    requiredAreas,
    lastPractisedAt,
  });

  const existingProgressRows = await fetchRequiredAreaProgressRows({
    supabase,
    userId,
    subtopicId: normalizedSubtopicId,
    requiredAreas,
  });
  const existingProgressByRequiredArea = new Map(
    existingProgressRows.map((row) => [row.required_area, row]),
  );
  const progressUpdates = requiredAreaIncrements.map((increment) => {
    const existingProgress =
      existingProgressByRequiredArea.get(increment.requiredArea) ?? null;
    const timesTested =
      (existingProgress?.times_tested ?? 0) + increment.timesTested;
    const timesPresent =
      (existingProgress?.times_present ?? 0) + increment.timesPresent;
    const timesPartial =
      (existingProgress?.times_partial ?? 0) + increment.timesPartial;
    const timesAbsent =
      (existingProgress?.times_absent ?? 0) + increment.timesAbsent;
    const masteryRatio =
      timesTested > 0 ? roundMetric(timesPresent / timesTested) : 0;

    return {
      user_id: userId,
      subtopic_id: normalizedSubtopicId,
      required_area: increment.requiredArea,
      times_tested: timesTested,
      times_present: timesPresent,
      times_partial: timesPartial,
      times_absent: timesAbsent,
      mastery_ratio: masteryRatio,
      mastery_band: getRequiredAreaMasteryBand(masteryRatio),
      last_practised_at: lastPractisedAt,
    };
  });

  const { error } = await supabase.from("user_required_area_progress").upsert(
    progressUpdates,
    {
      onConflict: "user_id,subtopic_id,required_area",
    },
  );

  if (error) {
    throw new Error(`Failed to upsert required area progress: ${error.message}`);
  }
}

async function getNextAttemptNumber(
  supabase: SupabaseServerClient,
  userId: string,
  generatedQuestionId: number,
) {
  const { data, error } = await supabase
    .from("generated_question_attempts")
    .select("attempt_number")
    .eq("user_id", userId)
    .eq("generated_question_id", generatedQuestionId)
    .order("attempt_number", { ascending: false })
    .limit(1);

  if (error) {
    throw new Error(`Failed to load next attempt number: ${error.message}`);
  }

  return ((data?.[0]?.attempt_number as number | undefined) ?? 0) + 1;
}

async function ensureAttemptRecorded({
  supabase,
  userId,
  generatedQuestionId,
  subtopicId,
  attemptNumber,
  score,
  maxScore,
  answerText,
}: {
  supabase: SupabaseServerClient;
  userId: string;
  generatedQuestionId: number;
  subtopicId: number;
  attemptNumber: number;
  score: number;
  maxScore: number;
  answerText: string;
}) {
  const { data: existingRows, error: existingError } = await supabase
    .from("generated_question_attempts")
    .select("score, max_score, answer_text")
    .eq("user_id", userId)
    .eq("generated_question_id", generatedQuestionId)
    .eq("attempt_number", attemptNumber)
    .limit(1);

  if (existingError) {
    throw new Error(`Failed to load existing attempt: ${existingError.message}`);
  }

  const existingAttempt = existingRows?.[0] ?? null;

  if (existingAttempt) {
    if (
      existingAttempt.score !== score ||
      existingAttempt.max_score !== maxScore ||
      existingAttempt.answer_text !== answerText
    ) {
      console.warn("[practice-progress] Reused existing generated attempt", {
        userId,
        generatedQuestionId,
        attemptNumber,
      });
    }

    return;
  }

  const { error } = await supabase.from("generated_question_attempts").insert({
    user_id: userId,
    generated_question_id: generatedQuestionId,
    subtopic_id: subtopicId,
    attempt_number: attemptNumber,
    score,
    max_score: maxScore,
    answer_text: answerText,
  });

  if (error) {
    throw new Error(`Failed to insert generated attempt: ${error.message}`);
  }
}

async function fetchExistingQuestionProgress(
  supabase: SupabaseServerClient,
  userId: string,
  generatedQuestionId: number,
) {
  const includeSkipColumns = userQuestionProgressSkipColumnsAvailable !== false;
  const { data, error } = await supabase
    .from("user_question_progress")
    .select(buildExistingQuestionProgressSelect(includeSkipColumns))
    .eq("user_id", userId)
    .eq("generated_question_id", generatedQuestionId)
    .maybeSingle();

  if (error) {
    if (
      includeSkipColumns &&
      isMissingUserQuestionProgressSkipColumnError(error)
    ) {
      userQuestionProgressSkipColumnsAvailable = false;
      console.warn(
        "[practice-progress] Skip tracking columns unavailable on user_question_progress",
      );

      return fetchExistingQuestionProgress(supabase, userId, generatedQuestionId);
    }

    throw new Error(`Failed to load question progress: ${error.message}`);
  }

  if (includeSkipColumns) {
    userQuestionProgressSkipColumnsAvailable = true;
  }

  return normalizeExistingQuestionProgressRow(
    data as Partial<ExistingQuestionProgressRow> | null,
  );
}

async function fetchQuestionAttempts(
  supabase: SupabaseServerClient,
  userId: string,
  generatedQuestionId: number,
) {
  const { data, error } = await supabase
    .from("generated_question_attempts")
    .select(
      "generated_question_id, subtopic_id, attempt_number, score, max_score, created_at",
    )
    .eq("user_id", userId)
    .eq("generated_question_id", generatedQuestionId)
    .order("attempt_number", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to load question attempts: ${error.message}`);
  }

  return (data ?? []) as GeneratedQuestionAttemptRow[];
}

async function fetchSubtopicAttempts(
  supabase: SupabaseServerClient,
  userId: string,
  subtopicId: number,
) {
  const { data, error } = await supabase
    .from("generated_question_attempts")
    .select(
      "generated_question_id, subtopic_id, attempt_number, score, max_score, created_at",
    )
    .eq("user_id", userId)
    .eq("subtopic_id", subtopicId)
    .order("attempt_number", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to load subtopic attempts: ${error.message}`);
  }

  return (data ?? []) as GeneratedQuestionAttemptRow[];
}

async function fetchSubtopicQuestionProgress(
  supabase: SupabaseServerClient,
  userId: string,
  subtopicId: number,
) {
  const includeSkipColumns = userQuestionProgressSkipColumnsAvailable !== false;
  const { data, error } = await supabase
    .from("user_question_progress")
    .select(buildSubtopicQuestionProgressSelect(includeSkipColumns))
    .eq("user_id", userId)
    .eq("subtopic_id", subtopicId);

  if (error) {
    if (
      includeSkipColumns &&
      isMissingUserQuestionProgressSkipColumnError(error)
    ) {
      userQuestionProgressSkipColumnsAvailable = false;
      console.warn(
        "[practice-progress] Skip tracking columns unavailable on user_question_progress",
      );

      return fetchSubtopicQuestionProgress(supabase, userId, subtopicId);
    }

    throw new Error(`Failed to load subtopic question progress: ${error.message}`);
  }

  if (includeSkipColumns) {
    userQuestionProgressSkipColumnsAvailable = true;
  }

  return (data ?? []).map((row) => normalizeSubtopicQuestionProgressRow(row));
}

export function buildUserQuestionProgressUpdate({
  userId,
  generatedQuestionId,
  subtopicId,
  maxScore,
  existingQuestionProgress,
  questionAttempts,
  skippedAt = null,
}: {
  userId: string;
  generatedQuestionId: number;
  subtopicId: number;
  maxScore: number;
  existingQuestionProgress: ExistingQuestionProgressRow | null;
  questionAttempts: GeneratedQuestionAttemptRow[];
  skippedAt?: string | null;
}): UserQuestionProgressUpdate {
  const orderedAttempts = [...questionAttempts].sort(compareAttempts);
  const latestAttempt = orderedAttempts[orderedAttempts.length - 1] ?? null;
  const attemptsTotal =
    orderedAttempts.length > 0
      ? orderedAttempts.length
      : existingQuestionProgress?.attempts_total ?? 0;
  const bestScore =
    orderedAttempts.length > 0
      ? orderedAttempts.reduce((currentBest, attempt) => {
          return Math.max(currentBest, attempt.score);
        }, 0)
      : existingQuestionProgress?.best_score ?? 0;
  const effectiveMaxScore = latestAttempt?.max_score ?? maxScore;
  const isCompleted = hasReachedPracticeCompletionThreshold(
    bestScore,
    effectiveMaxScore,
  );
  const firstCompletedAttempt = orderedAttempts.find((attempt) =>
    hasReachedPracticeCompletionThreshold(attempt.score, attempt.max_score),
  );

  return {
    user_id: userId,
    generated_question_id: generatedQuestionId,
    subtopic_id: subtopicId,
    attempts_total: attemptsTotal,
    best_score: bestScore,
    max_score: effectiveMaxScore,
    last_score: latestAttempt?.score ?? existingQuestionProgress?.last_score ?? 0,
    completed: isCompleted,
    completed_at: isCompleted
      ? existingQuestionProgress?.completed_at ??
        firstCompletedAttempt?.created_at ??
        null
      : null,
    last_attempted_at:
      latestAttempt?.created_at ?? existingQuestionProgress?.last_attempted_at ?? null,
    times_seen: Math.max(existingQuestionProgress?.times_seen ?? 0, 1),
    times_skipped:
      (existingQuestionProgress?.times_skipped ?? 0) + (skippedAt ? 1 : 0),
    last_skipped_at: skippedAt ?? existingQuestionProgress?.last_skipped_at ?? null,
  };
}

async function upsertUserQuestionProgress(
  supabase: SupabaseServerClient,
  progressUpdate: UserQuestionProgressUpdate,
) {
  const includeSkipColumns = userQuestionProgressSkipColumnsAvailable !== false;
  const { error } = await supabase.from("user_question_progress").upsert(
    buildUserQuestionProgressUpsertPayload(progressUpdate, includeSkipColumns),
    {
      onConflict: "user_id,generated_question_id",
    },
  );

  if (error) {
    if (
      includeSkipColumns &&
      isMissingUserQuestionProgressSkipColumnError(error)
    ) {
      userQuestionProgressSkipColumnsAvailable = false;
      console.warn(
        "[practice-progress] Skip tracking columns unavailable on user_question_progress",
      );

      await upsertUserQuestionProgress(supabase, progressUpdate);
      return;
    }

    throw new Error(`Failed to upsert question progress: ${error.message}`);
  }

  if (includeSkipColumns) {
    userQuestionProgressSkipColumnsAvailable = true;
  }
}

export function buildUserSubtopicProgressUpdate({
  userId,
  subtopicId,
  attempts,
  questionProgressRows,
}: {
  userId: string;
  subtopicId: number;
  attempts: GeneratedQuestionAttemptRow[];
  questionProgressRows: SubtopicQuestionProgressRow[];
}): UserSubtopicProgressUpdate {
  const attemptsByQuestion = new Map<number, QuestionAttemptSummary>();
  let totalScore = 0;
  let totalMaxScore = 0;
  let lastPractisedAt = attempts[0]?.created_at ?? new Date().toISOString();

  for (const attempt of attempts) {
    const questionId = toNumericId(attempt.generated_question_id);
    const existingSummary = attemptsByQuestion.get(questionId);

    totalScore += attempt.score;
    totalMaxScore += attempt.max_score;

    if (
      attempt.created_at &&
      (!lastPractisedAt || attempt.created_at > lastPractisedAt)
    ) {
      lastPractisedAt = attempt.created_at;
    }

    if (existingSummary) {
      existingSummary.attemptsTotal += 1;
      existingSummary.bestScore = Math.max(existingSummary.bestScore, attempt.score);
      existingSummary.latestMaxScore = attempt.max_score;
      existingSummary.latestAttemptAt =
        maxIsoTimestamp(existingSummary.latestAttemptAt, attempt.created_at);
      continue;
    }

    attemptsByQuestion.set(questionId, {
      attemptsTotal: 1,
      bestScore: attempt.score,
      latestAttemptAt: attempt.created_at,
      latestMaxScore: attempt.max_score,
    });
  }

  const questionSummaries = [...attemptsByQuestion.values()];
  const questionsSeen =
    questionProgressRows.length > 0 ? questionProgressRows.length : questionSummaries.length;
  const questionsCompleted =
    questionProgressRows.length > 0
      ? questionProgressRows.reduce((count, questionProgress) => {
          return count + (questionProgress.completed === true ? 1 : 0);
        }, 0)
      : questionSummaries.reduce((count, question) => {
          return (
            count +
            (hasReachedPracticeCompletionThreshold(
              question.bestScore,
              question.latestMaxScore,
            )
              ? 1
              : 0)
          );
        }, 0);
  const totalAttempts = attempts.length;
  const avgScoreRatio =
    totalMaxScore > 0 ? roundMetric(totalScore / totalMaxScore) : 0;
  const avgAttemptsPerQuestion =
    questionSummaries.length > 0
      ? roundMetric(totalAttempts / questionSummaries.length)
      : 0;
  const lastProgressActivityAt = questionProgressRows.reduce<string | null>(
    (currentLatest, questionProgress) => {
      return maxIsoTimestamp(
        maxIsoTimestamp(currentLatest, questionProgress.last_attempted_at),
        questionProgress.last_skipped_at,
      );
    },
    null,
  );

  return {
    user_id: userId,
    subtopic_id: subtopicId,
    questions_seen: questionsSeen,
    questions_completed: questionsCompleted,
    total_attempts: totalAttempts,
    total_score: totalScore,
    total_max_score: totalMaxScore,
    avg_score_ratio: avgScoreRatio,
    avg_attempts_per_question: avgAttemptsPerQuestion,
    mastery_band: getMasteryBand(avgScoreRatio),
    last_practised_at:
      maxIsoTimestamp(lastPractisedAt, lastProgressActivityAt) ??
      new Date().toISOString(),
  };
}

async function upsertUserSubtopicProgress(
  supabase: SupabaseServerClient,
  progressUpdate: UserSubtopicProgressUpdate,
) {
  const { error } = await supabase.from("user_subtopic_progress").upsert(
    progressUpdate,
    {
      onConflict: "user_id,subtopic_id",
    },
  );

  if (error) {
    throw new Error(`Failed to upsert subtopic progress: ${error.message}`);
  }
}

async function ensureRequiredAreaProgressRowsExist({
  supabase,
  userId,
  subtopicId,
  requiredAreas,
  lastPractisedAt,
}: {
  supabase: SupabaseServerClient;
  userId: string;
  subtopicId: number;
  requiredAreas: string[];
  lastPractisedAt: string;
}) {
  const baseRows: UserRequiredAreaProgressUpdate[] = requiredAreas.map(
    (requiredArea) => ({
      user_id: userId,
      subtopic_id: subtopicId,
      required_area: requiredArea,
      times_tested: 0,
      times_present: 0,
      times_partial: 0,
      times_absent: 0,
      mastery_ratio: 0,
      mastery_band: "weak",
      last_practised_at: lastPractisedAt,
    }),
  );

  const { error } = await supabase.from("user_required_area_progress").upsert(
    baseRows,
    {
      onConflict: "user_id,subtopic_id,required_area",
      ignoreDuplicates: true,
    },
  );

  if (error) {
    throw new Error(`Failed to create required area progress rows: ${error.message}`);
  }
}

async function fetchRequiredAreaProgressRows({
  supabase,
  userId,
  subtopicId,
  requiredAreas,
}: {
  supabase: SupabaseServerClient;
  userId: string;
  subtopicId: number;
  requiredAreas: string[];
}) {
  const { data, error } = await supabase
    .from("user_required_area_progress")
    .select(
      "required_area, times_tested, times_present, times_partial, times_absent",
    )
    .eq("user_id", userId)
    .eq("subtopic_id", subtopicId)
    .in("required_area", requiredAreas);

  if (error) {
    throw new Error(`Failed to load required area progress: ${error.message}`);
  }

  return (data ?? []) as UserRequiredAreaProgressRow[];
}

function getMasteryBand(avgScoreRatio: number): PracticeMasteryBand {
  if (avgScoreRatio < 0.5) {
    return "weak";
  }

  if (avgScoreRatio < 0.75) {
    return "developing";
  }

  return "strong";
}

function getRequiredAreaMasteryBand(
  masteryRatio: number,
): PracticeMasteryBand {
  if (masteryRatio < 0.4) {
    return "weak";
  }

  if (masteryRatio < 0.75) {
    return "developing";
  }

  return "strong";
}

function uniqueNumericIds(values: Array<number | string>) {
  return Array.from(new Set(values.map((value) => toNumericId(value))));
}

function buildRequiredAreaProgressIncrements(
  rubricPoints: GeneratedMarkingRubricPoint[],
  rubricAssessment: PracticeRubricAssessment[],
) {
  const incrementsByRequiredArea = new Map<string, RequiredAreaProgressIncrement>();

  rubricPoints.forEach((rubricPoint, index) => {
    const requiredArea = rubricPoint.requiredArea?.trim() ?? "";

    if (requiredArea.length === 0) {
      return;
    }

    const assessment = rubricAssessment[index];

    if (!assessment) {
      return;
    }

    const currentIncrement = incrementsByRequiredArea.get(requiredArea) ?? {
      requiredArea,
      timesTested: 0,
      timesPresent: 0,
      timesPartial: 0,
      timesAbsent: 0,
    };

    currentIncrement.timesTested += 1;

    if (assessment.status === "present") {
      currentIncrement.timesPresent += 1;
    } else if (assessment.status === "partial") {
      currentIncrement.timesPartial += 1;
    } else {
      currentIncrement.timesAbsent += 1;
    }

    incrementsByRequiredArea.set(requiredArea, currentIncrement);
  });

  return [...incrementsByRequiredArea.values()];
}

function compareAttempts(
  left: GeneratedQuestionAttemptRow,
  right: GeneratedQuestionAttemptRow,
) {
  if (left.attempt_number !== right.attempt_number) {
    return left.attempt_number - right.attempt_number;
  }

  const leftCreatedAt = left.created_at ?? "";
  const rightCreatedAt = right.created_at ?? "";

  return leftCreatedAt.localeCompare(rightCreatedAt);
}

function maxIsoTimestamp(left: string | null, right: string | null) {
  if (!left) {
    return right;
  }

  if (!right) {
    return left;
  }

  return left > right ? left : right;
}

function roundMetric(value: number) {
  return Number(value.toFixed(4));
}

function buildExistingQuestionProgressSelect(includeSkipColumns: boolean) {
  const selectColumns = [
    "attempts_total",
    "best_score",
    "max_score",
    "last_score",
    "completed",
    "times_seen",
    "completed_at",
    "last_attempted_at",
  ];

  if (includeSkipColumns) {
    selectColumns.push("times_skipped", "last_skipped_at");
  }

  return selectColumns.join(", ");
}

function buildSubtopicQuestionProgressSelect(includeSkipColumns: boolean) {
  const selectColumns = [
    "generated_question_id",
    "completed",
    "last_attempted_at",
  ];

  if (includeSkipColumns) {
    selectColumns.push("last_skipped_at");
  }

  return selectColumns.join(", ");
}

function buildUserQuestionProgressUpsertPayload(
  progressUpdate: UserQuestionProgressUpdate,
  includeSkipColumns: boolean,
) {
  if (includeSkipColumns) {
    return progressUpdate;
  }

  const { times_skipped, last_skipped_at, ...supportedColumns } = progressUpdate;
  void times_skipped;
  void last_skipped_at;
  return supportedColumns;
}

function normalizeExistingQuestionProgressRow(
  row: Partial<ExistingQuestionProgressRow> | null,
): ExistingQuestionProgressRow | null {
  if (!row) {
    return null;
  }

  return {
    attempts_total: row.attempts_total ?? null,
    best_score: row.best_score ?? null,
    max_score: row.max_score ?? null,
    last_score: row.last_score ?? null,
    completed: row.completed ?? null,
    times_seen: row.times_seen ?? null,
    completed_at: row.completed_at ?? null,
    last_attempted_at: row.last_attempted_at ?? null,
    times_skipped: row.times_skipped ?? null,
    last_skipped_at: row.last_skipped_at ?? null,
  };
}

function normalizeSubtopicQuestionProgressRow(row: unknown): SubtopicQuestionProgressRow {
  const normalizedRow = row as Partial<SubtopicQuestionProgressRow>;

  return {
    generated_question_id: normalizedRow.generated_question_id ?? 0,
    completed: normalizedRow.completed ?? null,
    last_attempted_at: normalizedRow.last_attempted_at ?? null,
    last_skipped_at: normalizedRow.last_skipped_at ?? null,
  };
}

function isMissingUserQuestionProgressSkipColumnError(caughtError: unknown) {
  return (
    isMissingColumnError(caughtError, "times_skipped") ||
    isMissingColumnError(caughtError, "last_skipped_at")
  );
}
