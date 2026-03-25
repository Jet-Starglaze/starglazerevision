import assert from "node:assert/strict";
import test from "node:test";

import {
  derivePracticeHints,
  derivePracticeReviewState,
  getMissingPointRevealLimit,
  isStuckPracticeAnswer,
} from "./practice-guidance.ts";

function createRubricPoint(pointText: string, orderNumber: number) {
  return {
    id: orderNumber,
    pointText,
    orderNumber,
  };
}

test("hint generation is deterministic and uses ordered rubric points", () => {
  const hints = derivePracticeHints({
    questionText: "Explain how water enters root hair cells.",
    answerFocus: "Water movement into root hair cells by osmosis",
    rubricPoints: [
      createRubricPoint("Water enters by osmosis", 1),
      createRubricPoint("Water potential is lower inside the cell", 2),
      createRubricPoint("Partially permeable membrane", 3),
      createRubricPoint("Large surface area", 4),
    ],
    modelAnswer:
      "Water enters root hair cells by osmosis because the water potential is lower inside the cell.",
    maxScore: 4,
  });

  assert.deepEqual(hints, [
    {
      level: 1,
      title: "Direction",
      lines: ["Focus on water movement into root hair cells by osmosis."],
    },
    {
      level: 2,
      title: "Key ideas",
      lines: [
        "Water enters by osmosis",
        "Water potential is lower inside the cell",
      ],
    },
    {
      level: 3,
      title: "Starter sentence",
      lines: [
        'Start with: "One important point is that water enters by osmosis, because ..."',
      ],
    },
  ]);
});

test("stuck answer detection catches blank and ultra-short answers", () => {
  assert.equal(isStuckPracticeAnswer(""), true);
  assert.equal(isStuckPracticeAnswer("a"), true);
  assert.equal(isStuckPracticeAnswer("osmosis"), true);
  assert.equal(
    isStuckPracticeAnswer("Water enters by osmosis through a membrane."),
    false,
  );
});

test("score-band reveal limits match the teaching rules", () => {
  assert.equal(getMissingPointRevealLimit(0, 6), 3);
  assert.equal(getMissingPointRevealLimit(2, 6), 3);
  assert.equal(getMissingPointRevealLimit(3, 6), 2);
  assert.equal(getMissingPointRevealLimit(5, 6), 1);
  assert.equal(getMissingPointRevealLimit(6, 6), 0);
  assert.equal(getMissingPointRevealLimit(0, 4), 2);
  assert.equal(getMissingPointRevealLimit(1, 4), 2);
  assert.equal(getMissingPointRevealLimit(2, 4), 1);
  assert.equal(getMissingPointRevealLimit(4, 4), 0);
  assert.equal(getMissingPointRevealLimit(0, 3), 1);
  assert.equal(getMissingPointRevealLimit(2, 3), 1);
  assert.equal(getMissingPointRevealLimit(3, 3), 0);
});

test("review state prioritizes absent points in rubric order", () => {
  const reviewState = derivePracticeReviewState({
    score: 2,
    maxScore: 6,
    rubricAssessment: [
      {
        pointText: "First foundational point",
        status: "absent",
        evidence: "",
      },
      {
        pointText: "Second foundational point",
        status: "partial",
        evidence: '"second point"',
      },
      {
        pointText: "Third priority point",
        status: "absent",
        evidence: "",
      },
      {
        pointText: "Fourth priority point",
        status: "present",
        evidence: '"fourth point"',
      },
      {
        pointText: "Fifth priority point",
        status: "absent",
        evidence: "",
      },
    ],
  });

  assert.deepEqual(
    reviewState.revealedMissing.map((item) => item.pointText),
    [
      "First foundational point",
      "Third priority point",
      "Fifth priority point",
    ],
  );
  assert.equal(
    reviewState.nextDraftTarget,
    "Add one clear sentence explaining that first foundational point.",
  );
});

test("next draft target falls back to the highest-priority partial point", () => {
  const reviewState = derivePracticeReviewState({
    score: 3,
    maxScore: 4,
    rubricAssessment: [
      {
        pointText: "Present point",
        status: "present",
        evidence: '"present point"',
      },
      {
        pointText: "Sharpen the role of plasma in transport",
        status: "partial",
        evidence: '"plasma transports"',
      },
      {
        pointText: "Another present point",
        status: "present",
        evidence: '"another point"',
      },
    ],
  });

  assert.deepEqual(reviewState.revealedMissing, []);
  assert.equal(
    reviewState.nextDraftTarget,
    "Tighten one sentence so it clearly explains that sharpen the role of plasma in transport.",
  );
});
