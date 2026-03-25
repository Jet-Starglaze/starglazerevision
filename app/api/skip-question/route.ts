import { NextResponse } from "next/server";
import {
  fetchGeneratedQuestionById,
  normalizeNumericId,
} from "@/lib/generated-practice-content";
import {
  getAuthenticatedUserId,
  recordSkippedQuestionProgress,
} from "@/lib/practice-progress";
import { getSupabaseErrorMessage } from "@/lib/supabase-errors";
import { createClient } from "@/utils/supabase/server";

const SAFE_ERRORS = {
  authRequired: "Authentication required.",
  questionNotFound: "Generated question not found.",
  progressWrite: "Could not save skipped question progress right now.",
  migrationRequired:
    "Skip question is not available until the latest database migration is applied.",
};

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);

  if (!isRecord(payload)) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const generatedQuestionId = normalizeNumericId(payload.generatedQuestionId);

  if (generatedQuestionId === null) {
    return NextResponse.json(
      { error: "generatedQuestionId is required" },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const userId = await getAuthenticatedUserId(supabase);

  if (!userId) {
    return NextResponse.json(
      { error: SAFE_ERRORS.authRequired },
      { status: 401 },
    );
  }

  const question = await fetchGeneratedQuestionById(supabase, generatedQuestionId);

  if (!question) {
    return NextResponse.json(
      { error: SAFE_ERRORS.questionNotFound },
      { status: 404 },
    );
  }

  try {
    await recordSkippedQuestionProgress({
      supabase,
      userId,
      generatedQuestionId,
      subtopicId: question.subtopic_id,
      maxScore: question.marks,
    });
  } catch (caughtError) {
    const errorMessage = getSupabaseErrorMessage(caughtError);

    console.error("[api/skip-question] Failed to persist skipped question", {
      generatedQuestionId,
      userId,
      message: errorMessage,
    });

    if (errorMessage.includes("Skip tracking columns are unavailable")) {
      return NextResponse.json(
        { error: SAFE_ERRORS.migrationRequired },
        { status: 503 },
      );
    }

    return NextResponse.json(
      { error: SAFE_ERRORS.progressWrite },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
