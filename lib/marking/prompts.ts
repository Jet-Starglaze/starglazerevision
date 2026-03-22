import type { PracticeRubricPoint } from "@/lib/mock-biology-practice-api";
import type { MarkingPrompt, PreparedMarkingInput } from "@/lib/marking/types";

const SYSTEM_PROMPT = [
  "Strict but fair A-level biology examiner.",
  "Evaluate each rubric point independently.",
  "Mark a point present when the student explicitly states it or clearly states something that directly and unambiguously entails it.",
  "Irrelevant biology must not help matching or scoring.",
  "Reject vague, merely related, or speculative matches.",
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
      `Answer focus: ${input.answerFocus || "Use the question and rubric to identify the exact mechanism focus."}`,
      "Student answer:",
      input.answerText,
      "Rubric points to classify independently:",
      formatRubricPoints(input.rubricPoints),
      "Rules:",
      [
        "1. Evaluate each rubric point as its own classification task.",
        "2. Exact wording is not required. Accept biologically equivalent phrasing.",
        "3. Mark present if the student explicitly states the point or clearly states something that logically entails it.",
        "4. Allow clearly implied equivalents only when the biological meaning is direct, standard, and unambiguous.",
        "5. A direct implication may come from one explicit statement or from multiple explicit statements in the answer taken together.",
        "6. Irrelevant or unnecessary biology must not help a rubric point match and must not earn marks.",
        "7. Do not award a point just because the answer is about the same topic or has partial theme overlap.",
        "8. Do not award a point for vague statements, indirect speculation, or exam-style fluff.",
        "9. Do not merge nearby but distinct concepts.",
        "10. If the wording or evidence better matches a different rubric point, mark this point absent.",
        "11. Partial means an incomplete version of this same point only, not a different point from the same topic. Partial does not earn the mark.",
        "12. A single phrase should not justify multiple clearly different points unless it genuinely states both or directly and unambiguously entails both.",
        '13. Evidence must support the specific point being marked. Prefer a direct quote. Use a very tight grounded paraphrase only when the supporting claim or implication is unmistakable.',
        "14. If a point is present by direct implication from two explicit clauses, the evidence may mention both clauses in one tight grounded paraphrase.",
        "15. If substantial off-topic or unnecessary content appears, include it in feedback.offTopicPoints as short concise phrases. Do not include more than 3.",
        "16. Do not include tiny extra phrases in feedback.offTopicPoints, and do not flag relevant background that genuinely helps explain the asked mechanism.",
        "17. feedback.nextStep must be one short, specific, actionable instruction based on the highest-value missing or partial rubric point.",
        '18. Do not use generic coaching like "add more detail", "explain more", or "add one linked point".',
        '19. If absent, evidence must be "".',
        "20. Return every rubric point in the same order with pointIndex, pointText, status, and evidence.",
      ].join("\n"),
      "Allowed implication examples:",
      [
        '- "each haemoglobin molecule has 4 polypeptide chains" plus "each polypeptide chain has a haem group" can support "haemoglobin contains four haem groups".',
        '- "ribosomes on rough ER" can support protein synthesis when the biological link is direct and standard.',
      ].join("\n"),
      "Counterexamples:",
      [
        '- "cells are far from the body surface" does not equal "low surface area to volume ratio".',
        '- "high metabolic rate" does not equal "rapid supply of oxygen" unless oxygen demand or oxygen need is actually stated.',
        '- "can bind oxygen" does not automatically equal "binds oxygen reversibly".',
        '- For a boundary-layer question, a long cohesion-tension or xylem-pull explanation is off-topic unless it directly answers the asked mechanism.',
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
        "Classify only this rubric point. Allow only direct, unambiguous equivalents or implications.",
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
        evidence: "Direct quote or tight grounded paraphrase of the supporting statement(s)",
      },
    ],
    feedback: {
      nextStep:
        "Add a direct link between humid air near the leaf and a reduced diffusion gradient.",
      offTopicPoints: ["Long cohesion-tension explanation is not needed here."],
    },
  };
}
