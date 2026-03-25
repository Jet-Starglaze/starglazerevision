import assert from "node:assert/strict";
import test from "node:test";

import {
  buildPracticeStatsSummary,
  fetchPracticeStats,
  resetPracticeStatsSkipColumnsAvailabilityForTests,
  sortRecentSkippedQuestionRows,
} from "./practice-stats.ts";
import { createMockSupabaseClient } from "./test-support/mock-supabase.ts";

test("practice stats summary tracks skipped questions separately from completed questions", () => {
  const summary = buildPracticeStatsSummary([
    {
      generated_question_id: 1,
      subtopic_id: 10,
      attempts_total: 2,
      best_score: 4,
      completed: true,
      max_score: 4,
      times_skipped: 0,
      last_skipped_at: null,
    },
    {
      generated_question_id: 2,
      subtopic_id: 10,
      attempts_total: 0,
      best_score: 0,
      completed: false,
      max_score: 4,
      times_skipped: 1,
      last_skipped_at: "2026-03-24T10:00:00.000Z",
    },
    {
      generated_question_id: 3,
      subtopic_id: 11,
      attempts_total: 1,
      best_score: 3,
      completed: false,
      max_score: 4,
      times_skipped: 0,
      last_skipped_at: null,
    },
  ]);

  assert.deepEqual(summary, {
    questionsAttempted: 2,
    questionsCompleted: 1,
    questionsSkipped: 1,
    averageScoreRatio: 0.875,
    averageAttemptsPerQuestion: 1.5,
    averageAttemptsToCompletion: 2,
  });
});

test("recent skipped questions are sorted newest-first", () => {
  const rows = sortRecentSkippedQuestionRows([
    {
      generatedQuestionId: 1,
      questionText: "Explain osmosis.",
      subtopicId: 10,
      subtopicCode: "1.1",
      subtopicName: "Cell membranes",
      attemptsTotal: 1,
      skippedAt: "2026-03-24T09:00:00.000Z",
    },
    {
      generatedQuestionId: 2,
      questionText: "Describe transcription.",
      subtopicId: 11,
      subtopicCode: "1.2",
      subtopicName: "Gene expression",
      attemptsTotal: 0,
      skippedAt: "2026-03-24T11:00:00.000Z",
    },
    {
      generatedQuestionId: 3,
      questionText: "Analyse enzyme inhibition.",
      subtopicId: 12,
      subtopicCode: "1.3",
      subtopicName: "Enzymes",
      attemptsTotal: 2,
      skippedAt: "2026-03-24T10:00:00.000Z",
    },
  ]);

  assert.deepEqual(
    rows.map((row) => row.generatedQuestionId),
    [2, 3, 1],
  );
});

test("practice stats degrade gracefully when skip columns are missing", async () => {
  resetPracticeStatsSkipColumnsAvailabilityForTests();

  const supabase = createMockSupabaseClient((request) => {
    if (request.table === "user_question_progress") {
      if (request.select?.includes("times_skipped")) {
        return {
          data: null,
          error: {
            code: "42703",
            message: "column user_question_progress.times_skipped does not exist",
          },
        };
      }

      return {
        data: [
          {
            generated_question_id: 101,
            subtopic_id: 12,
            attempts_total: 2,
            best_score: 3,
            completed: false,
            max_score: 4,
          },
        ],
        error: null,
      };
    }

    if (
      request.table === "user_subtopic_progress" ||
      request.table === "user_required_area_progress" ||
      request.table === "generated_question_attempts"
    ) {
      return { data: [], error: null };
    }

    throw new Error(`Unexpected table ${request.table}`);
  });

  const stats = await fetchPracticeStats(
    supabase as unknown as Parameters<typeof fetchPracticeStats>[0],
    "user-1",
  );

  assert.equal(stats.summary.questionsAttempted, 1);
  assert.equal(stats.summary.questionsCompleted, 0);
  assert.equal(stats.summary.questionsSkipped, 0);
  assert.equal(stats.summary.averageScoreRatio, 0.75);
  assert.deepEqual(stats.recentSkippedQuestions, []);
});
