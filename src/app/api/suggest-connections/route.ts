import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch notes with content for analysis
    const { data: notes } = await supabase
      .from("notes")
      .select("id, title, tags, content")
      .eq("user_id", user.id)
      .eq("is_archived", false)
      .order("updated_at", { ascending: false })
      .limit(30);

    if (!notes || notes.length < 2) {
      return NextResponse.json({ suggestions: [] });
    }

    // Fetch existing connections to exclude them
    const { data: existingConnections } = await supabase
      .from("note_connections")
      .select("note_a_id, note_b_id")
      .eq("user_id", user.id);

    const existingSet = new Set(
      (existingConnections ?? []).map((c) =>
        [c.note_a_id, c.note_b_id].sort().join(":")
      )
    );

    const notesList = notes
      .map((n) => {
        const contentStr =
          n.content && typeof n.content === "object"
            ? JSON.stringify(n.content).slice(0, 200)
            : "";
        return `- id: "${n.id}", title: "${n.title}"${n.tags?.length ? `, tags: [${n.tags.join(", ")}]` : ""}${contentStr ? `, content_preview: "${contentStr}"` : ""}`;
      })
      .join("\n");

    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system:
        'You are analyzing notes for potential connections in a knowledge graph. Given a list of notes with titles, tags, and content previews, identify up to 8 pairs of notes that are likely related but might not be obviously connected. Return ONLY a JSON array: [{noteA: string, noteB: string, reason: string, label: "relates to"|"supports"|"contradicts"|"inspired by"}]. Use the note IDs for noteA/noteB. The reason should be brief (under 15 words).',
      messages: [
        {
          role: "user",
          content: `Find potential connections between these notes:\n${notesList}`,
        },
      ],
    });

    const text =
      message.content[0].type === "text" ? message.content[0].text : "";

    const jsonMatch = text.match(/\[[\s\S]*\]/);
    const rawSuggestions: {
      noteA: string;
      noteB: string;
      reason: string;
      label: string;
    }[] = jsonMatch ? JSON.parse(jsonMatch[0]) : [];

    // Filter out already-connected pairs and enrich with titles
    const noteMap = new Map(notes.map((n) => [n.id, n.title]));
    const suggestions = rawSuggestions
      .filter((s) => {
        const key = [s.noteA, s.noteB].sort().join(":");
        return (
          !existingSet.has(key) && noteMap.has(s.noteA) && noteMap.has(s.noteB)
        );
      })
      .map((s) => ({
        ...s,
        titleA: noteMap.get(s.noteA) ?? "Untitled",
        titleB: noteMap.get(s.noteB) ?? "Untitled",
      }));

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error("Suggest connections API error:", error);
    return NextResponse.json(
      { error: "Failed to suggest connections" },
      { status: 500 }
    );
  }
}
