import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { subDays, format } from "date-fns";
import { Target } from "lucide-react";
import { HabitRow } from "@/components/habits/habit-row";
import { CreateHabitDialog } from "@/components/habits/create-habit-dialog";
import type { Habit, HabitCompletion } from "@/types/database";

export default async function HabitsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const ninetyDaysAgo = format(subDays(new Date(), 90), "yyyy-MM-dd");

  const [{ data: habits }, { data: completions }] = await Promise.all([
    supabase
      .from("habits")
      .select("*")
      .eq("is_archived", false)
      .order("created_at", { ascending: true }),
    supabase
      .from("habit_completions")
      .select("*")
      .gte("completed_date", ninetyDaysAgo)
      .order("completed_date", { ascending: true }),
  ]);

  const allHabits = (habits as Habit[]) || [];
  const allCompletions = (completions as HabitCompletion[]) || [];

  const completionsByHabit = new Map<string, HabitCompletion[]>();
  for (const c of allCompletions) {
    const existing = completionsByHabit.get(c.habit_id) || [];
    existing.push(c);
    completionsByHabit.set(c.habit_id, existing);
  }

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const completedToday = allHabits.filter((h) => {
    const hCompletions = completionsByHabit.get(h.id) || [];
    const todayC = hCompletions.find((c) => c.completed_date === todayStr);
    return todayC && todayC.count >= h.target_count;
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Habits</h1>
          <p className="text-sm text-muted-foreground">
            {completedToday.length}/{allHabits.length} completed today
          </p>
        </div>
        <CreateHabitDialog />
      </div>

      {allHabits.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Target className="size-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium">No habits yet</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Create your first habit to start tracking your progress.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {allHabits.map((habit) => (
            <HabitRow
              key={habit.id}
              habit={habit}
              completions={completionsByHabit.get(habit.id) || []}
            />
          ))}
        </div>
      )}
    </div>
  );
}
