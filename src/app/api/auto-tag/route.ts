import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { content, existingTags } = await request.json();

    if (!content || typeof content !== "string") {
      return NextResponse.json(
        { error: "Content is required" },
        { status: 400 }
      );
    }

    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 256,
      system:
        "You are a tagging assistant. Given text content and existing tags, suggest 3-5 relevant tags. Return ONLY a JSON array of tag strings, nothing else. Tags should be lowercase, single words or short hyphenated phrases.",
      messages: [
        {
          role: "user",
          content: `Content:\n${content}\n\nExisting tags: ${JSON.stringify(existingTags ?? [])}`,
        },
      ],
    });

    const text =
      message.content[0].type === "text" ? message.content[0].text : "";
    const suggestedTags: string[] = JSON.parse(text);

    return NextResponse.json({ tags: suggestedTags });
  } catch (error) {
    console.error("Auto-tag API error:", error);
    return NextResponse.json(
      { error: "Failed to generate tags" },
      { status: 500 }
    );
  }
}
