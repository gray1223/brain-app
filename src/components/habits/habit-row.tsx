"use client";

import { useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { format, subDays, startOfDay } from "date-fns";
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
  ArrowUp,
  ArrowDown,
  MessageSquare,
  TrendingUp,
  BarChart3,
} from "lucide-react";
import { HabitHeatmap } from "@/components/habits/habit-heatmap";
import { HabitWeeklyChart } from "@/components/habits/habit-weekly-chart";
import type { Habit, HabitCompletion } from "@/types/database";

interface HabitRowProps {
  habit: Habit;
  completions: HabitCompletion[];
  isFirst: boolean;
  isLast: boolean;
  onReorder: (habitId: string, direction: "up" | "down") => void;
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
  for (let i = 0; i <= completions.length + 1; i++) {
    const date = subDays(today, i);
    const dateStr = format(date, "yyyy-MM-dd");
    const count = completionMap.get(dateStr) || 0;
    if (count >= targetCount) {
      streak++;
    } else if (i === 0) {
      continue;
    } else {
      break;
    }
  }
  return streak;
}

function computeLongestStreak(
  completions: HabitCompletion[],
  targetCount: number
): number {
  if (completions.length === 0) return 0;

  const sortedDates = completions
    .filter((c) => c.count >= targetCount)
    .map((c) => c.completed_date)
    .sort();

  if (sortedDates.length === 0) return 0;

  let longest = 1;
  let current = 1;

  for (let i = 1; i < sortedDates.length; i++) {
    const prev = new Date(sortedDates[i - 1]);
    const curr = new Date(sortedDates[i]);
    const diffDays = Math.round(
      (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (diffDays === 1) {
      current++;
      longest = Math.max(longest, current);
    } else if (diffDays > 1) {
      current = 1;
    }
  }

  return longest;
}

function computeCompletionRate(
  completions: HabitCompletion[],
  targetCount: number,
  days: number
): number {
  const today = startOfDay(new Date());
  const completionMap = new Map<string, number>();
  for (const c of completions) {
    completionMap.set(c.completed_date, c.count);
  }

  let completed = 0;
  for (let i = 0; i < days; i++) {
    const dateStr = format(subDays(today, i), "yyyy-MM-dd");
    const count = completionMap.get(dateStr) || 0;
    if (count >= targetCount) completed++;
  }
  return Math.round((completed / days) * 100);
}

export function HabitRow({
  habit,
  completions,
  isFirst,
  isLast,
  onReorder,
}: HabitRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(habit.name);
  const [editDescription, setEditDescription] = useState(
    habit.description || ""
  );
  const [saving, setSaving] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [showNotes, setShowNotes] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const todayCompletion = completions.find(
    (c) => c.completed_date === todayStr
  );
  const isCompletedToday =
    todayCompletion && todayCompletion.count >= habit.target_count;

  const streak = computeStreak(completions, habit.target_count);
  const longestStreak = computeLongestStreak(completions, habit.target_count);
  const rate7 = computeCompletionRate(completions, habit.target_count, 7);
  const rate30 = computeCompletionRate(completions, habit.target_count, 30);
  const rate90 = computeCompletionRate(completions, habit.target_count, 90);

  const heatmapData = completions.map((c) => ({
    date: c.completed_date,
    count: c.count,
  }));

  const recentNotes = useMemo(() => {
    return completions
      .filter((c) => c.note && c.note.trim().length > 0)
      .sort(
        (a, b) =>
          new Date(b.completed_date).getTime() -
          new Date(a.completed_date).getTime()
      )
      .slice(0, 10);
  }, [completions]);

  async function toggleToday() {
    setToggling(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    if (todayCompletion) {
      if (todayCompletion.count >= habit.target_count) {
        await supabase
          .from("habit_completions")
          .delete()
          .eq("id", todayCompletion.id);
      } else {
        const updateData: { count: number; note?: string } = {
          count: todayCompletion.count + 1,
        };
        if (noteText.trim()) {
          updateData.note = noteText.trim();
        }
        await supabase
          .from("habit_completions")
          .update(updateData)
          .eq("id", todayCompletion.id);
      }
    } else {
      await supabase.from("habit_completions").insert({
        habit_id: habit.id,
        user_id: user.id,
        completed_date: todayStr,
        count: 1,
        note: noteText.trim() || null,
      });
    }

    setNoteText("");
    setToggling(false);
    router.refresh();
  }

  async function handleSaveNote() {
    if (!todayCompletion || !noteText.trim()) return;
    setSaving(true);
    await supabase
      .from("habit_completions")
      .update({ note: noteText.trim() })
      .eq("id", todayCompletion.id);
    setNoteText("");
    setSaving(false);
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
        {/* Reorder buttons */}
        <div className="flex flex-col shrink-0 -my-1">
          <button
            onClick={() => onReorder(habit.id, "up")}
            disabled={isFirst}
            className="text-muted-foreground hover:text-foreground disabled:opacity-25 transition-colors p-0.5"
            title="Move up"
          >
            <ArrowUp className="size-3" />
          </button>
          <button
            onClick={() => onReorder(habit.id, "down")}
            disabled={isLast}
            className="text-muted-foreground hover:text-foreground disabled:opacity-25 transition-colors p-0.5"
            title="Move down"
          >
            <ArrowDown className="size-3" />
          </button>
        </div>

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
          {/* Streak + Completion Rate Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            <div className="rounded-md bg-muted/50 px-2.5 py-1.5 text-center">
              <div className="text-xs text-muted-foreground">Streak</div>
              <div className="text-sm font-semibold flex items-center justify-center gap-1">
                <Flame className="size-3 text-orange-500" />
                {streak}d
              </div>
            </div>
            <div className="rounded-md bg-muted/50 px-2.5 py-1.5 text-center">
              <div className="text-xs text-muted-foreground">Best</div>
              <div className="text-sm font-semibold flex items-center justify-center gap-1">
                <TrendingUp className="size-3" style={{ color: habit.color }} />
                {longestStreak}d
              </div>
            </div>
            <div className="rounded-md bg-muted/50 px-2.5 py-1.5 text-center">
              <div className="text-xs text-muted-foreground">7d</div>
              <div className="text-sm font-semibold">{rate7}%</div>
            </div>
            <div className="rounded-md bg-muted/50 px-2.5 py-1.5 text-center">
              <div className="text-xs text-muted-foreground">30d</div>
              <div className="text-sm font-semibold">{rate30}%</div>
            </div>
            <div className="rounded-md bg-muted/50 px-2.5 py-1.5 text-center">
              <div className="text-xs text-muted-foreground">90d</div>
              <div className="text-sm font-semibold">{rate90}%</div>
            </div>
          </div>

          {/* Heatmap */}
          <div className="overflow-x-auto">
            <HabitHeatmap
              completions={heatmapData}
              color={habit.color}
              targetCount={habit.target_count}
            />
          </div>

          {/* Weekly bar chart */}
          <div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
              <BarChart3 className="size-3" />
              <span>Weekly completions (last 8 weeks)</span>
            </div>
            <HabitWeeklyChart
              completions={heatmapData}
              color={habit.color}
              targetCount={habit.target_count}
            />
          </div>

          {/* Note input for today */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              Note for today (optional)
            </Label>
            <div className="flex gap-2">
              <Input
                placeholder="e.g., ran 3 miles..."
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                className="text-sm h-8"
              />
              {todayCompletion && noteText.trim() && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 shrink-0"
                  onClick={handleSaveNote}
                  disabled={saving}
                >
                  Save note
                </Button>
              )}
            </div>
            {todayCompletion?.note && (
              <p className="text-xs text-muted-foreground italic">
                Today&apos;s note: {todayCompletion.note}
              </p>
            )}
          </div>

          {/* Recent notes (expandable) */}
          {recentNotes.length > 0 && (
            <div>
              <button
                onClick={() => setShowNotes(!showNotes)}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <MessageSquare className="size-3" />
                <span>Recent notes ({recentNotes.length})</span>
                {showNotes ? (
                  <ChevronUp className="size-3" />
                ) : (
                  <ChevronDown className="size-3" />
                )}
              </button>
              {showNotes && (
                <div className="mt-1.5 space-y-1 max-h-40 overflow-y-auto">
                  {recentNotes.map((c) => (
                    <div
                      key={c.id}
                      className="flex gap-2 text-xs rounded bg-muted/50 px-2 py-1"
                    >
                      <span className="text-muted-foreground shrink-0">
                        {format(new Date(c.completed_date), "MMM d")}
                      </span>
                      <span>{c.note}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>
              {habit.frequency === "daily" ? "Daily" : "Weekly"} &middot;
              Target: {habit.target_count}x
            </span>
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
