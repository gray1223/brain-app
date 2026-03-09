"use client";

import { useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { HabitRow } from "@/components/habits/habit-row";
import type { Habit, HabitCompletion } from "@/types/database";

interface HabitListProps {
  habits: Habit[];
  completionsMap: Record<string, HabitCompletion[]>;
}

export function HabitList({ habits, completionsMap }: HabitListProps) {
  const [orderedHabits, setOrderedHabits] = useState(habits);
  const router = useRouter();
  const supabase = createClient();

  const handleReorder = useCallback(
    async (habitId: string, direction: "up" | "down") => {
      const idx = orderedHabits.findIndex((h) => h.id === habitId);
      if (idx === -1) return;

      const swapIdx = direction === "up" ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= orderedHabits.length) return;

      const newOrder = [...orderedHabits];
      [newOrder[idx], newOrder[swapIdx]] = [newOrder[swapIdx], newOrder[idx]];
      setOrderedHabits(newOrder);

      // Persist new order_index values
      const updates = newOrder.map((h, i) => ({
        id: h.id,
        order_index: i,
      }));

      for (const u of updates) {
        await supabase
          .from("habits")
          .update({ order_index: u.order_index })
          .eq("id", u.id);
      }

      router.refresh();
    },
    [orderedHabits, supabase, router]
  );

  return (
    <div className="space-y-2">
      {orderedHabits.map((habit, idx) => (
        <HabitRow
          key={habit.id}
          habit={habit}
          completions={completionsMap[habit.id] || []}
          isFirst={idx === 0}
          isLast={idx === orderedHabits.length - 1}
          onReorder={handleReorder}
        />
      ))}
    </div>
  );
}
