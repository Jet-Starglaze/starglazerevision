import assert from "node:assert/strict";
import test from "node:test";

import {
  getPracticeCompletionThreshold,
  hasReachedPracticeCompletionThreshold,
} from "./practice-completion.ts";

test("completion thresholds require full marks except on 6-mark questions", () => {
  assert.equal(getPracticeCompletionThreshold(1), 1);
  assert.equal(getPracticeCompletionThreshold(2), 2);
  assert.equal(getPracticeCompletionThreshold(3), 3);
  assert.equal(getPracticeCompletionThreshold(4), 4);
  assert.equal(getPracticeCompletionThreshold(6), 5);
});

test("completion checks match the mastery rules", () => {
  assert.equal(hasReachedPracticeCompletionThreshold(1, 1), true);
  assert.equal(hasReachedPracticeCompletionThreshold(2, 2), true);
  assert.equal(hasReachedPracticeCompletionThreshold(3, 3), true);
  assert.equal(hasReachedPracticeCompletionThreshold(3, 4), false);
  assert.equal(hasReachedPracticeCompletionThreshold(4, 4), true);
  assert.equal(hasReachedPracticeCompletionThreshold(4, 6), false);
  assert.equal(hasReachedPracticeCompletionThreshold(5, 6), true);
  assert.equal(hasReachedPracticeCompletionThreshold(6, 6), true);
});
