import type {
  PracticeRubricAssessmentStatus,
  PracticeStructuredFeedback,
} from "@/lib/mock-biology-practice-api";
import type {
  LevelsModeModelResponse,
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

export function validateLevelsModeResponse(
  parsedOutput: unknown,
  input: PreparedMarkingInput,
): LevelsModeModelResponse {
  const parsedRecord = expectRecord(parsedOutput, "Model output must be an object");
  const pointsModeResponse = validatePointsModeResponse(parsedRecord, input);

  return {
    ...pointsModeResponse,
    recommendedLevel: normalizeRequiredInteger(
      parsedRecord.recommendedLevel,
      "recommendedLevel",
    ),
    recommendedMark: normalizeRequiredInteger(
      parsedRecord.recommendedMark,
      "recommendedMark",
    ),
    levelReasoning: normalizeRequiredString(
      parsedRecord.levelReasoning,
      "levelReasoning",
    ),
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

  normalizeRequiredString(
    parsedRecord.pointText,
    `rubricAssessment[${index}].pointText`,
  );

  if (
    parsedRecord.pointIndex !== undefined &&
    (!isInteger(parsedRecord.pointIndex) || parsedRecord.pointIndex !== index + 1)
  ) {
    throw new Error("Rubric assessment pointIndex must match rubric order");
  }

  const status = normalizeRubricAssessmentStatus(parsedRecord.status);

  if (!status) {
    throw new Error("Rubric assessment status is invalid");
  }

  const evidence = normalizeOptionalString(
    parsedRecord.evidence,
    `rubricAssessment[${index}].evidence`,
  );
  const reason = normalizeRequiredString(
    parsedRecord.reason,
    `rubricAssessment[${index}].reason`,
  );

  if (status === "absent" && evidence.length > 0) {
    throw new Error("Absent rubric points must not include evidence");
  }

  if (status !== "absent" && evidence.length === 0) {
    throw new Error("Present or partial rubric points must include evidence");
  }

  return {
    pointText: expectedPointText,
    status,
    evidence,
    reason,
  };
}

function normalizeFeedback(value: unknown): PracticeStructuredFeedback {
  const parsedRecord = expectRecord(value, "feedback must be an object");

  return {
    nextStep: normalizeRequiredString(parsedRecord.nextStep, "feedback.nextStep"),
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
  if (typeof value !== "string") {
    throw new Error(`${fieldName} must be a string`);
  }

  return value.trim();
}

function normalizeRequiredInteger(value: unknown, fieldName: string) {
  const normalizedValue = normalizeIntegerLike(value);

  if (normalizedValue === null) {
    throw new Error(`${fieldName} must be an integer`);
  }

  return normalizedValue;
}

function normalizeIntegerLike(value: unknown) {
  if (isInteger(value)) {
    return value;
  }

  if (typeof value === "string") {
    const match = value.trim().match(/\d+/);

    if (match) {
      const parsedValue = Number(match[0]);

      if (isInteger(parsedValue)) {
        return parsedValue;
      }
    }
  }

  return null;
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
