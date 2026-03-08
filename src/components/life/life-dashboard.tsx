"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format, subDays, isToday } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { WidgetCard } from "@/components/life/widget-card";
import {
  Clock,
  CheckCircle2,
  Smile,
  Target,
  CalendarDays,
  StickyNote,
  Flame,
  BarChart3,
  Bell,
  Inbox,
  Quote,
  X,
  Circle,
  ArrowRight,
} from "lucide-react";
import type {
  Profile,
  Todo,
  JournalEntry,
  CalendarEvent,
  Note,
  Habit,
  HabitCompletion,
  Reminder,
} from "@/types/database";

// --- Types ---

interface LifeDashboardProps {
  profile: Profile | null;
  recentNotes: Note[];
  incompleteTodos: Todo[];
  todayJournal: JournalEntry | null;
  upcomingEvents: CalendarEvent[];
  habits: Habit[];
  habitCompletions: HabitCompletion[];
  activeReminders: Reminder[];
  currentStreak: number;
  unprocessedCaptureCount: number;
  quickStats: {
    totalNotes: number;
    completedTodosThisWeek: number;
    journalEntriesThisMonth: number;
    activeProjectsCount: number;
  };
}

// --- Quotes ---

const QUOTES = [
  "The secret of getting ahead is getting started. - Mark Twain",
  "It is never too late to be what you might have been. - George Eliot",
  "The only way to do great work is to love what you do. - Steve Jobs",
  "Believe you can and you're halfway there. - Theodore Roosevelt",
  "What you get by achieving your goals is not as important as what you become by achieving your goals. - Zig Ziglar",
  "Start where you are. Use what you have. Do what you can. - Arthur Ashe",
  "The best time to plant a tree was 20 years ago. The second best time is now. - Chinese Proverb",
  "Your limitation - it's only your imagination.",
  "Push yourself, because no one else is going to do it for you.",
  "Great things never come from comfort zones.",
  "Dream it. Wish it. Do it.",
  "Success doesn't just find you. You have to go out and get it.",
  "The harder you work for something, the greater you'll feel when you achieve it.",
  "Don't stop when you're tired. Stop when you're done.",
  "Wake up with determination. Go to bed with satisfaction.",
  "Do something today that your future self will thank you for.",
  "Little things make big days.",
  "It's going to be hard, but hard does not mean impossible.",
  "Don't wait for opportunity. Create it.",
  "Sometimes we're tested not to show our weaknesses, but to discover our strengths.",
];

const MOOD_EMOJIS: { value: number; emoji: string; label: string }[] = [
  { value: 1, emoji: "\ud83d\ude1e", label: "Rough" },
  { value: 2, emoji: "\ud83d\ude15", label: "Low" },
  { value: 3, emoji: "\ud83d\ude10", label: "Okay" },
  { value: 4, emoji: "\ud83d\ude0a", label: "Good" },
  { value: 5, emoji: "\ud83d\ude04", label: "Great" },
];

// --- Helper ---

function getGreeting(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function getQuoteOfTheDay(): string {
  const now = new Date();
  const dayOfYear = Math.floor(
    (now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) /
      (1000 * 60 * 60 * 24)
  );
  return QUOTES[dayOfYear % QUOTES.length];
}

// --- Component ---

export function LifeDashboard({
  profile,
  recentNotes,
  incompleteTodos,
  todayJournal,
  upcomingEvents,
  habits,
  habitCompletions,
  activeReminders,
  currentStreak,
  unprocessedCaptureCount,
  quickStats,
}: LifeDashboardProps) {
  const router = useRouter();
  const supabase = createClient();
  const [isPending, startTransition] = useTransition();

  // Clock state
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Local mood state
  const [selectedMood, setSelectedMood] = useState<number | null>(
    todayJournal?.mood ?? null
  );

  // Local todo state for optimistic UI
  const [todoStates, setTodoStates] = useState<Record<string, boolean>>({});

  // Local habit completion state
  const [habitToggles, setHabitToggles] = useState<Record<string, boolean>>({});

  // Local dismissed reminders
  const [dismissedReminders, setDismissedReminders] = useState<Set<string>>(
    new Set()
  );

  const displayName =
    profile?.display_name || profile?.email?.split("@")[0] || "there";

  const todayStr = format(new Date(), "yyyy-MM-dd");

  // Build habit completion map
  const completionsByHabit = new Map<string, HabitCompletion[]>();
  for (const c of habitCompletions) {
    const existing = completionsByHabit.get(c.habit_id) || [];
    existing.push(c);
    completionsByHabit.set(c.habit_id, existing);
  }

  // --- Handlers ---

  async function handleTodoToggle(todoId: string, currentCompleted: boolean) {
    setTodoStates((prev) => ({ ...prev, [todoId]: !currentCompleted }));

    await supabase
      .from("todos")
      .update({
        completed: !currentCompleted,
        completed_at: !currentCompleted ? new Date().toISOString() : null,
      })
      .eq("id", todoId);

    startTransition(() => router.refresh());
  }

  async function handleMoodSelect(mood: number) {
    setSelectedMood(mood);

    if (todayJournal) {
      await supabase
        .from("journal_entries")
        .update({ mood })
        .eq("id", todayJournal.id);
    } else {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from("journal_entries").insert({
        user_id: user.id,
        date: todayStr,
        mood,
        content: null,
        tags: [],
      });
    }

    startTransition(() => router.refresh());
  }

  async function handleHabitToggle(habit: Habit) {
    const hCompletions = completionsByHabit.get(habit.id) || [];
    const todayCompletion = hCompletions.find(
      (c) => c.completed_date === todayStr
    );
    const isCurrentlyComplete =
      todayCompletion && todayCompletion.count >= habit.target_count;

    // Optimistic toggle
    setHabitToggles((prev) => ({
      ...prev,
      [habit.id]: !isCurrentlyComplete,
    }));

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    if (todayCompletion) {
      if (isCurrentlyComplete) {
        await supabase
          .from("habit_completions")
          .delete()
          .eq("id", todayCompletion.id);
      } else {
        await supabase
          .from("habit_completions")
          .update({ count: todayCompletion.count + 1 })
          .eq("id", todayCompletion.id);
      }
    } else {
      await supabase.from("habit_completions").insert({
        habit_id: habit.id,
        user_id: user.id,
        completed_date: todayStr,
        count: 1,
      });
    }

    startTransition(() => router.refresh());
  }

  async function handleDismissReminder(reminderId: string) {
    setDismissedReminders((prev) => new Set(prev).add(reminderId));

    await supabase
      .from("reminders")
      .update({ is_dismissed: true })
      .eq("id", reminderId);

    startTransition(() => router.refresh());
  }

  // Compute which habits are completed today (considering local toggles)
  function isHabitDoneToday(habit: Habit): boolean {
    if (habitToggles[habit.id] !== undefined) return habitToggles[habit.id];
    const hCompletions = completionsByHabit.get(habit.id) || [];
    const todayCompletion = hCompletions.find(
      (c) => c.completed_date === todayStr
    );
    return !!(todayCompletion && todayCompletion.count >= habit.target_count);
  }

  const visibleReminders = activeReminders.filter(
    (r) => !dismissedReminders.has(r.id)
  );

  return (
    <div className="space-y-6">
      {/* Page title is subtle since the clock widget acts as the hero */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Life Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Everything at a glance
        </p>
      </div>

      {/* Widget Grid */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {/* Clock & Date Widget */}
        <WidgetCard
          title="Clock"
          icon={Clock}
          className="md:col-span-2 lg:col-span-1"
        >
          <div className="text-center space-y-1">
            <p className="text-4xl font-bold tabular-nums tracking-tight">
              {format(now, "h:mm:ss a")}
            </p>
            <p className="text-sm text-muted-foreground">
              {format(now, "EEEE, MMMM d, yyyy")}
            </p>
            <p className="text-base font-medium">
              {getGreeting(now.getHours())}, {displayName}
            </p>
          </div>
        </WidgetCard>

        {/* Today's Focus Widget */}
        <WidgetCard
          title="Today's Focus"
          icon={CheckCircle2}
          href="/todos"
          className="md:col-span-1 lg:col-span-1"
        >
          {incompleteTodos.length > 0 ? (
            <ul className="space-y-2.5">
              {incompleteTodos.slice(0, 5).map((todo) => {
                const isChecked =
                  todoStates[todo.id] !== undefined
                    ? todoStates[todo.id]
                    : todo.completed;
                return (
                  <li key={todo.id} className="flex items-center gap-2.5">
                    <Checkbox
                      checked={isChecked}
                      onCheckedChange={() =>
                        handleTodoToggle(todo.id, todo.completed)
                      }
                      disabled={isPending}
                    />
                    <span
                      className={`flex-1 text-sm truncate ${
                        isChecked
                          ? "line-through text-muted-foreground"
                          : ""
                      }`}
                    >
                      {todo.title}
                    </span>
                    <Badge
                      variant={
                        todo.priority === "urgent" || todo.priority === "high"
                          ? "destructive"
                          : todo.priority === "medium"
                          ? "secondary"
                          : "outline"
                      }
                      className="text-xs shrink-0"
                    >
                      {todo.priority}
                    </Badge>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              All caught up! No pending tasks.
            </p>
          )}
        </WidgetCard>

        {/* Mood Tracker Widget */}
        <WidgetCard title="Mood Tracker" icon={Smile} href={`/journal/${todayStr}`}>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {selectedMood
                ? `Feeling ${MOOD_EMOJIS.find((m) => m.value === selectedMood)?.label?.toLowerCase() ?? ""} today`
                : "How are you feeling today?"}
            </p>
            <div className="flex items-center justify-between gap-1">
              {MOOD_EMOJIS.map((mood) => (
                <button
                  key={mood.value}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleMoodSelect(mood.value);
                  }}
                  className={`flex flex-col items-center gap-1 rounded-lg px-2 py-1.5 transition-all hover:bg-accent ${
                    selectedMood === mood.value
                      ? "bg-accent ring-2 ring-primary/20 scale-110"
                      : ""
                  }`}
                  title={mood.label}
                >
                  <span className="text-2xl">{mood.emoji}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {mood.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </WidgetCard>

        {/* Habits Today Widget */}
        <WidgetCard title="Habits Today" icon={Target} href="/habits">
          {habits.length > 0 ? (
            <ul className="space-y-2">
              {habits.map((habit) => {
                const done = isHabitDoneToday(habit);
                return (
                  <li key={habit.id} className="flex items-center gap-2.5">
                    <button
                      onClick={() => handleHabitToggle(habit)}
                      className="shrink-0 transition-colors hover:opacity-80"
                    >
                      {done ? (
                        <CheckCircle2
                          className="size-5"
                          style={{ color: habit.color }}
                        />
                      ) : (
                        <Circle className="size-5 text-muted-foreground" />
                      )}
                    </button>
                    <span
                      className={`flex-1 text-sm truncate ${
                        done ? "line-through text-muted-foreground" : ""
                      }`}
                    >
                      {habit.name}
                    </span>
                    <span
                      className="inline-block size-2 rounded-full shrink-0"
                      style={{ backgroundColor: habit.color }}
                    />
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              No active habits. Create one to get started!
            </p>
          )}
        </WidgetCard>

        {/* Upcoming Events Widget */}
        <WidgetCard title="Upcoming Events" icon={CalendarDays} href="/calendar">
          {upcomingEvents.length > 0 ? (
            <ul className="space-y-2.5">
              {upcomingEvents.map((event) => (
                <li key={event.id} className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium truncate">
                    {event.title}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {event.all_day
                      ? format(new Date(event.start_time), "MMM d")
                      : `${format(new Date(event.start_time), "MMM d, h:mm a")} - ${format(new Date(event.end_time), "h:mm a")}`}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              No upcoming events.
            </p>
          )}
        </WidgetCard>

        {/* Recent Notes Widget */}
        <WidgetCard title="Recent Notes" icon={StickyNote} href="/notes">
          {recentNotes.length > 0 ? (
            <ul className="space-y-2">
              {recentNotes.map((note) => (
                <li key={note.id}>
                  <Link
                    href={`/notes/${note.id}`}
                    className="group flex items-center justify-between gap-2"
                  >
                    <span className="text-sm truncate group-hover:underline">
                      {note.title}
                    </span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {format(new Date(note.updated_at), "MMM d")}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              No notes yet.
            </p>
          )}
        </WidgetCard>

        {/* Journal Streak Widget */}
        <WidgetCard
          title="Journal Streak"
          icon={Flame}
          href={`/journal/${todayStr}`}
        >
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Flame
                className={`size-8 ${
                  currentStreak > 0
                    ? "text-orange-500"
                    : "text-muted-foreground"
                }`}
              />
              <div>
                <p className="text-2xl font-bold tabular-nums">
                  {currentStreak}
                </p>
                <p className="text-xs text-muted-foreground">
                  {currentStreak === 1 ? "day" : "days"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 ml-auto">
              {Array.from({ length: 7 }).map((_, i) => {
                const day = subDays(new Date(), 6 - i);
                // We check if there's a journal entry for this day
                // Since we only have todayJournal from props, we approximate
                const isDayToday = isToday(day);
                const hasEntry = isDayToday && todayJournal !== null;
                return (
                  <div
                    key={i}
                    className={`size-3 rounded-full ${
                      hasEntry
                        ? "bg-orange-500"
                        : isDayToday
                        ? "bg-muted-foreground/30"
                        : "bg-muted"
                    }`}
                    title={format(day, "EEE, MMM d")}
                  />
                );
              })}
            </div>
          </div>
        </WidgetCard>

        {/* Quick Stats Widget */}
        <WidgetCard title="Quick Stats" icon={BarChart3}>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-muted/50 p-2.5 text-center">
              <p className="text-xl font-bold tabular-nums">
                {quickStats.totalNotes}
              </p>
              <p className="text-[11px] text-muted-foreground">Total Notes</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-2.5 text-center">
              <p className="text-xl font-bold tabular-nums">
                {quickStats.completedTodosThisWeek}
              </p>
              <p className="text-[11px] text-muted-foreground">
                Todos This Week
              </p>
            </div>
            <div className="rounded-lg bg-muted/50 p-2.5 text-center">
              <p className="text-xl font-bold tabular-nums">
                {quickStats.journalEntriesThisMonth}
              </p>
              <p className="text-[11px] text-muted-foreground">
                Journal This Month
              </p>
            </div>
            <div className="rounded-lg bg-muted/50 p-2.5 text-center">
              <p className="text-xl font-bold tabular-nums">
                {quickStats.activeProjectsCount}
              </p>
              <p className="text-[11px] text-muted-foreground">
                Active Projects
              </p>
            </div>
          </div>
        </WidgetCard>

        {/* Reminders Widget */}
        <WidgetCard title="Reminders" icon={Bell} href="/reminders">
          {visibleReminders.length > 0 ? (
            <ul className="space-y-2">
              {visibleReminders.map((reminder) => (
                <li
                  key={reminder.id}
                  className="flex items-center gap-2"
                >
                  <Bell className="size-3.5 text-muted-foreground shrink-0" />
                  <span className="flex-1 text-sm truncate">
                    {reminder.title}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-6 shrink-0"
                    onClick={() => handleDismissReminder(reminder.id)}
                  >
                    <X className="size-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              No active reminders.
            </p>
          )}
        </WidgetCard>

        {/* Inbox Count Widget */}
        <WidgetCard title="Inbox" icon={Inbox} href="/inbox">
          <div className="flex items-center gap-3">
            <div
              className={`flex items-center justify-center size-12 rounded-full ${
                unprocessedCaptureCount > 0
                  ? "bg-primary/10 text-primary"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              <span className="text-lg font-bold tabular-nums">
                {unprocessedCaptureCount}
              </span>
            </div>
            <div>
              <p className="text-sm font-medium">
                {unprocessedCaptureCount === 0
                  ? "Inbox zero!"
                  : `${unprocessedCaptureCount} unprocessed`}
              </p>
              <p className="text-xs text-muted-foreground">
                {unprocessedCaptureCount > 0
                  ? "Captures waiting to be processed"
                  : "All captures have been processed"}
              </p>
            </div>
          </div>
        </WidgetCard>

        {/* Quote of the Day Widget */}
        <WidgetCard
          title="Quote of the Day"
          icon={Quote}
          className="md:col-span-2 lg:col-span-1"
        >
          <blockquote className="text-sm italic text-muted-foreground leading-relaxed">
            &ldquo;{getQuoteOfTheDay()}&rdquo;
          </blockquote>
        </WidgetCard>
      </div>
    </div>
  );
}
