import type {
  PracticeLevelDescriptor,
} from "@/lib/mock-biology-practice-api";
import type { GeneratedMarkingRubricPoint } from "@/lib/generated-practice-content";
import type { MarkingPrompt, PreparedMarkingInput } from "@/lib/marking/types";

const POINTS_SYSTEM_PROMPT = [
  "You are a strict A-level biology examiner.",
  "Evaluate each rubric point separately.",
  "Only award a mark for rubric points classified as present.",
  "Do not invent evidence.",
  "Return only valid JSON.",
].join(" ");

const LEVELS_SYSTEM_PROMPT = [
  "You are a strict A-level biology examiner.",
  "For level-based 6-mark questions, do not award marks by counting rubric points.",
  "Use rubric points to identify evidence, then use the level descriptors to decide the best-fit level and final mark.",
  "Do not award Level 3 just because several isolated points are present.",
  "A short or weakly developed answer should not reach the top level.",
  "Mentioning facts without linking them to function or the command word should limit the level.",
  "If the question requires comparison, balance, or coverage of two sides, weak coverage on one side should limit the level.",
  "Use examiner judgment, not checklist counting.",
  "Do not invent evidence.",
  "Return only valid JSON.",
].join(" ");

export function buildPointsMarkingPrompt(
  input: PreparedMarkingInput,
): MarkingPrompt {
  return {
    systemPrompt: POINTS_SYSTEM_PROMPT,
    userPrompt: [
      ...buildPromptSections(input),
      "Instructions",
      [
        "1. Evaluate each rubric point separately in the listed order.",
        "2. Classify every point as present, partial, or absent.",
        "3. Evidence must be a direct quote or tight grounded paraphrase from the student answer.",
        "4. If a point is absent, evidence must be an empty string.",
        "5. Only mark a point present if the answer clearly states the biological idea.",
        "6. Do not invent evidence or generic praise.",
        "7. Return only valid JSON matching the schema exactly.",
      ].join("\n"),
      "",
      "Required JSON shape",
      JSON.stringify(createPointsModelOutputExample(), null, 2),
    ].join("\n"),
  };
}

export function buildLevelsMarkingPrompt(
  input: PreparedMarkingInput,
): MarkingPrompt {
  return {
    systemPrompt: LEVELS_SYSTEM_PROMPT,
    userPrompt: [
      ...buildPromptSections(input),
      "Instructions",
      [
        "1. Evaluate each rubric point separately in the listed order.",
        "2. Classify every point as present, partial, or absent.",
        "3. Evidence must be a direct quote or tight grounded paraphrase from the student answer for present and partial points.",
        "4. If a point is absent, evidence must be an empty string.",
        "5. Use rubric points as evidence only, not as a raw score counter.",
        "6. Judge the overall answer using the level descriptors and examiner judgment.",
        "7. Consider coverage and range, whether both sides are addressed where relevant, structure-function links where relevant, depth of explanation, whether the command word is satisfied, and the clarity and structure of the answer.",
        "8. Do not award the top level just because several isolated facts are present.",
        "9. A short answer with limited development should usually stay in a lower level.",
        "10. If the answer gives facts without linking them to function or explanation, limit the level.",
        "11. If the question requires comparison or balance across two sides, weak coverage of one side should limit the level.",
        "12. Decide the best-fit level and assign a mark within that level band.",
        "13. Return only valid JSON matching the schema exactly.",
      ].join("\n"),
      "",
      "Required JSON shape",
      JSON.stringify(createLevelsModelOutputExample(), null, 2),
    ].join("\n"),
  };
}

function buildPromptSections(input: PreparedMarkingInput) {
  return [
    "Question",
    input.questionText,
    "",
    "Marks",
    String(input.marks),
    "",
    "Command word / question type",
    input.questionType,
    "",
    "Marking style",
    input.markingStyle,
    "",
    "Answer focus",
    input.answerFocus,
    "",
    "Rubric points",
    formatRubricPoints(input.rubricPoints),
    "",
    "Level descriptors",
    formatLevelDescriptors(input.levelDescriptors),
    "",
    "Student answer",
    input.answerText,
    "",
  ];
}

function formatRubricPoints(rubricPoints: GeneratedMarkingRubricPoint[]) {
  return rubricPoints
    .map((point, index) => {
      const conceptGroupSuffix = point.conceptGroup
        ? ` [Concept group: ${point.conceptGroup}]`
        : "";

      return `${index + 1}. ${point.pointText}${conceptGroupSuffix}`;
    })
    .join("\n");
}

function formatLevelDescriptors(levelDescriptors: PracticeLevelDescriptor[]) {
  if (levelDescriptors.length === 0) {
    return "None";
  }

  return levelDescriptors
    .map((descriptor, index) => {
      const communicationRequirement =
        descriptor.communicationRequirement ?? "None";

      return [
        `${index + 1}. Level ${descriptor.levelNumber} (${descriptor.minMark}-${descriptor.maxMark})`,
        `Descriptor: ${descriptor.descriptorText}`,
        `Communication: ${communicationRequirement}`,
      ].join("\n");
    })
    .join("\n\n");
}

function createPointsModelOutputExample() {
  return {
    rubricAssessment: [
      {
        pointText: "Rubric point text",
        status: "present",
        evidence: "Quote or tight grounded paraphrase from the student answer",
        reason: "Short examiner reason",
      },
    ],
    feedback: {
      nextStep: "One concise practical rewrite instruction",
    },
  };
}

function createLevelsModelOutputExample() {
  return {
    rubricAssessment: [
      {
        pointText: "Rubric point text",
        status: "present",
        evidence: "Quote or tight grounded paraphrase from the student answer",
        reason: "Short examiner reason",
      },
    ],
    recommendedLevel: 2,
    recommendedMark: 4,
    levelReasoning:
      "The answer covers both sides but lacks enough linked development for the top band.",
    feedback: {
      nextStep:
        "Link each stated feature to its function and develop both sides of the comparison.",
    },
  };
}
