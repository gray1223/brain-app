"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Plus } from "lucide-react";

const COLORS = [
  "#3b82f6",
  "#ef4444",
  "#22c55e",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#f97316",
  "#14b8a6",
  "#6366f1",
];

export function CreateHabitDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [frequency, setFrequency] = useState("daily");
  const [targetCount, setTargetCount] = useState("1");
  const [color, setColor] = useState("#3b82f6");
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  function resetForm() {
    setName("");
    setDescription("");
    setFrequency("daily");
    setTargetCount("1");
    setColor("#3b82f6");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // Get max order_index to place new habit at end
    const { data: maxOrderResult } = await supabase
      .from("habits")
      .select("order_index")
      .eq("user_id", user.id)
      .order("order_index", { ascending: false })
      .limit(1);

    const nextOrder =
      maxOrderResult && maxOrderResult.length > 0
        ? (maxOrderResult[0].order_index ?? 0) + 1
        : 0;

    await supabase.from("habits").insert({
      user_id: user.id,
      name: name.trim(),
      description: description.trim() || null,
      frequency,
      target_count: parseInt(targetCount) || 1,
      color,
      order_index: nextOrder,
    });

    setSaving(false);
    resetForm();
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <Plus className="size-4" data-icon="inline-start" />
        New Habit
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>New Habit</DialogTitle>
            <DialogDescription>
              Create a new habit to track consistently.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="habit-name">Name</Label>
              <Input
                id="habit-name"
                placeholder="e.g., Exercise, Read, Meditate"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="habit-description">Description</Label>
              <Textarea
                id="habit-description"
                placeholder="Optional details..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Frequency</Label>
                <Select
                  value={frequency}
                  onValueChange={(val) => setFrequency(val ?? "daily")}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="habit-target">Target per day</Label>
                <Input
                  id="habit-target"
                  type="number"
                  min="1"
                  max="100"
                  value={targetCount}
                  onChange={(e) => setTargetCount(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className="size-8 rounded-full border-2 transition-all"
                    style={{
                      backgroundColor: c,
                      borderColor: color === c ? "white" : "transparent",
                      outline:
                        color === c ? `2px solid ${c}` : "2px solid transparent",
                    }}
                    onClick={() => setColor(c)}
                  />
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <DialogClose render={<Button variant="outline" />}>
              Cancel
            </DialogClose>
            <Button type="submit" disabled={saving || !name.trim()}>
              {saving ? "Saving..." : "Create Habit"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
