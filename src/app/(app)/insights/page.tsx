import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { BarChart3 } from "lucide-react";
import type { JournalEntry, Todo, Note } from "@/types/database";
import { InsightsTabs } from "@/components/insights/insights-tabs";

export default async function InsightsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Fetch all data in parallel
  const [
    { data: journalEntries },
    { data: todos },
    { data: notes },
  ] = await Promise.all([
    supabase
      .from("journal_entries")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: true }),
    supabase
      .from("todos")
      .select("*")
      .eq("user_id", user.id),
    supabase
      .from("notes")
      .select("*")
      .eq("user_id", user.id),
  ]);

  const allJournals = (journalEntries as JournalEntry[] | null) ?? [];
  const allTodos = (todos as Todo[] | null) ?? [];
  const allNotes = (notes as Note[] | null) ?? [];

  // Prepare mood data for MoodDashboard
  const moodData = allJournals.map((j) => ({
    date: j.date,
    mood: j.mood,
    tags: j.tags ?? [],
  }));

  // Prepare activity data for ActivityHeatmap
  // Aggregate: notes created, todos completed, journal entries by date
  const activityMap: Record<string, { notes: number; todos: number; journals: number }> = {};

  for (const note of allNotes) {
    const dateStr = format(new Date(note.created_at), "yyyy-MM-dd");
    if (!activityMap[dateStr]) activityMap[dateStr] = { notes: 0, todos: 0, journals: 0 };
    activityMap[dateStr].notes++;
  }

  for (const todo of allTodos) {
    if (todo.completed && todo.completed_at) {
      const dateStr = format(new Date(todo.completed_at), "yyyy-MM-dd");
      if (!activityMap[dateStr]) activityMap[dateStr] = { notes: 0, todos: 0, journals: 0 };
      activityMap[dateStr].todos++;
    }
  }

  for (const journal of allJournals) {
    const dateStr = journal.date;
    if (!activityMap[dateStr]) activityMap[dateStr] = { notes: 0, todos: 0, journals: 0 };
    activityMap[dateStr].journals++;
  }

  const activityData: { date: string; type: string; count: number }[] = [];
  for (const [date, counts] of Object.entries(activityMap)) {
    if (counts.notes > 0)
      activityData.push({ date, type: "note", count: counts.notes });
    if (counts.todos > 0)
      activityData.push({ date, type: "todo", count: counts.todos });
    if (counts.journals > 0)
      activityData.push({ date, type: "journal", count: counts.journals });
  }

  // Prepare tag data for TagCloud
  // Combine tags from notes and journal entries
  const tagCountMap: Record<string, number> = {};
  for (const note of allNotes) {
    for (const tag of note.tags ?? []) {
      tagCountMap[tag] = (tagCountMap[tag] ?? 0) + 1;
    }
  }
  for (const journal of allJournals) {
    for (const tag of journal.tags ?? []) {
      tagCountMap[tag] = (tagCountMap[tag] ?? 0) + 1;
    }
  }

  const tagData = Object.entries(tagCountMap).map(([name, count]) => ({
    name,
    count,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <BarChart3 className="size-6" />
          Insights
        </h1>
        <p className="text-muted-foreground">
          Visualize your patterns, habits, and trends
        </p>
      </div>

      <InsightsTabs
        moodData={moodData}
        activityData={activityData}
        tagData={tagData}
      />
    </div>
  );
}
