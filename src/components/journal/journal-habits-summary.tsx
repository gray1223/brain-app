"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import type { Habit, HabitCompletion } from "@/types/database";

interface HabitWithCompletion extends Habit {
  completion: HabitCompletion | null;
}

export function JournalHabitsSummary({ date }: { date: string }) {
  const [habits, setHabits] = useState<HabitWithCompletion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHabits() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      const [{ data: habitsData }, { data: completionsData }] =
        await Promise.all([
          supabase
            .from("habits")
            .select("*")
            .eq("user_id", user.id)
            .eq("is_archived", false)
            .order("order_index", { ascending: true }),
          supabase
            .from("habit_completions")
            .select("*")
            .eq("user_id", user.id)
            .eq("completed_date", date),
        ]);

      const allHabits = (habitsData ?? []) as Habit[];
      const allCompletions = (completionsData ?? []) as HabitCompletion[];

      const merged: HabitWithCompletion[] = allHabits.map((habit) => ({
        ...habit,
        completion:
          allCompletions.find((c) => c.habit_id === habit.id) ?? null,
      }));

      setHabits(merged);
      setLoading(false);
    }

    fetchHabits();
  }, [date]);

  if (loading) {
    return (
      <Card className="p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading habits...
        </div>
      </Card>
    );
  }

  if (habits.length === 0) {
    return null;
  }

  const completed = habits.filter(
    (h) => h.completion && h.completion.count >= h.target_count
  ).length;

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-medium">Today&apos;s Habits</h3>
        <span className="text-xs text-muted-foreground">
          {completed}/{habits.length} done
        </span>
      </div>
      <div className="flex flex-col gap-2">
        {habits.map((habit) => {
          const isDone =
            habit.completion && habit.completion.count >= habit.target_count;
          const count = habit.completion?.count ?? 0;

          return (
            <div
              key={habit.id}
              className="flex items-center gap-2.5"
            >
              {isDone ? (
                <CheckCircle2
                  className="size-4 shrink-0"
                  style={{ color: habit.color }}
                />
              ) : (
                <Circle className="size-4 shrink-0 text-muted-foreground/40" />
              )}
              <span
                className={`text-sm ${
                  isDone ? "text-muted-foreground" : ""
                }`}
              >
                {habit.name}
              </span>
              {habit.target_count > 1 && (
                <span className="ml-auto text-xs text-muted-foreground">
                  {count}/{habit.target_count}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
