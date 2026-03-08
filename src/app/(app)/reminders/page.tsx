import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { CreateReminderDialog } from "@/components/reminders/create-reminder-dialog";
import { Bell, BellOff, Clock, LinkIcon } from "lucide-react";
import { format, isPast, parseISO } from "date-fns";
import type { Reminder, Todo, Note } from "@/types/database";

export default async function RemindersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: reminders } = await supabase
    .from("reminders")
    .select("*")
    .order("remind_at", { ascending: true });

  const allReminders = (reminders as Reminder[]) || [];

  // Collect linked todo/note ids for display
  const todoIds = allReminders
    .map((r) => r.linked_todo_id)
    .filter(Boolean) as string[];
  const noteIds = allReminders
    .map((r) => r.linked_note_id)
    .filter(Boolean) as string[];

  const [{ data: linkedTodos }, { data: linkedNotes }] = await Promise.all([
    todoIds.length > 0
      ? supabase.from("todos").select("id, title").in("id", todoIds)
      : Promise.resolve({ data: [] as Pick<Todo, "id" | "title">[] }),
    noteIds.length > 0
      ? supabase.from("notes").select("id, title").in("id", noteIds)
      : Promise.resolve({ data: [] as Pick<Note, "id" | "title">[] }),
  ]);

  const todoMap = new Map(
    ((linkedTodos as Pick<Todo, "id" | "title">[]) || []).map((t) => [t.id, t.title])
  );
  const noteMap = new Map(
    ((linkedNotes as Pick<Note, "id" | "title">[]) || []).map((n) => [n.id, n.title])
  );

  const activeReminders = allReminders.filter((r) => !r.is_dismissed);
  const now = new Date();

  const upcoming = activeReminders.filter(
    (r) => !isPast(parseISO(r.remind_at))
  );
  const overdue = activeReminders.filter((r) =>
    isPast(parseISO(r.remind_at))
  );
  const dismissed = allReminders.filter((r) => r.is_dismissed);

  function ReminderCard({ reminder }: { reminder: Reminder }) {
    const remindAt = parseISO(reminder.remind_at);
    const isOverdue = !reminder.is_dismissed && isPast(remindAt);

    return (
      <div
        className={`rounded-lg border p-4 ${
          isOverdue
            ? "border-red-200 bg-red-50/50 dark:border-red-900/50 dark:bg-red-950/20"
            : "bg-card"
        }`}
      >
        <div className="flex items-start gap-3">
          <div
            className={`mt-0.5 rounded-full p-1.5 ${
              isOverdue
                ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                : reminder.is_dismissed
                  ? "bg-muted text-muted-foreground"
                  : "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
            }`}
          >
            {reminder.is_dismissed ? (
              <BellOff className="size-4" />
            ) : (
              <Bell className="size-4" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h3
              className={`text-sm font-medium ${
                reminder.is_dismissed ? "text-muted-foreground line-through" : ""
              }`}
            >
              {reminder.title}
            </h3>

            {reminder.description && (
              <p className="mt-1 text-sm text-muted-foreground">
                {reminder.description}
              </p>
            )}

            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center gap-1 text-xs ${
                  isOverdue
                    ? "font-medium text-red-600 dark:text-red-400"
                    : "text-muted-foreground"
                }`}
              >
                <Clock className="size-3" />
                {format(remindAt, "MMM d, yyyy 'at' h:mm a")}
                {isOverdue && " (overdue)"}
              </span>

              {reminder.recurrence && (
                <Badge variant="secondary" className="text-xs">
                  {reminder.recurrence}
                </Badge>
              )}

              {reminder.linked_todo_id && todoMap.has(reminder.linked_todo_id) && (
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <LinkIcon className="size-3" />
                  Todo: {todoMap.get(reminder.linked_todo_id)}
                </span>
              )}

              {reminder.linked_note_id && noteMap.has(reminder.linked_note_id) && (
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <LinkIcon className="size-3" />
                  Note: {noteMap.get(reminder.linked_note_id)}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Reminders</h1>
          <p className="text-sm text-muted-foreground">
            {activeReminders.length} active &middot; {dismissed.length} dismissed
          </p>
        </div>
        <CreateReminderDialog />
      </div>

      {overdue.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-medium text-red-600 dark:text-red-400">
            <Bell className="size-4" />
            Overdue ({overdue.length})
          </h2>
          <div className="space-y-2">
            {overdue.map((reminder) => (
              <ReminderCard key={reminder.id} reminder={reminder} />
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-medium">
          <Clock className="size-4" />
          Upcoming ({upcoming.length})
        </h2>
        {upcoming.length > 0 ? (
          <div className="space-y-2">
            {upcoming.map((reminder) => (
              <ReminderCard key={reminder.id} reminder={reminder} />
            ))}
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No upcoming reminders.
          </p>
        )}
      </section>

      {dismissed.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <BellOff className="size-4" />
            Dismissed ({dismissed.length})
          </h2>
          <div className="space-y-2">
            {dismissed.map((reminder) => (
              <ReminderCard key={reminder.id} reminder={reminder} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
