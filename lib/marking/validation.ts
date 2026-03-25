import type {
  PracticeRubricAssessmentStatus,
  PracticeStructuredFeedback,
} from "@/lib/mock-biology-practice-api";
import type {
  PointsModeModelResponse,
  PreparedMarkingInput,
  RubricAssessmentItem,
} from "@/lib/marking/types";

export function parseModelOutput(rawOutput: string): unknown {
  try {
    return JSON.parse(rawOutput);
  } catch {
    throw new Error("Model output must be valid JSON");
  }
}

export function validatePointsModeResponse(
  parsedOutput: unknown,
  input: PreparedMarkingInput,
): PointsModeModelResponse {
  const parsedRecord = expectRecord(parsedOutput, "Model output must be an object");

  return {
    rubricAssessment: normalizeRubricAssessment(
      parsedRecord.rubricAssessment,
      input,
    ),
    feedback: normalizeFeedback(parsedRecord.feedback),
  };
}

function normalizeRubricAssessment(
  value: unknown,
  input: PreparedMarkingInput,
) {
  if (!Array.isArray(value)) {
    throw new Error("rubricAssessment must be an array");
  }

  if (value.length !== input.rubricPoints.length) {
    throw new Error("rubricAssessment length must match rubric points");
  }

  return input.rubricPoints.map((point, index) =>
    normalizeRubricAssessmentItem(value[index], point.pointText, index),
  );
}

function normalizeRubricAssessmentItem(
  value: unknown,
  expectedPointText: string,
  index: number,
): RubricAssessmentItem {
  const parsedRecord = expectRecord(
    value,
    "Each rubric assessment item must be an object",
  );

  const pointText = normalizeRequiredString(
    parsedRecord.pointText,
    `rubricAssessment[${index}].pointText`,
  );

  if (
    !isInteger(parsedRecord.pointIndex) ||
    parsedRecord.pointIndex !== index + 1
  ) {
    throw new Error("Rubric assessment pointIndex must match rubric order");
  }

  if (pointText !== expectedPointText.trim()) {
    throw new Error("Rubric assessment pointText must exactly match the rubric point");
  }

  const status = normalizeRubricAssessmentStatus(parsedRecord.status);

  if (!status) {
    throw new Error("Rubric assessment status is invalid");
  }

  const evidence = normalizeOptionalString(
    parsedRecord.evidence,
    `rubricAssessment[${index}].evidence`,
  );

  return {
    pointText,
    status,
    evidence,
  };
}

function normalizeFeedback(value: unknown): PracticeStructuredFeedback {
  const parsedRecord = expectRecord(value, "feedback must be an object");
  const offTopicPoints = normalizeOffTopicPoints(parsedRecord.offTopicPoints);

  return offTopicPoints
    ? {
        nextStep: normalizeRequiredString(
          parsedRecord.nextStep,
          "feedback.nextStep",
        ),
        offTopicPoints,
      }
    : {
        nextStep: normalizeRequiredString(
          parsedRecord.nextStep,
          "feedback.nextStep",
        ),
      };
}

function normalizeRequiredString(value: unknown, fieldName: string) {
  if (typeof value !== "string") {
    throw new Error(`${fieldName} must be a string`);
  }

  const normalizedValue = value.trim();

  if (normalizedValue.length === 0) {
    throw new Error(`${fieldName} must not be empty`);
  }

  return normalizedValue;
}

function normalizeOptionalString(value: unknown, fieldName: string) {
  if (value === undefined || value === null) {
    return "";
  }

  if (typeof value !== "string") {
    throw new Error(`${fieldName} must be a string`);
  }

  return value.trim();
}

function normalizeOffTopicPoints(value: unknown) {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (!Array.isArray(value)) {
    throw new Error("feedback.offTopicPoints must be an array");
  }

  const normalizedPoints = Array.from(
    new Set(
      value.map((item, index) =>
        normalizeRequiredString(item, `feedback.offTopicPoints[${index}]`),
      ),
    ),
  ).slice(0, 3);

  return normalizedPoints.length > 0 ? normalizedPoints : undefined;
}

function normalizeRubricAssessmentStatus(
  value: unknown,
): PracticeRubricAssessmentStatus | null {
  if (
    value === "present" ||
    value === "partial" ||
    value === "absent"
  ) {
    return value;
  }

  if (typeof value !== "string") {
    return null;
  }

  const normalizedValue = value.trim().toLowerCase();

  if (
    normalizedValue === "correct" ||
    normalizedValue === "covered" ||
    normalizedValue === "full" ||
    normalizedValue === "fully present"
  ) {
    return "present";
  }

  if (
    normalizedValue === "partially correct" ||
    normalizedValue === "partly correct" ||
    normalizedValue === "incomplete"
  ) {
    return "partial";
  }

  if (
    normalizedValue === "missing" ||
    normalizedValue === "not present" ||
    normalizedValue === "not addressed"
  ) {
    return "absent";
  }

  return null;
}

function expectRecord(value: unknown, message: string) {
  if (typeof value !== "object" || value === null) {
    throw new Error(message);
  }

  return value as Record<string, unknown>;
}

function isInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value);
}
