import { NextResponse } from "next/server";
import { markPracticeAnswer } from "@/lib/practice-answer-marking";

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);

  if (payload === null) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const result = await markPracticeAnswer(payload);

  return NextResponse.json(result.body, { status: result.status });
}
