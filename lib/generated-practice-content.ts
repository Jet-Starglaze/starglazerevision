import type {
  PracticeLevelDescriptor,
  PracticeMarkingStyle,
  PracticeRubricPoint,
} from "@/lib/mock-biology-practice-api";
import { createClient } from "@/utils/supabase/server";

export type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type GeneratedQuestionRecord = {
  id: number | string;
  subtopic_id: number | string;
  question_text: string;
  marks: number;
  question_type: string | null;
  answer_focus: string | null;
  marking_style: string | null;
  status: string | null;
};

type GeneratedRubricPointRow = {
  id: number | string;
  point_text: string;
  order_number: number;
};

type GeneratedLevelDescriptorRow = {
  level_number: number;
  min_mark: number;
  max_mark: number;
  descriptor_text: string;
  communication_requirement: string | null;
};

type QuestionForeignKeyColumn = "generated_question_id" | "question_id";

const generatedQuestionForeignKeyColumns: readonly QuestionForeignKeyColumn[] = [
  "generated_question_id",
  "question_id",
];

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
        marking_style,
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

export async function fetchGeneratedLevelDescriptors(
  supabase: SupabaseServerClient,
  questionId: number | string,
): Promise<PracticeLevelDescriptor[]> {
  const rows =
    await fetchGeneratedRowsByQuestionId<GeneratedLevelDescriptorRow>({
      supabase,
      table: "generated_level_descriptors",
      select:
        "level_number, min_mark, max_mark, descriptor_text, communication_requirement",
      questionId,
      orderColumn: "level_number",
    });

  return [...rows]
    .sort((left, right) => left.level_number - right.level_number)
    .map((descriptor) => ({
      levelNumber: descriptor.level_number,
      minMark: descriptor.min_mark,
      maxMark: descriptor.max_mark,
      descriptorText: descriptor.descriptor_text,
      communicationRequirement: descriptor.communication_requirement,
    }));
}

export function mapDatabaseMarkingStyle(
  markingStyle: unknown,
  questionId: number | string,
): PracticeMarkingStyle | null {
  if (
    markingStyle === null ||
    markingStyle === undefined ||
    markingStyle === ""
  ) {
    console.warn("[practice-generated-content] Missing marking_style defaulted", {
      questionId: String(questionId),
      defaultedTo: "points",
    });

    return "points";
  }

  if (typeof markingStyle !== "string") {
    return null;
  }

  const normalizedValue = markingStyle.trim().toLowerCase();

  if (normalizedValue === "points" || normalizedValue === "levels") {
    return normalizedValue;
  }

  console.warn("[practice-generated-content] Unsupported marking_style", {
    questionId: String(questionId),
    storedMarkingStyle: markingStyle,
  });

  return null;
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
  table: "generated_rubric_points" | "generated_level_descriptors";
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

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}
