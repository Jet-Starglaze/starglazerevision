import { NextResponse } from "next/server";
import { fetchPracticeQuestionFromSupabase } from "@/lib/practice-questions";

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);

  if (payload === null) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const result = await fetchPracticeQuestionFromSupabase(payload);

  return NextResponse.json(result.body, { status: result.status });
}
