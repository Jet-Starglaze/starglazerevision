import { NextResponse } from "next/server";
import { markMockPracticeAnswer } from "@/lib/mock-biology-practice-api";

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);

  if (payload === null) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const result = markMockPracticeAnswer(payload);

  return NextResponse.json(result.body, { status: result.status });
}
