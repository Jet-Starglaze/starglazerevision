import type { PracticeRubricPoint } from "@/lib/mock-biology-practice-api";
import type { MarkingPrompt, PreparedMarkingInput } from "@/lib/marking/types";

const SYSTEM_PROMPT = [
  "Strict A-level biology examiner.",
  "Evaluate each rubric point independently.",
  "Award a point only when the student clearly states that exact biological idea.",
  "Related ideas do not count.",
  "Return JSON only.",
].join(" ");

export function buildPointsMarkingPrompt(
  input: PreparedMarkingInput,
): MarkingPrompt {
  return {
    systemPrompt: SYSTEM_PROMPT,
    userPrompt: [
      `Question: ${input.questionText}`,
      `Marks: ${input.marks}`,
      `Question type: ${input.questionType}`,
      "Student answer:",
      input.answerText,
      "Rubric points to classify independently:",
      formatRubricPoints(input.rubricPoints),
      "Rules:",
      [
        "1. Evaluate each rubric point as its own classification task.",
        "2. Only mark present if the student clearly expresses that specific point.",
        "3. Do not award a point just because the answer is about the same topic.",
        "4. Do not merge nearby but distinct concepts.",
        "5. If the wording better matches a different rubric point, mark this point absent.",
        "6. Similar theme does not equal a correct match.",
        "7. Partial means an incomplete version of this same point, not a different point from the same topic.",
        "8. A single phrase should not justify multiple clearly different points unless it genuinely states both.",
        '9. Evidence must support the exact point being marked. Prefer a direct quote. Use a very tight grounded paraphrase only when the exact claim is unmistakable.',
        '10. If absent, evidence must be "".',
        "11. Return every rubric point in the same order with pointIndex, pointText, status, and evidence.",
      ].join("\n"),
      "Counterexamples:",
      [
        '- "cells are far from the body surface" does not equal "low surface area to volume ratio".',
        '- "high metabolic rate" does not equal "rapid supply of oxygen" unless oxygen demand or oxygen need is actually stated.',
      ].join("\n"),
      "Required JSON:",
      JSON.stringify(createModelOutputExample()),
    ].join("\n\n"),
  };
}

function formatRubricPoints(rubricPoints: PracticeRubricPoint[]) {
  return rubricPoints
    .map((point, index) =>
      [
        `${index + 1}. ${point.pointText}`,
        "Classify only this exact idea.",
      ].join("\n"),
    )
    .join("\n\n");
}

function createModelOutputExample() {
  return {
    rubricAssessment: [
      {
        pointIndex: 1,
        pointText: "Rubric point text",
        status: "present",
        evidence: "Direct quote or tight grounded paraphrase",
      },
    ],
    feedback: {
      nextStep: "Add one linked point.",
    },
  };
}
