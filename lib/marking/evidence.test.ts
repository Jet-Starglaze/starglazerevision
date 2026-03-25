import assert from "node:assert/strict";
import test from "node:test";

import {
  countMeaningfulWords,
  createAllAbsentPointsModeResponse,
  isAnswerTooShortToMark,
  isEvidenceTraceable,
  sanitizePointsModeResponse,
} from "./evidence.ts";
import { computePointsModeScore } from "./scoring.ts";

function createPreparedMarkingInput({
  answerText,
  marks = 3,
  rubricPoints = [
    "Oxygen diffuses into the blood",
    "Large surface area",
    "Thin exchange surface",
  ],
}: {
  answerText: string;
  marks?: number;
  rubricPoints?: string[];
}) {
  return {
    generatedQuestionId: 1,
    answerText,
    questionText: "Explain how gas exchange happens.",
    answerFocus: "Gas exchange across the exchange surface.",
    marks,
    questionType: "explain",
    rubricPoints: rubricPoints.map((pointText, index) => ({
      id: index + 1,
      pointText,
      orderNumber: index + 1,
      conceptGroup: null,
      requiredArea: null,
    })),
  };
}

test('"a" is treated as too short and returns 0/3 with all rubric points absent', () => {
  const input = createPreparedMarkingInput({
    answerText: "a",
  });
  const response = createAllAbsentPointsModeResponse(input);

  assert.equal(countMeaningfulWords(input.answerText), 0);
  assert.equal(isAnswerTooShortToMark(input.answerText), true);
  assert.equal(computePointsModeScore(response.rubricAssessment, input.marks), 0);
  assert.deepEqual(
    response.rubricAssessment,
    input.rubricPoints.map((point) => ({
      pointText: point.pointText,
      status: "absent",
      evidence: "",
    })),
  );
});

test("irrelevant answers lose hallucinated evidence and score zero", () => {
  const input = createPreparedMarkingInput({
    answerText: "chlorophyll makes leaves green during photosynthesis",
  });
  const sanitizedResponse = sanitizePointsModeResponse(
    {
      rubricAssessment: input.rubricPoints.map((point) => ({
        pointText: point.pointText,
        status: "present" as const,
        evidence: `"${point.pointText}"`,
      })),
      feedback: {
        nextStep: "Keep going.",
      },
    },
    input,
  );

  assert.equal(
    isEvidenceTraceable(
      '"Oxygen diffuses into the blood"',
      input.answerText,
    ),
    false,
  );
  assert.equal(
    computePointsModeScore(
      sanitizedResponse.rubricAssessment,
      input.marks,
    ),
    0,
  );
  assert.deepEqual(
    sanitizedResponse.rubricAssessment,
    input.rubricPoints.map((point) => ({
      pointText: point.pointText,
      status: "absent",
      evidence: "",
    })),
  );
  assert.equal(
    sanitizedResponse.feedback.nextStep,
    "Add this missing point: Oxygen diffuses into the blood.",
  );
});

test("only explicit traceable short-response evidence is rewarded", () => {
  const input = createPreparedMarkingInput({
    answerText: "oxygen diffuses into blood because the gradient is steep",
    marks: 2,
    rubricPoints: [
      "Oxygen diffuses into the blood",
      "Large surface area",
    ],
  });
  const sanitizedResponse = sanitizePointsModeResponse(
    {
      rubricAssessment: [
        {
          pointText: "Oxygen diffuses into the blood",
          status: "present",
          evidence: '"oxygen diffuses into blood"',
        },
        {
          pointText: "Large surface area",
          status: "present",
          evidence: '"gradient"',
        },
      ],
      feedback: {
        nextStep: "Add the missing surface-area point.",
      },
    },
    input,
  );

  assert.equal(
    computePointsModeScore(
      sanitizedResponse.rubricAssessment,
      input.marks,
    ),
    1,
  );
  assert.deepEqual(sanitizedResponse.rubricAssessment, [
    {
      pointText: "Oxygen diffuses into the blood",
      status: "present",
      evidence: '"oxygen diffuses into blood"',
    },
    {
      pointText: "Large surface area",
      status: "absent",
      evidence: "",
    },
  ]);
});
