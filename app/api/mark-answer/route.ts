import { NextResponse } from "next/server";
import type {
  ApiErrorResponse,
} from "@/lib/mock-biology-practice-api";
import {
  fetchGeneratedLevelDescriptors,
  fetchGeneratedQuestionById,
  fetchGeneratedRubricPointsForMarking,
  mapDatabaseMarkingStyle,
  normalizeNumericId,
} from "@/lib/generated-practice-content";
import { markAnswer, type PreparedMarkingInput } from "@/lib/marking";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 90;

type MarkAnswerRouteResult<T> = {
  status: number;
  body: T | ApiErrorResponse;
};

type ApiFailure = MarkAnswerRouteResult<never>;

type ValidMarkingRequest = {
  generatedQuestionId: number;
  answerText: string;
  attemptNumber: number | null;
};

const SAFE_ERRORS = {
  questionNotFound: "Generated question not found.",
  markingCriteria: "Could not load marking criteria right now.",
};

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);

  if (payload === null) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const validRequest = validateMarkingRequest(payload);

  if (isApiFailure(validRequest)) {
    return NextResponse.json(validRequest.body, { status: validRequest.status });
  }

  const markingInput = await loadPreparedMarkingInputOrError(validRequest);

  if (isApiFailure(markingInput)) {
    return NextResponse.json(markingInput.body, { status: markingInput.status });
  }

  const result = await markAnswer(markingInput);

  return NextResponse.json(result.body, { status: result.status });
}

function validateMarkingRequest(
  payload: unknown,
): ValidMarkingRequest | ApiFailure {
  if (!isRecord(payload)) {
    return createErrorResult(400, "Invalid request body");
  }

  const generatedQuestionId = normalizeNumericId(payload.generatedQuestionId);

  if (generatedQuestionId === null) {
    return createErrorResult(400, "generatedQuestionId is required");
  }

  const answerText =
    typeof payload.answerText === "string" ? payload.answerText.trim() : "";

  if (answerText.length === 0) {
    return createErrorResult(400, "answerText is required");
  }

  if (
    payload.attemptNumber !== undefined &&
    payload.attemptNumber !== null &&
    (!isInteger(payload.attemptNumber) || payload.attemptNumber < 1)
  ) {
    return createErrorResult(
      400,
      "attemptNumber must be a positive integer or null",
    );
  }

  return {
    generatedQuestionId,
    answerText,
    attemptNumber: payload.attemptNumber ?? null,
  };
}

async function loadPreparedMarkingInputOrError(
  request: ValidMarkingRequest,
): Promise<PreparedMarkingInput | ApiFailure> {
  const supabase = await createClient();

  try {
    const questionRow = await fetchGeneratedQuestionById(
      supabase,
      request.generatedQuestionId,
    );

    if (!questionRow) {
      return createErrorResult(404, SAFE_ERRORS.questionNotFound);
    }

    if (questionRow.status !== "approved") {
      console.warn("[api/mark-answer] Generated question not approved", {
        generatedQuestionId: request.generatedQuestionId,
        status: questionRow.status,
      });

      return createErrorResult(404, SAFE_ERRORS.questionNotFound);
    }

    const markingStyle = mapDatabaseMarkingStyle(
      questionRow.marking_style,
      questionRow.id,
    );

    if (!markingStyle) {
      console.error("[api/mark-answer] Unsupported marking style", {
        generatedQuestionId: request.generatedQuestionId,
        storedMarkingStyle: questionRow.marking_style,
      });

      return createErrorResult(500, SAFE_ERRORS.markingCriteria);
    }

    const rubricPoints = await fetchGeneratedRubricPointsForMarking(
      supabase,
      questionRow.id,
    );

    if (rubricPoints.length === 0) {
      console.error("[api/mark-answer] Missing generated marking criteria", {
        generatedQuestionId: request.generatedQuestionId,
        message: "No generated rubric points found",
      });

      return createErrorResult(500, SAFE_ERRORS.markingCriteria);
    }

    const levelDescriptors =
      markingStyle === "levels"
        ? await fetchGeneratedLevelDescriptors(supabase, questionRow.id)
        : [];

    if (markingStyle === "levels" && levelDescriptors.length === 0) {
      console.error("[api/mark-answer] Missing generated marking criteria", {
        generatedQuestionId: request.generatedQuestionId,
        message: "No generated level descriptors found for a level-based question",
      });

      return createErrorResult(500, SAFE_ERRORS.markingCriteria);
    }

    return {
      generatedQuestionId: request.generatedQuestionId,
      answerText: request.answerText,
      questionText: questionRow.question_text,
      marks: questionRow.marks,
      questionType: questionRow.question_type?.trim() || "unknown",
      markingStyle,
      answerFocus: questionRow.answer_focus?.trim() || "None provided",
      rubricPoints,
      levelDescriptors,
    };
  } catch (caughtError) {
    console.error("[api/mark-answer] Failed to load generated question", {
      generatedQuestionId: request.generatedQuestionId,
      message:
        caughtError instanceof Error ? caughtError.message : String(caughtError),
    });

    return createErrorResult(500, SAFE_ERRORS.markingCriteria);
  }
}

function createErrorResult(status: number, error: string): ApiFailure {
  return {
    status,
    body: { error },
  };
}

function isApiFailure(value: unknown): value is ApiFailure {
  return typeof value === "object" && value !== null && "status" in value && "body" in value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value);
}
