import type { PracticeRubricPoint } from "@/lib/mock-biology-practice-api";
import { createClient } from "@/utils/supabase/server";

export type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type GeneratedQuestionRecord = {
  id: number | string;
  subtopic_id: number | string;
  question_text: string;
  marks: number;
  question_type: string | null;
  answer_focus: string | null;
  status: string | null;
};

type GeneratedRubricPointRow = {
  id: number | string;
  point_text: string;
  order_number: number;
};

type GeneratedRubricPointRowWithConceptGroup = GeneratedRubricPointRow & {
  concept_group: string | null;
};

export type GeneratedMarkingRubricPoint = PracticeRubricPoint & {
  conceptGroup: string | null;
};

type QuestionForeignKeyColumn = "generated_question_id" | "question_id";

const generatedQuestionForeignKeyColumns: readonly QuestionForeignKeyColumn[] = [
  "generated_question_id",
  "question_id",
];
let generatedRubricPointConceptGroupAvailable: boolean | null = null;

export async function fetchGeneratedQuestionById(
  supabase: SupabaseServerClient,
  generatedQuestionId: number | string,
): Promise<GeneratedQuestionRecord | null> {
  const { data, error } = await supabase
    .from("generated_questions")
    .select(
      `
        id,
        subtopic_id,
        question_text,
        marks,
        question_type,
        answer_focus,
        status
      `,
    )
    .eq("id", toNumericId(generatedQuestionId))
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load generated question: ${error.message}`);
  }

  return (data ?? null) as GeneratedQuestionRecord | null;
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
  const rows = await fetchGeneratedRubricPointsWithOptionalConceptGroup(
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

async function fetchGeneratedRubricPointsWithOptionalConceptGroup(
  supabase: SupabaseServerClient,
  questionId: number | string,
): Promise<GeneratedRubricPointRowWithConceptGroup[]> {
  if (generatedRubricPointConceptGroupAvailable === false) {
    const rows = await fetchGeneratedRowsByQuestionId<GeneratedRubricPointRow>({
      supabase,
      table: "generated_rubric_points",
      select: "id, point_text, order_number",
      questionId,
      orderColumn: "order_number",
    });

    return rows.map((point) => ({
      ...point,
      concept_group: null,
    }));
  }

  try {
    const rows =
      await fetchGeneratedRowsByQuestionId<GeneratedRubricPointRowWithConceptGroup>(
        {
          supabase,
          table: "generated_rubric_points",
          select: "id, point_text, order_number, concept_group",
          questionId,
          orderColumn: "order_number",
        },
      );

    generatedRubricPointConceptGroupAvailable = true;

    return rows;
  } catch (caughtError) {
    if (!isMissingColumnError(caughtError, "concept_group")) {
      throw caughtError;
    }

    generatedRubricPointConceptGroupAvailable = false;

    console.warn(
      "[practice-generated-content] concept_group unavailable on generated_rubric_points",
      {
        questionId: String(questionId),
      },
    );

    const rows = await fetchGeneratedRowsByQuestionId<GeneratedRubricPointRow>({
      supabase,
      table: "generated_rubric_points",
      select: "id, point_text, order_number",
      questionId,
      orderColumn: "order_number",
    });

    return rows.map((point) => ({
      ...point,
      concept_group: null,
    }));
  }
}

function isMissingColumnError(caughtError: unknown, columnName: string) {
  return (
    caughtError instanceof Error &&
    caughtError.message.toLowerCase().includes(columnName.toLowerCase())
  );
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}
