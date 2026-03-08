import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userAnswer, correctAnswer, question } = await request.json();

  if (!userAnswer || !correctAnswer || !question) {
    return NextResponse.json(
      { error: "userAnswer, correctAnswer, and question are required" },
      { status: 400 }
    );
  }

  try {
    const client = new Anthropic();

    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 512,
      system:
        'You are a flashcard grading assistant. Compare the user\'s answer to the correct answer and determine accuracy. Return ONLY a JSON object: {"score": number, "feedback": string}. Score is 0-3 where: 0 = completely wrong or blank, 1 = has the right idea but significant gaps or errors, 2 = mostly correct with minor issues, 3 = correct or essentially correct. Feedback should be 1-2 sentences explaining the grade. Be encouraging but honest.',
      messages: [
        {
          role: "user",
          content: `Question: ${question}\n\nCorrect answer: ${correctAnswer}\n\nUser's answer: ${userAnswer}`,
        },
      ],
    });

    const textBlock = message.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json(
        { error: "Failed to grade answer" },
        { status: 500 }
      );
    }

    let jsonStr = textBlock.text.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    const result = JSON.parse(jsonStr) as {
      score: number;
      feedback: string;
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("AI grading error:", error);
    return NextResponse.json(
      { error: "Failed to grade answer" },
      { status: 500 }
    );
  }
}
