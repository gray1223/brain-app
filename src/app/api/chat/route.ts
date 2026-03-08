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

    const { message } = await request.json();

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    // Fetch user context in parallel
    const [
      { data: notes },
      { data: todos },
      { data: journalEntries },
    ] = await Promise.all([
      supabase
        .from("notes")
        .select("title, tags")
        .eq("user_id", user.id)
        .eq("is_archived", false)
        .order("updated_at", { ascending: false })
        .limit(10),
      supabase
        .from("todos")
        .select("title, priority, due_date")
        .eq("user_id", user.id)
        .eq("completed", false)
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("journal_entries")
        .select("date, mood, tags")
        .eq("user_id", user.id)
        .order("date", { ascending: false })
        .limit(5),
    ]);

    // Build context string
    const contextParts: string[] = [];

    if (notes && notes.length > 0) {
      const notesSummary = notes
        .map(
          (n) =>
            `- "${n.title}"${n.tags?.length ? ` [tags: ${n.tags.join(", ")}]` : ""}`
        )
        .join("\n");
      contextParts.push(`Recent Notes:\n${notesSummary}`);
    }

    if (todos && todos.length > 0) {
      const todosSummary = todos
        .map(
          (t) =>
            `- ${t.title} (priority: ${t.priority}${t.due_date ? `, due: ${t.due_date}` : ""})`
        )
        .join("\n");
      contextParts.push(`Active Todos:\n${todosSummary}`);
    }

    if (journalEntries && journalEntries.length > 0) {
      const journalSummary = journalEntries
        .map(
          (j) =>
            `- ${j.date}${j.mood !== null ? ` (mood: ${j.mood}/10)` : ""}${j.tags?.length ? ` [tags: ${j.tags.join(", ")}]` : ""}`
        )
        .join("\n");
      contextParts.push(`Recent Journal Entries:\n${journalSummary}`);
    }

    const userContext =
      contextParts.length > 0
        ? `\n\nYour knowledge about the user:\n${contextParts.join("\n\n")}`
        : "";

    const systemPrompt = `You are BrainSpace AI, a personal assistant with access to the user's notes, todos, and journal entries. Help them organize thoughts, find connections, plan their day, and reflect on their experiences. Be concise and helpful.${userContext}`;

    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const stream = anthropic.messages.stream({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: "user", content: message }],
    });

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              controller.enqueue(
                new TextEncoder().encode(event.delta.text)
              );
            }
          }
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "Failed to process chat message" },
      { status: 500 }
    );
  }
}
