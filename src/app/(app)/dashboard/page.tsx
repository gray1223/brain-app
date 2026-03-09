import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import {
  format,
  subDays,
  endOfDay,
  startOfWeek,
  startOfMonth,
} from "date-fns";
import { LifeDashboard } from "@/components/life/life-dashboard";
import { StreakHeatmapWidget } from "@/components/dashboard/streak-heatmap-widget";
import type {
  Profile,
  Todo,
  Note,
  CalendarEvent,
  JournalEntry,
  Habit,
  HabitCompletion,
  Reminder,
} from "@/types/database";

const PRIORITY_ORDER: Record<string, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const now = new Date();
  const todayStr = format(now, "yyyy-MM-dd");
  const todayEnd = endOfDay(now).toISOString();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 }).toISOString();

  const [
    { data: profile },
    { data: notes },
    { data: todos },
    { data: journalEntry },
    { data: events },
    { data: habits },
    { data: habitCompletions },
    { data: reminders },
    { data: recentJournals },
    capturesResult,
    totalNotesResult,
    completedTodosWeekResult,
    journalEntriesMonthResult,
    activeProjectsResult,
    { data: heatmapNotes },
    { data: heatmapTodos },
    { data: heatmapJournals },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("notes")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_archived", false)
      .order("updated_at", { ascending: false })
      .limit(5),
    supabase
      .from("todos")
      .select("*")
      .eq("user_id", user.id)
      .eq("completed", false)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("journal_entries")
      .select("*")
      .eq("user_id", user.id)
      .eq("date", todayStr)
      .maybeSingle(),
    supabase
      .from("calendar_events")
      .select("*")
      .eq("user_id", user.id)
      .gte("start_time", now.toISOString())
      .order("start_time", { ascending: true })
      .limit(5),
    supabase
      .from("habits")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_archived", false)
      .order("created_at", { ascending: true }),
    supabase
      .from("habit_completions")
      .select("*")
      .eq("user_id", user.id)
      .eq("completed_date", todayStr),
    supabase
      .from("reminders")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_dismissed", false)
      .lte("remind_at", todayEnd)
      .order("remind_at", { ascending: true }),
    supabase
      .from("journal_entries")
      .select("date")
      .eq("user_id", user.id)
      .gte("date", format(subDays(now, 90), "yyyy-MM-dd"))
      .order("date", { ascending: false }),
    supabase
      .from("captures")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("processed", false),
    supabase
      .from("notes")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_archived", false),
    supabase
      .from("todos")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("completed", true)
      .gte("completed_at", weekStart),
    supabase
      .from("journal_entries")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("date", format(startOfMonth(now), "yyyy-MM-dd")),
    supabase
      .from("projects")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "active"),
    // Activity data for heatmap (notes updated, todos completed, journal entries - last 91 days)
    supabase
      .from("notes")
      .select("updated_at")
      .eq("user_id", user.id)
      .gte("updated_at", format(subDays(now, 91), "yyyy-MM-dd")),
    supabase
      .from("todos")
      .select("completed_at")
      .eq("user_id", user.id)
      .eq("completed", true)
      .gte("completed_at", format(subDays(now, 91), "yyyy-MM-dd")),
    supabase
      .from("journal_entries")
      .select("date")
      .eq("user_id", user.id)
      .gte("date", format(subDays(now, 91), "yyyy-MM-dd")),
  ]);

  const sortedTodos = ((todos as Todo[] | null) ?? [])
    .sort(
      (a, b) =>
        (PRIORITY_ORDER[a.priority] ?? 2) - (PRIORITY_ORDER[b.priority] ?? 2)
    )
    .slice(0, 10);

  // Compute journal streak
  const journalDates = new Set(
    ((recentJournals as { date: string }[] | null) ?? []).map((j) => j.date)
  );
  let currentStreak = 0;
  for (let i = 0; i <= 90; i++) {
    const checkDate = format(subDays(now, i), "yyyy-MM-dd");
    if (journalDates.has(checkDate)) {
      currentStreak++;
    } else if (i === 0) {
      continue;
    } else {
      break;
    }
  }

  // Build activity map for heatmap
  const activityMap: Record<string, number> = {};
  for (const n of (heatmapNotes as { updated_at: string }[] | null) ?? []) {
    const d = format(new Date(n.updated_at), "yyyy-MM-dd");
    activityMap[d] = (activityMap[d] ?? 0) + 1;
  }
  for (const t of (heatmapTodos as { completed_at: string }[] | null) ?? []) {
    const d = format(new Date(t.completed_at), "yyyy-MM-dd");
    activityMap[d] = (activityMap[d] ?? 0) + 1;
  }
  for (const j of (heatmapJournals as { date: string }[] | null) ?? []) {
    activityMap[j.date] = (activityMap[j.date] ?? 0) + 1;
  }

  return (
    <>
      <LifeDashboard
        profile={(profile as Profile) ?? null}
        recentNotes={(notes as Note[] | null) ?? []}
        incompleteTodos={sortedTodos}
        todayJournal={(journalEntry as JournalEntry | null) ?? null}
        upcomingEvents={(events as CalendarEvent[] | null) ?? []}
        habits={(habits as Habit[] | null) ?? []}
        habitCompletions={(habitCompletions as HabitCompletion[] | null) ?? []}
        activeReminders={(reminders as Reminder[] | null) ?? []}
        currentStreak={currentStreak}
        unprocessedCaptureCount={capturesResult.count ?? 0}
        quickStats={{
          totalNotes: totalNotesResult.count ?? 0,
          completedTodosThisWeek: completedTodosWeekResult.count ?? 0,
          journalEntriesThisMonth: journalEntriesMonthResult.count ?? 0,
          activeProjectsCount: activeProjectsResult.count ?? 0,
        }}
        streakHeatmap={
          <StreakHeatmapWidget activityMap={activityMap} currentStreak={currentStreak} />
        }
      />
    </>
  );
}
