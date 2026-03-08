"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { format, subDays, startOfDay, differenceInDays } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronUp,
  Flame,
  Trash2,
  Archive,
  Pencil,
} from "lucide-react";
import { HabitHeatmap } from "@/components/habits/habit-heatmap";
import type { Habit, HabitCompletion } from "@/types/database";

interface HabitRowProps {
  habit: Habit;
  completions: HabitCompletion[];
}

function computeStreak(
  completions: HabitCompletion[],
  targetCount: number
): number {
  const today = startOfDay(new Date());
  const completionMap = new Map<string, number>();
  for (const c of completions) {
    completionMap.set(c.completed_date, c.count);
  }

  let streak = 0;
  // Check today first, then go backwards
  for (let i = 0; i <= completions.length + 1; i++) {
    const date = subDays(today, i);
    const dateStr = format(date, "yyyy-MM-dd");
    const count = completionMap.get(dateStr) || 0;
    if (count >= targetCount) {
      streak++;
    } else if (i === 0) {
      // Today not yet completed is okay, keep checking yesterday
      continue;
    } else {
      break;
    }
  }
  return streak;
}

export function HabitRow({ habit, completions }: HabitRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(habit.name);
  const [editDescription, setEditDescription] = useState(
    habit.description || ""
  );
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const todayCompletion = completions.find(
    (c) => c.completed_date === todayStr
  );
  const isCompletedToday =
    todayCompletion && todayCompletion.count >= habit.target_count;

  const streak = computeStreak(completions, habit.target_count);

  const heatmapData = completions.map((c) => ({
    date: c.completed_date,
    count: c.count,
  }));

  async function toggleToday() {
    setToggling(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    if (todayCompletion) {
      if (todayCompletion.count >= habit.target_count) {
        // Remove completion
        await supabase
          .from("habit_completions")
          .delete()
          .eq("id", todayCompletion.id);
      } else {
        // Increment count
        await supabase
          .from("habit_completions")
          .update({ count: todayCompletion.count + 1 })
          .eq("id", todayCompletion.id);
      }
    } else {
      // Create new completion
      await supabase.from("habit_completions").insert({
        habit_id: habit.id,
        user_id: user.id,
        completed_date: todayStr,
        count: 1,
      });
    }

    setToggling(false);
    router.refresh();
  }

  async function handleDelete() {
    if (!confirm("Delete this habit? This cannot be undone.")) return;
    await supabase.from("habits").delete().eq("id", habit.id);
    router.refresh();
  }

  async function handleArchive() {
    await supabase
      .from("habits")
      .update({ is_archived: !habit.is_archived })
      .eq("id", habit.id);
    router.refresh();
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await supabase
      .from("habits")
      .update({
        name: editName.trim(),
        description: editDescription.trim() || null,
      })
      .eq("id", habit.id);
    setSaving(false);
    setEditing(false);
    router.refresh();
  }

  return (
    <div className="rounded-lg border bg-card">
      <div className="flex items-center gap-3 p-3">
        <button
          onClick={toggleToday}
          disabled={toggling}
          className="shrink-0 transition-colors hover:opacity-80 disabled:opacity-50"
        >
          {isCompletedToday ? (
            <CheckCircle2
              className="size-6"
              style={{ color: habit.color }}
            />
          ) : (
            <Circle className="size-6 text-muted-foreground" />
          )}
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className="inline-block size-2.5 rounded-full shrink-0"
              style={{ backgroundColor: habit.color }}
            />
            <span className="font-medium truncate">{habit.name}</span>
            {habit.target_count > 1 && (
              <Badge variant="secondary" className="text-xs">
                {todayCompletion?.count || 0}/{habit.target_count}
              </Badge>
            )}
          </div>
          {habit.description && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {habit.description}
            </p>
          )}
        </div>

        {streak > 0 && (
          <div className="flex items-center gap-1 text-sm text-orange-500 shrink-0">
            <Flame className="size-4" />
            <span className="font-medium">{streak}</span>
          </div>
        )}

        <Button
          variant="ghost"
          size="icon"
          className="size-8 shrink-0"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? (
            <ChevronUp className="size-4" />
          ) : (
            <ChevronDown className="size-4" />
          )}
        </Button>
      </div>

      {expanded && (
        <div className="border-t px-3 py-3 space-y-3">
          <div className="overflow-x-auto">
            <HabitHeatmap
              completions={heatmapData}
              color={habit.color}
              targetCount={habit.target_count}
            />
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>
              {habit.frequency === "daily" ? "Daily" : "Weekly"} &middot;
              Target: {habit.target_count}x
            </span>
            {streak > 0 && <span>&middot; {streak} day streak</span>}
          </div>

          {editing ? (
            <form onSubmit={handleSaveEdit} className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor={`edit-name-${habit.id}`}>Name</Label>
                <Input
                  id={`edit-name-${habit.id}`}
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`edit-desc-${habit.id}`}>Description</Label>
                <Textarea
                  id={`edit-desc-${habit.id}`}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={saving}>
                  {saving ? "Saving..." : "Save"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditing(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditing(true)}
              >
                <Pencil className="size-3.5" data-icon="inline-start" />
                Edit
              </Button>
              <Button variant="outline" size="sm" onClick={handleArchive}>
                <Archive className="size-3.5" data-icon="inline-start" />
                {habit.is_archived ? "Unarchive" : "Archive"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-destructive"
                onClick={handleDelete}
              >
                <Trash2 className="size-3.5" data-icon="inline-start" />
                Delete
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
