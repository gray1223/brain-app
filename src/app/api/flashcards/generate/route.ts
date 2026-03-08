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

  const { content, deckId } = await request.json();

  if (!content || !deckId) {
    return NextResponse.json(
      { error: "Content and deckId are required" },
      { status: 400 }
    );
  }

  // Verify deck belongs to user
  const { data: deck } = await supabase
    .from("flashcard_decks")
    .select("id")
    .eq("id", deckId)
    .eq("user_id", user.id)
    .single();

  if (!deck) {
    return NextResponse.json({ error: "Deck not found" }, { status: 404 });
  }

  try {
    const client = new Anthropic();

    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system:
        "You are a flashcard generator. Given text content, create effective flashcards for studying. Generate question-and-answer pairs that cover the key concepts. Return ONLY a JSON array of objects: [{front: string, back: string}]. Create 5-20 cards depending on content length. Make questions specific and answers concise. Include a mix of definition, concept, and application questions.",
      messages: [
        {
          role: "user",
          content: content,
        },
      ],
    });

    const textBlock = message.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json(
        { error: "Failed to generate cards" },
        { status: 500 }
      );
    }

    // Extract JSON from response (handle potential markdown code blocks)
    let jsonStr = textBlock.text.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    const cards = JSON.parse(jsonStr) as { front: string; back: string }[];

    if (!Array.isArray(cards) || cards.length === 0) {
      return NextResponse.json(
        { error: "No cards generated" },
        { status: 500 }
      );
    }

    return NextResponse.json({ cards });
  } catch (error) {
    console.error("AI generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate flashcards" },
      { status: 500 }
    );
  }
}
