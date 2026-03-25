import type { PracticeRubricPoint } from "./mock-biology-practice-api.ts";
import type { createClient } from "../utils/supabase/server.ts";
import { isMissingColumnError } from "./supabase-errors.ts";

export type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type GeneratedQuestionRecord = {
  id: number | string;
  subtopic_id: number | string;
  question_text: string;
  marks: number;
  question_type: string | null;
  answer_focus: string | null;
  model_answer: string | null;
  status: string | null;
};

type GeneratedRubricPointRow = {
  id: number | string;
  point_text: string;
  order_number: number;
};

type GeneratedRubricPointRowWithOptionalMetadata = GeneratedRubricPointRow & {
  concept_group: string | null;
  required_area: string | null;
};

export type GeneratedMarkingRubricPoint = PracticeRubricPoint & {
  conceptGroup: string | null;
  requiredArea: string | null;
};

type QuestionForeignKeyColumn = "generated_question_id" | "question_id";

const generatedQuestionForeignKeyColumns: readonly QuestionForeignKeyColumn[] = [
  "generated_question_id",
  "question_id",
];
let generatedQuestionModelAnswerAvailable: boolean | null = null;
let generatedRubricPointConceptGroupAvailable: boolean | null = null;
let generatedRubricPointRequiredAreaAvailable: boolean | null = null;

export async function fetchGeneratedQuestionById(
  supabase: SupabaseServerClient,
  generatedQuestionId: number | string,
): Promise<GeneratedQuestionRecord | null> {
  const includeModelAnswer = generatedQuestionModelAnswerAvailable !== false;

  try {
    const { data, error } = await supabase
      .from("generated_questions")
      .select(buildGeneratedQuestionSelect(includeModelAnswer))
      .eq("id", toNumericId(generatedQuestionId))
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to load generated question: ${error.message}`);
    }

    if (includeModelAnswer) {
      generatedQuestionModelAnswerAvailable = true;
    }

    return normalizeGeneratedQuestionRecord(
      (data ?? null) as GeneratedQuestionRecordWithOptionalModelAnswer | null,
    );
  } catch (caughtError) {
    if (includeModelAnswer && isMissingColumnError(caughtError, "model_answer")) {
      generatedQuestionModelAnswerAvailable = false;

      console.warn(
        "[practice-generated-content] model_answer unavailable on generated_questions",
        {
          generatedQuestionId: String(generatedQuestionId),
        },
      );

      return fetchGeneratedQuestionById(supabase, generatedQuestionId);
    }

    throw caughtError;
  }
}

export async function fetchGeneratedRubricPoints(
  supabase: SupabaseServerClient,
  questionId: number | string,
): Promise<PracticeRubricPoint[]> {
  const rows = await fetchGeneratedRowsByQuestionId<GeneratedRubricPointRow>({
    supabase,
    table: "generated_rubric_points",
    select: "id, point_text, order_number",
    questionId,
    orderColumn: "order_number",
  });

  return [...rows]
    .sort((left, right) => left.order_number - right.order_number)
    .map((point) => ({
      id: toNumericId(point.id),
      pointText: point.point_text,
      orderNumber: point.order_number,
    }));
}

export async function fetchGeneratedRubricPointsForMarking(
  supabase: SupabaseServerClient,
  questionId: number | string,
): Promise<GeneratedMarkingRubricPoint[]> {
  const rows = await fetchGeneratedRubricPointsWithOptionalMetadata(
    supabase,
    questionId,
  );

  return [...rows]
    .sort((left, right) => left.order_number - right.order_number)
    .map((point) => ({
      id: toNumericId(point.id),
      pointText: point.point_text,
      orderNumber: point.order_number,
      conceptGroup: point.concept_group ?? null,
      requiredArea: point.required_area ?? null,
    }));
}

export function normalizeNumericId(value: unknown) {
  if (isPositiveInteger(value)) {
    return value;
  }

  if (typeof value === "string" && /^\d+$/.test(value)) {
    const parsedValue = Number(value);

    if (isPositiveInteger(parsedValue)) {
      return parsedValue;
    }
  }

  return null;
}

export function toNumericId(value: number | string) {
  if (typeof value === "number") {
    return value;
  }

  const parsedValue = Number(value);

  if (!isPositiveInteger(parsedValue)) {
    throw new Error(`Invalid numeric identifier "${value}"`);
  }

  return parsedValue;
}

async function fetchGeneratedRowsByQuestionId<T>({
  supabase,
  table,
  select,
  questionId,
  orderColumn,
}: {
  supabase: SupabaseServerClient;
  table: "generated_rubric_points";
  select: string;
  questionId: number | string;
  orderColumn: string;
}): Promise<T[]> {
  const normalizedQuestionId = toNumericId(questionId);
  const attemptedErrors: string[] = [];

  for (const foreignKeyColumn of generatedQuestionForeignKeyColumns) {
    const { data, error } = await supabase
      .from(table)
      .select(select)
      .eq(foreignKeyColumn, normalizedQuestionId)
      .order(orderColumn, { ascending: true });

    if (!error) {
      if (foreignKeyColumn !== generatedQuestionForeignKeyColumns[0]) {
        console.warn(
          "[practice-generated-content] Fallback generated question foreign key used",
          {
            questionId: String(questionId),
            table,
            foreignKeyColumn,
          },
        );
      }

      return (data ?? []) as T[];
    }

    attemptedErrors.push(`${foreignKeyColumn}: ${error.message}`);
  }

  throw new Error(`Failed to load ${table}: ${attemptedErrors.join("; ")}`);
}

async function fetchGeneratedRubricPointsWithOptionalMetadata(
  supabase: SupabaseServerClient,
  questionId: number | string,
): Promise<GeneratedRubricPointRowWithOptionalMetadata[]> {
  const includeConceptGroup = generatedRubricPointConceptGroupAvailable !== false;
  const includeRequiredArea = generatedRubricPointRequiredAreaAvailable !== false;

  try {
    const rows =
      await fetchGeneratedRowsByQuestionId<
        GeneratedRubricPointRow & {
          concept_group?: string | null;
          required_area?: string | null;
        }
      >({
        supabase,
        table: "generated_rubric_points",
        select: buildGeneratedRubricPointMetadataSelect({
          includeConceptGroup,
          includeRequiredArea,
        }),
        questionId,
        orderColumn: "order_number",
      });

    if (includeConceptGroup) {
      generatedRubricPointConceptGroupAvailable = true;
    }

    if (includeRequiredArea) {
      generatedRubricPointRequiredAreaAvailable = true;
    }

    return rows.map((point) => ({
      ...point,
      concept_group: point.concept_group ?? null,
      required_area: point.required_area ?? null,
    }));
  } catch (caughtError) {
    if (
      includeConceptGroup &&
      isMissingColumnError(caughtError, "concept_group")
    ) {
      generatedRubricPointConceptGroupAvailable = false;

      console.warn(
        "[practice-generated-content] concept_group unavailable on generated_rubric_points",
        {
          questionId: String(questionId),
        },
      );

      return fetchGeneratedRubricPointsWithOptionalMetadata(supabase, questionId);
    }

    if (
      includeRequiredArea &&
      isMissingColumnError(caughtError, "required_area")
    ) {
      generatedRubricPointRequiredAreaAvailable = false;

      console.warn(
        "[practice-generated-content] required_area unavailable on generated_rubric_points",
        {
          questionId: String(questionId),
        },
      );

      return fetchGeneratedRubricPointsWithOptionalMetadata(supabase, questionId);
    }

    throw caughtError;
  }
}

function buildGeneratedRubricPointMetadataSelect({
  includeConceptGroup,
  includeRequiredArea,
}: {
  includeConceptGroup: boolean;
  includeRequiredArea: boolean;
}) {
  const selectColumns = ["id", "point_text", "order_number"];

  if (includeConceptGroup) {
    selectColumns.push("concept_group");
  }

  if (includeRequiredArea) {
    selectColumns.push("required_area");
  }

  return selectColumns.join(", ");
}

type GeneratedQuestionRecordWithOptionalModelAnswer =
  Omit<GeneratedQuestionRecord, "model_answer"> & {
    model_answer?: string | null;
  };

function buildGeneratedQuestionSelect(includeModelAnswer: boolean) {
  const selectColumns = [
    "id",
    "subtopic_id",
    "question_text",
    "marks",
    "question_type",
    "answer_focus",
    "status",
  ];

  if (includeModelAnswer) {
    selectColumns.push("model_answer");
  }

  return selectColumns.join(", ");
}

function normalizeGeneratedQuestionRecord(
  row: GeneratedQuestionRecordWithOptionalModelAnswer | null,
): GeneratedQuestionRecord | null {
  if (!row) {
    return null;
  }

  return {
    ...row,
    model_answer: row.model_answer ?? null,
  };
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}
