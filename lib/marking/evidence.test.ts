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

test("explicit list wording recovers an absent plasma carbon-dioxide point", () => {
  const input = createPreparedMarkingInput({
    answerText:
      "plasma carries glucose and urea and hormones and most carbon dioxide",
    marks: 4,
    rubricPoints: [
      "Plasma carries glucose",
      "Plasma carries urea",
      "Plasma carries hormones",
      "Plasma carries most carbon dioxide",
    ],
  });
  const sanitizedResponse = sanitizePointsModeResponse(
    {
      rubricAssessment: [
        {
          pointText: "Plasma carries glucose",
          status: "present",
          evidence: '"plasma carries glucose"',
        },
        {
          pointText: "Plasma carries urea",
          status: "present",
          evidence: '"urea"',
        },
        {
          pointText: "Plasma carries hormones",
          status: "present",
          evidence: '"hormones"',
        },
        {
          pointText: "Plasma carries most carbon dioxide",
          status: "absent",
          evidence: "",
        },
      ],
      feedback: {
        nextStep: "Add the remaining plasma transport point.",
      },
    },
    input,
  );

  assert.equal(
    computePointsModeScore(
      sanitizedResponse.rubricAssessment,
      input.marks,
    ),
    4,
  );
  assert.deepEqual(sanitizedResponse.rubricAssessment[3], {
    pointText: "Plasma carries most carbon dioxide",
    status: "present",
    evidence:
      '"plasma carries glucose and urea and hormones and most carbon dioxide"',
  });
});

test("recovery does not award a plasma carbon-dioxide point when 'most' is missing", () => {
  const input = createPreparedMarkingInput({
    answerText: "plasma carries glucose and urea and hormones and carbon dioxide",
    marks: 4,
    rubricPoints: [
      "Plasma carries glucose",
      "Plasma carries urea",
      "Plasma carries hormones",
      "Plasma carries most carbon dioxide",
    ],
  });
  const sanitizedResponse = sanitizePointsModeResponse(
    {
      rubricAssessment: [
        {
          pointText: "Plasma carries glucose",
          status: "present",
          evidence: '"plasma carries glucose"',
        },
        {
          pointText: "Plasma carries urea",
          status: "present",
          evidence: '"urea"',
        },
        {
          pointText: "Plasma carries hormones",
          status: "present",
          evidence: '"hormones"',
        },
        {
          pointText: "Plasma carries most carbon dioxide",
          status: "absent",
          evidence: "",
        },
      ],
      feedback: {
        nextStep: "Add the remaining plasma transport point.",
      },
    },
    input,
  );

  assert.equal(
    computePointsModeScore(
      sanitizedResponse.rubricAssessment,
      input.marks,
    ),
    3,
  );
  assert.deepEqual(sanitizedResponse.rubricAssessment[3], {
    pointText: "Plasma carries most carbon dioxide",
    status: "absent",
    evidence: "",
  });
});
