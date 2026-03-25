import assert from "node:assert/strict";
import test from "node:test";

import {
  buildUserQuestionProgressUpdate,
  recordGeneratedQuestionAttemptAndProgress,
  recordSkippedQuestionProgress,
  resetPracticeProgressSkipColumnsAvailabilityForTests,
} from "./practice-progress.ts";
import { createMockSupabaseClient } from "./test-support/mock-supabase.ts";

test("attempt-based question progress uses the shared completion threshold", () => {
  const unresolvedUpdate = buildUserQuestionProgressUpdate({
    userId: "user-1",
    generatedQuestionId: 101,
    subtopicId: 11,
    maxScore: 4,
    existingQuestionProgress: null,
    questionAttempts: [
      {
        generated_question_id: 101,
        subtopic_id: 11,
        attempt_number: 1,
        score: 3,
        max_score: 4,
        created_at: "2026-03-24T09:00:00.000Z",
      },
    ],
  });

  const completedUpdate = buildUserQuestionProgressUpdate({
    userId: "user-1",
    generatedQuestionId: 102,
    subtopicId: 11,
    maxScore: 6,
    existingQuestionProgress: null,
    questionAttempts: [
      {
        generated_question_id: 102,
        subtopic_id: 11,
        attempt_number: 1,
        score: 5,
        max_score: 6,
        created_at: "2026-03-24T09:05:00.000Z",
      },
    ],
  });

  assert.equal(unresolvedUpdate.completed, false);
  assert.equal(unresolvedUpdate.completed_at, null);
  assert.equal(completedUpdate.completed, true);
  assert.equal(completedUpdate.completed_at, "2026-03-24T09:05:00.000Z");
});

test("skipping without attempts creates unresolved progress and records skip metadata", () => {
  const skippedAt = "2026-03-24T10:00:00.000Z";
  const update = buildUserQuestionProgressUpdate({
    userId: "user-1",
    generatedQuestionId: 201,
    subtopicId: 21,
    maxScore: 4,
    existingQuestionProgress: null,
    questionAttempts: [],
    skippedAt,
  });

  assert.equal(update.attempts_total, 0);
  assert.equal(update.best_score, 0);
  assert.equal(update.max_score, 4);
  assert.equal(update.completed, false);
  assert.equal(update.completed_at, null);
  assert.equal(update.last_attempted_at, null);
  assert.equal(update.times_seen, 1);
  assert.equal(update.times_skipped, 1);
  assert.equal(update.last_skipped_at, skippedAt);
});

test("skipping preserves existing attempt-derived mastery while incrementing skip tracking", () => {
  const update = buildUserQuestionProgressUpdate({
    userId: "user-1",
    generatedQuestionId: 301,
    subtopicId: 31,
    maxScore: 6,
    existingQuestionProgress: {
      attempts_total: 1,
      best_score: 5,
      max_score: 6,
      last_score: 5,
      completed: true,
      times_seen: 1,
      completed_at: "2026-03-23T09:00:00.000Z",
      last_attempted_at: "2026-03-23T09:00:00.000Z",
      times_skipped: 1,
      last_skipped_at: "2026-03-23T09:05:00.000Z",
    },
    questionAttempts: [
      {
        generated_question_id: 301,
        subtopic_id: 31,
        attempt_number: 1,
        score: 5,
        max_score: 6,
        created_at: "2026-03-23T09:00:00.000Z",
      },
    ],
    skippedAt: "2026-03-24T11:00:00.000Z",
  });

  assert.equal(update.completed, true);
  assert.equal(update.completed_at, "2026-03-23T09:00:00.000Z");
  assert.equal(update.best_score, 5);
  assert.equal(update.last_score, 5);
  assert.equal(update.attempts_total, 1);
  assert.equal(update.times_skipped, 2);
  assert.equal(update.last_skipped_at, "2026-03-24T11:00:00.000Z");
});

test("attempt progress still persists when skip columns are unavailable", async () => {
  resetPracticeProgressSkipColumnsAvailabilityForTests();

  let questionProgressPayload: Record<string, unknown> | null = null;
  let subtopicProgressPayload: Record<string, unknown> | null = null;

  const supabase = createMockSupabaseClient((request) => {
    if (request.table === "generated_question_attempts") {
      if (request.action === "insert") {
        return { error: null };
      }

      if (request.select === "score, max_score, answer_text") {
        return { data: [], error: null };
      }

      if (
        request.select ===
        "generated_question_id, subtopic_id, attempt_number, score, max_score, created_at"
      ) {
        return {
          data: [
            {
              generated_question_id: 401,
              subtopic_id: 41,
              attempt_number: 1,
              score: 3,
              max_score: 4,
              created_at: "2026-03-24T12:00:00.000Z",
            },
          ],
          error: null,
        };
      }
    }

    if (request.table === "user_question_progress") {
      if (
        request.action === "select" &&
        request.select?.includes("times_skipped")
      ) {
        return {
          data: null,
          error: {
            code: "42703",
            message: "column user_question_progress.times_skipped does not exist",
          },
        };
      }

      if (request.action === "select") {
        if (request.maybeSingle) {
          return { data: null, error: null };
        }

        return {
          data: [
            {
              generated_question_id: 401,
              completed: false,
              last_attempted_at: "2026-03-24T12:00:00.000Z",
            },
          ],
          error: null,
        };
      }

      if (request.action === "upsert") {
        questionProgressPayload = request.payload as Record<string, unknown>;
        return { error: null };
      }
    }

    if (request.table === "user_subtopic_progress" && request.action === "upsert") {
      subtopicProgressPayload = request.payload as Record<string, unknown>;
      return { error: null };
    }

    throw new Error(
      `Unexpected ${request.action} on ${request.table} (${request.select ?? "no select"})`,
    );
  });

  await recordGeneratedQuestionAttemptAndProgress({
    supabase:
      supabase as unknown as Parameters<
        typeof recordGeneratedQuestionAttemptAndProgress
      >[0]["supabase"],
    userId: "user-1",
    generatedQuestionId: 401,
    subtopicId: 41,
    attemptNumber: 1,
    score: 3,
    maxScore: 4,
    answerText: "Structured response",
  });

  assert.ok(questionProgressPayload);
  const resolvedQuestionProgressPayload =
    questionProgressPayload as Record<string, unknown>;
  assert.equal("times_skipped" in resolvedQuestionProgressPayload, false);
  assert.equal("last_skipped_at" in resolvedQuestionProgressPayload, false);
  assert.equal(resolvedQuestionProgressPayload.attempts_total, 1);
  assert.ok(subtopicProgressPayload);
  const resolvedSubtopicProgressPayload =
    subtopicProgressPayload as Record<string, unknown>;
  assert.equal(resolvedSubtopicProgressPayload.questions_seen, 1);
});

test("skip progress surfaces a migration-required error when skip columns are unavailable", async () => {
  resetPracticeProgressSkipColumnsAvailabilityForTests();

  const supabase = createMockSupabaseClient((request) => {
    if (request.table === "generated_question_attempts") {
      if (
        request.select ===
        "generated_question_id, subtopic_id, attempt_number, score, max_score, created_at"
      ) {
        return { data: [], error: null };
      }

      throw new Error(`Unexpected generated_question_attempts query ${request.select}`);
    }

    if (
      request.table === "user_question_progress" &&
      request.action === "select"
    ) {
      if (request.select?.includes("times_skipped")) {
        return {
          data: null,
          error: {
            code: "42703",
            message: "column user_question_progress.times_skipped does not exist",
          },
        };
      }

      return { data: null, error: null };
    }

    throw new Error(
      `Unexpected ${request.action} on ${request.table} (${request.select ?? "no select"})`,
    );
  });

  await assert.rejects(
    recordSkippedQuestionProgress({
      supabase:
        supabase as unknown as Parameters<
          typeof recordSkippedQuestionProgress
        >[0]["supabase"],
      userId: "user-1",
      generatedQuestionId: 501,
      subtopicId: 51,
      maxScore: 4,
    }),
    /Skip tracking columns are unavailable on user_question_progress/,
  );
});
