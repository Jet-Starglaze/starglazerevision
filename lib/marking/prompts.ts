import type { PracticeRubricPoint } from "@/lib/mock-biology-practice-api";
import type { MarkingPrompt, PreparedMarkingInput } from "@/lib/marking/types";
import {
  countMeaningfulWords,
  isShortResponseQuestion,
} from "@/lib/marking/evidence";

const SYSTEM_PROMPT = [
  "Strict but fair A-level biology examiner.",
  "Evaluate each rubric point independently.",
  "Start every rubric point as absent until the answer text proves it present.",
  "Mark a point present only when the student explicitly states it or clearly states something that directly and unambiguously entails it.",
  "Do not infer meaning, do not assume intent, and do not hallucinate evidence.",
  "Irrelevant biology must not help matching or scoring.",
  "Reject vague, merely related, or speculative matches.",
  "Return JSON only.",
].join(" ");

export function buildPointsMarkingPrompt(
  input: PreparedMarkingInput,
): MarkingPrompt {
  const meaningfulWordCount = countMeaningfulWords(input.answerText);
  const shortResponse = isShortResponseQuestion(input.marks);

  return {
    systemPrompt: SYSTEM_PROMPT,
    userPrompt: [
      `Question: ${input.questionText}`,
      `Marks: ${input.marks}`,
      `Question type: ${input.questionType}`,
      `Answer focus: ${input.answerFocus || "Use the question and rubric to identify the exact mechanism focus."}`,
      `Meaningful answer words: ${meaningfulWordCount}`,
      `Marking mode: ${shortResponse ? "Short-response strict mode (fewer than 3 marks)." : "Standard strict mode."}`,
      "Student answer:",
      input.answerText,
      "Rubric points to classify independently:",
      formatRubricPoints(input.rubricPoints),
      "Rules:",
      [
        "1. Evaluate each rubric point as its own classification task.",
        "2. Start every rubric point as absent. A point must be proven present or partial by the student answer text.",
        "3. Do not infer meaning.",
        "4. Do not assume intent.",
        "5. Do not hallucinate evidence.",
        "6. If the answer does not explicitly contain the idea, mark absent.",
        "7. Exact wording is not required. Accept only biologically equivalent phrasing that is directly grounded in the answer text.",
        "8. Mark present only if the student explicitly states the point or clearly states something that directly and unambiguously entails it.",
        "9. Allow clearly implied equivalents only when the biological meaning is direct, standard, and unambiguous.",
        "10. For long answers, a direct implication may come from one explicit statement or from multiple explicit statements taken together.",
        "11. Irrelevant or unnecessary biology must not help a rubric point match and must not earn marks.",
        "12. Do not award a point just because the answer is about the same topic or has partial theme overlap.",
        "13. Do not award a point for vague statements, indirect speculation, or exam-style fluff.",
        "14. Do not merge nearby but distinct concepts.",
        "15. If the wording or evidence better matches a different rubric point, mark this point absent.",
        "16. Partial means an incomplete version of this same point only, not a different point from the same topic. Partial does not earn the mark.",
        "17. A single phrase should not justify multiple clearly different points unless it genuinely states both or directly and unambiguously entails both.",
        '18. Evidence must be directly traceable to the student answer text. Use literal quoted answer excerpt(s), not free-form paraphrase.',
        '19. If one direct excerpt supports the point, return one quoted excerpt such as "quoted words from the answer".',
        '20. If two explicit clauses are both required for a long-answer implication, return them as "quote 1" + "quote 2".',
        '21. If absent, evidence must be "".',
        "22. If the student answer has fewer than 3 meaningful words, mark every rubric point absent and set every evidence to \"\".",
        "23. For questions worth fewer than 3 marks, each mark requires one clear, correct, explicit biological point from the answer.",
        "24. For questions worth fewer than 3 marks, do not use indirect multi-clause implication, vague fragments, single-word fragments, or merely related wording as evidence.",
        "25. If substantial off-topic or unnecessary content appears, include it in feedback.offTopicPoints as short concise phrases. Do not include more than 3.",
        "26. Do not include tiny extra phrases in feedback.offTopicPoints, and do not flag relevant background that genuinely helps explain the asked mechanism.",
        "27. feedback.nextStep must be one short, specific, actionable instruction based on the highest-value missing or partial rubric point.",
        '28. Do not use generic coaching like "add more detail", "explain more", or "add one linked point".',
        "29. Return every rubric point in the same order with pointIndex, pointText, status, and evidence.",
      ].join("\n"),
      "Allowed implication examples:",
      [
        '- "each haemoglobin molecule has 4 polypeptide chains" plus "each polypeptide chain has a haem group" can support "haemoglobin contains four haem groups" for a long-answer question.',
        '- "ribosomes on rough ER" can support protein synthesis when the biological link is direct and standard.',
      ].join("\n"),
      "Counterexamples:",
      [
        '- "cells are far from the body surface" does not equal "low surface area to volume ratio".',
        '- "high metabolic rate" does not equal "rapid supply of oxygen" unless oxygen demand or oxygen need is actually stated.',
        '- "can bind oxygen" does not automatically equal "binds oxygen reversibly".',
        '- For a boundary-layer question, a long cohesion-tension or xylem-pull explanation is off-topic unless it directly answers the asked mechanism.',
        '- For a short-response question, do not combine two quoted fragments to manufacture one mark.',
        '- For a short-response question, do not use a vague single word like "gradient" or "oxygen" as enough evidence for a rubric point.',
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
        "Classify only this rubric point. Allow only direct, unambiguous equivalents or implications grounded in the answer text.",
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
        evidence: '"Literal quoted excerpt from the student answer"',
      },
    ],
    feedback: {
      nextStep:
        "Add a direct link between humid air near the leaf and a reduced diffusion gradient.",
      offTopicPoints: ["Long cohesion-tension explanation is not needed here."],
    },
  };
}
