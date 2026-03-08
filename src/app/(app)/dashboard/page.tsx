import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { format, startOfDay, endOfDay } from "date-fns";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  Clock,
  StickyNote,
  BookOpen,
  Bell,
  ArrowRight,
} from "lucide-react";
import { TodoCheck } from "@/components/dashboard/todo-check";
import { QuickActions } from "@/components/dashboard/quick-actions";
import Link from "next/link";
import type { Todo, Note, CalendarEvent, JournalEntry, Reminder } from "@/types/database";

const PRIORITY_ORDER: Record<string, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const PRIORITY_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  urgent: "destructive",
  high: "destructive",
  medium: "secondary",
  low: "outline",
};

const MOOD_LABELS: Record<number, string> = {
  1: "Rough",
  2: "Low",
  3: "Okay",
  4: "Good",
  5: "Great",
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
  const todayStart = startOfDay(now).toISOString();
  const todayEnd = endOfDay(now).toISOString();
  const todayDate = format(now, "yyyy-MM-dd");

  const [
    { data: profile },
    { data: todos },
    { data: events },
    { data: notes },
    { data: journalEntry },
    { data: reminders },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single(),
    supabase
      .from("todos")
      .select("*")
      .eq("user_id", user.id)
      .eq("completed", false)
      .order("priority", { ascending: true })
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("calendar_events")
      .select("*")
      .eq("user_id", user.id)
      .gte("start_time", now.toISOString())
      .order("start_time", { ascending: true })
      .limit(3),
    supabase
      .from("notes")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_archived", false)
      .order("updated_at", { ascending: false })
      .limit(3),
    supabase
      .from("journal_entries")
      .select("*")
      .eq("user_id", user.id)
      .eq("date", todayDate)
      .maybeSingle(),
    supabase
      .from("reminders")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_dismissed", false)
      .lte("remind_at", todayEnd)
      .order("remind_at", { ascending: true }),
  ]);

  const displayName = profile?.display_name || user.email?.split("@")[0] || "there";

  // Sort todos by priority order then take top 5
  const sortedTodos = (todos as Todo[] | null)
    ?.sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 2) - (PRIORITY_ORDER[b.priority] ?? 2))
    .slice(0, 5) ?? [];

  const upcomingEvents = (events as CalendarEvent[] | null) ?? [];
  const recentNotes = (notes as Note[] | null) ?? [];
  const todayJournal = journalEntry as JournalEntry | null;
  const activeReminders = (reminders as Reminder[] | null) ?? [];

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Good {getGreetingPeriod(now)}, {displayName}
        </h1>
        <p className="text-muted-foreground">
          {format(now, "EEEE, MMMM d, yyyy")}
        </p>
      </div>

      {/* Dashboard Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Today's Focus */}
        <Card className="md:col-span-2 lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="size-5" />
              Today&apos;s Focus
            </CardTitle>
            <CardDescription>
              {sortedTodos.length > 0
                ? `${sortedTodos.length} task${sortedTodos.length !== 1 ? "s" : ""} to tackle`
                : "No pending tasks"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sortedTodos.length > 0 ? (
              <ul className="space-y-3">
                {sortedTodos.map((todo) => (
                  <li key={todo.id} className="flex items-center gap-3">
                    <TodoCheck todoId={todo.id} completed={todo.completed} />
                    <span className="flex-1 text-sm">{todo.title}</span>
                    <Badge variant={PRIORITY_VARIANT[todo.priority] ?? "secondary"}>
                      {todo.priority}
                    </Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                All caught up! Add some tasks to get started.
              </p>
            )}
            {(todos?.length ?? 0) > 5 && (
              <Link
                href="/todos"
                className="mt-3 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
              >
                View all tasks <ArrowRight className="size-3" />
              </Link>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Quick Actions
            </CardTitle>
            <CardDescription>Jump right in</CardDescription>
          </CardHeader>
          <CardContent>
            <QuickActions />
          </CardContent>
        </Card>

        {/* Upcoming Events */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="size-5" />
              Upcoming
            </CardTitle>
            <CardDescription>Next events on your calendar</CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingEvents.length > 0 ? (
              <ul className="space-y-3">
                {upcomingEvents.map((event) => (
                  <li key={event.id} className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium">{event.title}</span>
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
            <Link
              href="/calendar"
              className="mt-3 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              View calendar <ArrowRight className="size-3" />
            </Link>
          </CardContent>
        </Card>

        {/* Recent Notes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <StickyNote className="size-5" />
              Recent Notes
            </CardTitle>
            <CardDescription>Your latest notes</CardDescription>
          </CardHeader>
          <CardContent>
            {recentNotes.length > 0 ? (
              <ul className="space-y-3">
                {recentNotes.map((note) => (
                  <li key={note.id}>
                    <Link
                      href={`/notes/${note.id}`}
                      className="group flex flex-col gap-0.5"
                    >
                      <span className="text-sm font-medium group-hover:underline">
                        {note.title}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(note.updated_at), "MMM d, h:mm a")}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                No notes yet. Create your first note!
              </p>
            )}
            <Link
              href="/notes"
              className="mt-3 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              View all notes <ArrowRight className="size-3" />
            </Link>
          </CardContent>
        </Card>

        {/* Journal */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="size-5" />
              Journal
            </CardTitle>
            <CardDescription>{format(now, "MMMM d, yyyy")}</CardDescription>
          </CardHeader>
          <CardContent>
            {todayJournal ? (
              <div className="space-y-2">
                {todayJournal.mood && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Mood:</span>
                    <Badge variant="secondary">
                      {MOOD_LABELS[todayJournal.mood] ?? todayJournal.mood}
                    </Badge>
                  </div>
                )}
                <Link
                  href={`/journal/${todayDate}`}
                  className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                >
                  View entry <ArrowRight className="size-3" />
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  You haven&apos;t written today. How are you feeling?
                </p>
                <Link
                  href={`/journal/${todayDate}`}
                  className="flex items-center gap-1 text-sm font-medium hover:underline"
                >
                  Start writing <ArrowRight className="size-3" />
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Active Reminders */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="size-5" />
              Active Reminders
            </CardTitle>
            <CardDescription>Due today or overdue</CardDescription>
          </CardHeader>
          <CardContent>
            {activeReminders.length > 0 ? (
              <ul className="space-y-3">
                {activeReminders.map((reminder) => {
                  const isOverdue = new Date(reminder.remind_at) < new Date(todayStart);
                  return (
                    <li key={reminder.id} className="flex items-center gap-2">
                      <Bell className="size-4 shrink-0 text-muted-foreground" />
                      <span className="flex-1 text-sm">{reminder.title}</span>
                      {isOverdue && (
                        <Badge variant="destructive">Overdue</Badge>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                No reminders due today.
              </p>
            )}
            <Link
              href="/reminders"
              className="mt-3 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              View all reminders <ArrowRight className="size-3" />
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function getGreetingPeriod(date: Date): string {
  const hour = date.getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}
