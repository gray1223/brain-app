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

    const { noteId, content, title } = await request.json();

    if (!noteId || !content) {
      return NextResponse.json(
        { error: "noteId and content are required" },
        { status: 400 }
      );
    }

    const { data: otherNotes } = await supabase
      .from("notes")
      .select("id, title, tags")
      .eq("user_id", user.id)
      .eq("is_archived", false)
      .neq("id", noteId)
      .order("updated_at", { ascending: false })
      .limit(50);

    if (!otherNotes || otherNotes.length === 0) {
      return NextResponse.json({ connections: [] });
    }

    const notesList = otherNotes
      .map(
        (n) =>
          `- id: "${n.id}", title: "${n.title}"${n.tags?.length ? `, tags: [${n.tags.join(", ")}]` : ""}`
      )
      .join("\n");

    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      system:
        'You are analyzing notes for connections. Given a source note and a list of other notes (with titles and tags), identify the 5 most related notes. Return ONLY a JSON array of objects: [{id: string, reason: string}]. The reason should be brief (under 10 words).',
      messages: [
        {
          role: "user",
          content: `Source note:\nTitle: "${title}"\nContent: ${content}\n\nOther notes:\n${notesList}`,
        },
      ],
    });

    const text =
      message.content[0].type === "text" ? message.content[0].text : "";
    const connections: { id: string; reason: string }[] = JSON.parse(text);

    // Enrich with titles
    const noteMap = new Map(otherNotes.map((n) => [n.id, n.title]));
    const enriched = connections
      .filter((c) => noteMap.has(c.id))
      .map((c) => ({
        ...c,
        title: noteMap.get(c.id) ?? "Untitled",
      }));

    return NextResponse.json({ connections: enriched });
  } catch (error) {
    console.error("Smart connections API error:", error);
    return NextResponse.json(
      { error: "Failed to find connections" },
      { status: 500 }
    );
  }
}
