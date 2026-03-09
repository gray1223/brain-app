"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bell, BellOff, Clock, X } from "lucide-react";
import { format, isPast, parseISO } from "date-fns";
import type { Reminder } from "@/types/database";

export function ReminderList({ reminders }: { reminders: Reminder[] }) {
  const router = useRouter();
  const supabase = createClient();
  const [isPending, startTransition] = useTransition();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const activeReminders = reminders.filter(
    (r) => !r.is_dismissed && !dismissed.has(r.id)
  );
  const dismissedReminders = reminders.filter(
    (r) => r.is_dismissed || dismissed.has(r.id)
  );

  const overdue = activeReminders.filter((r) => isPast(parseISO(r.remind_at)));
  const upcoming = activeReminders.filter(
    (r) => !isPast(parseISO(r.remind_at))
  );

  async function handleDismiss(id: string) {
    setDismissed((prev) => new Set(prev).add(id));
    await supabase
      .from("reminders")
      .update({ is_dismissed: true })
      .eq("id", id);
    startTransition(() => router.refresh());
  }

  function ReminderCard({ reminder }: { reminder: Reminder }) {
    const remindAt = parseISO(reminder.remind_at);
    const isOverdue =
      !reminder.is_dismissed && !dismissed.has(reminder.id) && isPast(remindAt);

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
                : reminder.is_dismissed || dismissed.has(reminder.id)
                  ? "bg-muted text-muted-foreground"
                  : "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
            }`}
          >
            {reminder.is_dismissed || dismissed.has(reminder.id) ? (
              <BellOff className="size-4" />
            ) : (
              <Bell className="size-4" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h3
              className={`text-sm font-medium ${
                reminder.is_dismissed || dismissed.has(reminder.id)
                  ? "text-muted-foreground line-through"
                  : ""
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
            </div>
          </div>

          {!reminder.is_dismissed && !dismissed.has(reminder.id) && (
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => handleDismiss(reminder.id)}
              disabled={isPending}
              title="Dismiss"
            >
              <X className="size-3.5" />
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (reminders.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No reminders yet. Create one to get started.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {overdue.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-medium text-red-600 dark:text-red-400">
            <Bell className="size-4" />
            Overdue ({overdue.length})
          </h2>
          <div className="space-y-2">
            {overdue.map((r) => (
              <ReminderCard key={r.id} reminder={r} />
            ))}
          </div>
        </section>
      )}

      {upcoming.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-medium">
            <Clock className="size-4" />
            Upcoming ({upcoming.length})
          </h2>
          <div className="space-y-2">
            {upcoming.map((r) => (
              <ReminderCard key={r.id} reminder={r} />
            ))}
          </div>
        </section>
      )}

      {activeReminders.length === 0 && dismissedReminders.length > 0 && (
        <p className="py-4 text-center text-sm text-muted-foreground">
          No active reminders.
        </p>
      )}

      {dismissedReminders.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <BellOff className="size-4" />
            Dismissed ({dismissedReminders.length})
          </h2>
          <div className="space-y-2">
            {dismissedReminders.map((r) => (
              <ReminderCard key={r.id} reminder={r} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
