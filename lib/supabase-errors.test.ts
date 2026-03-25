import assert from "node:assert/strict";
import test from "node:test";

import {
  getSupabaseErrorMessage,
  isMissingColumnError,
} from "./supabase-errors.ts";

test("extracts the message from native Error instances", () => {
  assert.equal(
    getSupabaseErrorMessage(new Error("column foo does not exist")),
    "column foo does not exist",
  );
});

test("extracts the message from plain Supabase-style error objects", () => {
  assert.equal(
    getSupabaseErrorMessage({
      code: "42703",
      message: "column user_question_progress.times_skipped does not exist",
    }),
    "column user_question_progress.times_skipped does not exist",
  );
});

test("falls back to string values directly", () => {
  assert.equal(
    getSupabaseErrorMessage("column generated_questions.model_answer does not exist"),
    "column generated_questions.model_answer does not exist",
  );
});

test("falls back to String() for unrelated values", () => {
  assert.equal(getSupabaseErrorMessage({ code: "42703" }), "[object Object]");
});

test("matches missing-column errors case-insensitively", () => {
  assert.equal(
    isMissingColumnError(
      { message: "column user_question_progress.TIMES_SKIPPED does not exist" },
      "times_skipped",
    ),
    true,
  );
});
