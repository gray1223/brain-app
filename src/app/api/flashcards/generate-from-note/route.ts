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

  const { title, content } = await request.json();

  if (!content || content.length < 20) {
    return NextResponse.json(
      { error: "Content too short" },
      { status: 400 }
    );
  }

  const truncatedContent = content.slice(0, 3000);

  try {
    const client = new Anthropic();

    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `Generate flashcards from the following note. Return ONLY a JSON array of objects with "front" and "back" fields. Generate 5-10 cards that test key concepts, definitions, and relationships.

Note title: ${title}
Note content: ${truncatedContent}

Return format: [{"front": "question", "back": "answer"}, ...]`,
        },
      ],
    });

    const text =
      message.content[0].type === "text" ? message.content[0].text : "";

    // Extract JSON from response
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: "Failed to parse response" },
        { status: 500 }
      );
    }

    const cards = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ cards });
  } catch {
    // Fallback: generate simple cards
    const sentences = content
      .split(/[.!?]+/)
      .map((s: string) => s.trim())
      .filter((s: string) => s.length > 15);

    const cards = sentences.slice(0, 5).map((s: string) => ({
      front: `Explain: ${s.slice(0, 80)}${s.length > 80 ? "..." : ""}`,
      back: s,
    }));

    return NextResponse.json({ cards });
  }
}
