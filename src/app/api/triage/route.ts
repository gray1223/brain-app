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

    const { captures } = await request.json();

    if (!captures || !Array.isArray(captures) || captures.length === 0) {
      return NextResponse.json(
        { error: "captures array is required" },
        { status: 400 }
      );
    }

    const capturesList = captures
      .map(
        (c: { id: string; content: string }, i: number) =>
          `${i + 1}. [id: "${c.id}"] "${c.content}"`
      )
      .join("\n");

    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system:
        'You are triaging inbox captures for a personal knowledge management app. For each capture, determine if it should become a "note" (information, thoughts, ideas), "todo" (action items, tasks, reminders to do something), or "bookmark" (URLs, links, references). Return ONLY a JSON array of objects: [{id: string, suggestion: "note"|"todo"|"bookmark", confidence: "high"|"medium"|"low", reason: string}]. The reason should be under 10 words. Be accurate - URLs should be bookmarks, action items should be todos, everything else is notes.',
      messages: [
        {
          role: "user",
          content: `Triage these captures:\n${capturesList}`,
        },
      ],
    });

    const text =
      message.content[0].type === "text" ? message.content[0].text : "";

    // Extract JSON from potential markdown code blocks
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    const suggestions = jsonMatch ? JSON.parse(jsonMatch[0]) : [];

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error("Triage API error:", error);
    return NextResponse.json(
      { error: "Failed to triage captures" },
      { status: 500 }
    );
  }
}
