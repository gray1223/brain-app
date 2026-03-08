import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { subDays, format } from "date-fns";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const weekAgo = subDays(now, 7);
    const weekAgoISO = weekAgo.toISOString();

    const [
      { data: completedTodos },
      { data: createdNotes },
      { data: journalEntries },
      { data: updatedProjects },
    ] = await Promise.all([
      supabase
        .from("todos")
        .select("title, completed_at")
        .eq("user_id", user.id)
        .eq("completed", true)
        .gte("completed_at", weekAgoISO)
        .order("completed_at", { ascending: false }),
      supabase
        .from("notes")
        .select("title, created_at")
        .eq("user_id", user.id)
        .gte("created_at", weekAgoISO)
        .order("created_at", { ascending: false }),
      supabase
        .from("journal_entries")
        .select("date, mood, tags")
        .eq("user_id", user.id)
        .gte("date", format(weekAgo, "yyyy-MM-dd"))
        .order("date", { ascending: false }),
      supabase
        .from("projects")
        .select("name, status, updated_at")
        .eq("user_id", user.id)
        .gte("updated_at", weekAgoISO)
        .order("updated_at", { ascending: false }),
    ]);

    const todosCompleted = completedTodos?.length ?? 0;
    const notesCreated = createdNotes?.length ?? 0;
    const journalCount = journalEntries?.length ?? 0;
    const moods = (journalEntries ?? [])
      .map((j) => j.mood)
      .filter((m): m is number => m !== null);
    const avgMood =
      moods.length > 0
        ? Math.round((moods.reduce((a, b) => a + b, 0) / moods.length) * 10) /
          10
        : null;

    // Build activity summary for the AI
    const activityParts: string[] = [];

    if (completedTodos && completedTodos.length > 0) {
      const todoList = completedTodos
        .slice(0, 10)
        .map((t) => `- ${t.title}`)
        .join("\n");
      activityParts.push(`Completed todos (${todosCompleted}):\n${todoList}`);
    }

    if (createdNotes && createdNotes.length > 0) {
      const noteList = createdNotes
        .slice(0, 10)
        .map((n) => `- ${n.title}`)
        .join("\n");
      activityParts.push(`Notes created (${notesCreated}):\n${noteList}`);
    }

    if (journalEntries && journalEntries.length > 0) {
      const journalList = journalEntries
        .map(
          (j) =>
            `- ${j.date}${j.mood !== null ? ` (mood: ${j.mood}/10)` : ""}${j.tags?.length ? ` [${j.tags.join(", ")}]` : ""}`
        )
        .join("\n");
      activityParts.push(`Journal entries (${journalCount}):\n${journalList}`);
    }

    if (updatedProjects && updatedProjects.length > 0) {
      const projectList = updatedProjects
        .map((p) => `- ${p.name} (${p.status})`)
        .join("\n");
      activityParts.push(
        `Projects updated (${updatedProjects.length}):\n${projectList}`
      );
    }

    const activitySummary =
      activityParts.length > 0
        ? activityParts.join("\n\n")
        : "No recorded activity this week.";

    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      system:
        "You are a personal productivity assistant. Given the user's activity data from the past week, write a brief, encouraging weekly digest. Include: accomplishments, mood trends, suggestions for the coming week. Keep it under 200 words. Use a warm, supportive tone.",
      messages: [
        {
          role: "user",
          content: `Here is my activity from the past week (${format(weekAgo, "MMM d")} - ${format(now, "MMM d, yyyy")}):\n\n${activitySummary}`,
        },
      ],
    });

    const digest =
      message.content[0].type === "text" ? message.content[0].text : "";

    return NextResponse.json({
      digest,
      stats: {
        todosCompleted,
        notesCreated,
        journalEntries: journalCount,
        avgMood,
      },
    });
  } catch (error) {
    console.error("Digest API error:", error);
    return NextResponse.json(
      { error: "Failed to generate digest" },
      { status: 500 }
    );
  }
}
