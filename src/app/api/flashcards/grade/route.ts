import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

function fallbackGrade(
  userAnswer: string,
  correctAnswer: string
): { score: number; feedback: string } {
  const normalizedUser = userAnswer.toLowerCase().trim();
  const normalizedCorrect = correctAnswer.toLowerCase().trim();

  if (normalizedUser === normalizedCorrect) {
    return { score: 3, feedback: "Exact match — great job!" };
  }

  // Check word overlap
  const userWords = new Set(normalizedUser.split(/\s+/));
  const correctWords = normalizedCorrect.split(/\s+/);
  const matchCount = correctWords.filter((w) => userWords.has(w)).length;
  const overlap = correctWords.length > 0 ? matchCount / correctWords.length : 0;

  if (overlap >= 0.8) {
    return {
      score: 3,
      feedback: "Your answer closely matches the correct answer.",
    };
  }
  if (overlap >= 0.5) {
    return {
      score: 2,
      feedback:
        "Your answer covers most of the key points but is missing some details.",
    };
  }
  if (overlap >= 0.2) {
    return {
      score: 1,
      feedback:
        "Your answer has some relevant ideas but is missing significant parts.",
    };
  }
  return {
    score: 0,
    feedback: "Your answer doesn't match the expected response. Review the correct answer above.",
  };
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { userAnswer?: string; correctAnswer?: string; question?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { userAnswer, correctAnswer, question } = body;

  if (!userAnswer || !correctAnswer || !question) {
    return NextResponse.json(
      { error: "userAnswer, correctAnswer, and question are required" },
      { status: 400 }
    );
  }

  // Try AI grading, fall back to simple comparison if it fails
  try {
    const client = new Anthropic();

    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 512,
      system:
        'You are a flashcard grading assistant. Compare the user\'s answer to the correct answer and determine accuracy. Return ONLY a JSON object with no other text: {"score": number, "feedback": string}. Score is 0-3 where: 0 = completely wrong or blank, 1 = has the right idea but significant gaps or errors, 2 = mostly correct with minor issues, 3 = correct or essentially correct. Feedback should be 1-2 sentences explaining the grade. Be encouraging but honest.',
      messages: [
        {
          role: "user",
          content: `Question: ${question}\n\nCorrect answer: ${correctAnswer}\n\nUser's answer: ${userAnswer}`,
        },
      ],
    });

    const textBlock = message.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      // AI returned no text — use fallback
      const result = fallbackGrade(userAnswer, correctAnswer);
      return NextResponse.json(result);
    }

    let jsonStr = textBlock.text.trim();
    // Strip markdown code blocks if present
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }
    // Try to extract JSON object if there's surrounding text
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }

    const result = JSON.parse(jsonStr) as {
      score: number;
      feedback: string;
    };

    // Validate score is in range
    const score = Math.max(0, Math.min(3, Math.round(result.score)));

    return NextResponse.json({
      score,
      feedback: result.feedback || "Answer graded.",
    });
  } catch (error) {
    console.error(
      "AI grading error, using fallback:",
      error instanceof Error ? error.message : String(error)
    );
    // Fall back to simple word-matching grade
    const result = fallbackGrade(userAnswer, correctAnswer);
    return NextResponse.json(result);
  }
}
