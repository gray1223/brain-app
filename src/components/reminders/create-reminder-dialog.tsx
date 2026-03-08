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
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Plus, CalendarIcon } from "lucide-react";
import { format } from "date-fns";

export function CreateReminderDialog() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState<Date | undefined>();
  const [time, setTime] = useState("09:00");
  const [recurrence, setRecurrence] = useState("");
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  function resetForm() {
    setTitle("");
    setDescription("");
    setDate(undefined);
    setTime("09:00");
    setRecurrence("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !date) return;

    setSaving(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Combine date and time into a single timestamp
    const [hours, minutes] = time.split(":").map(Number);
    const remindAt = new Date(date);
    remindAt.setHours(hours, minutes, 0, 0);

    await supabase.from("reminders").insert({
      user_id: user.id,
      title: title.trim(),
      description: description.trim() || null,
      remind_at: remindAt.toISOString(),
      recurrence: recurrence || null,
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
        New Reminder
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>New Reminder</DialogTitle>
            <DialogDescription>
              Set a reminder so you never forget.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reminder-title">Title</Label>
              <Input
                id="reminder-title"
                placeholder="What to remember?"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reminder-description">Description</Label>
              <Textarea
                id="reminder-description"
                placeholder="Add details..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date</Label>
                <Popover>
                  <PopoverTrigger
                    render={
                      <Button
                        variant="outline"
                        className="w-full justify-start font-normal"
                      />
                    }
                  >
                    <CalendarIcon className="size-4 text-muted-foreground" data-icon="inline-start" />
                    {date ? format(date, "MMM d") : "Pick date"}
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={setDate}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reminder-time">Time</Label>
                <Input
                  id="reminder-time"
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Recurrence (optional)</Label>
              <Select value={recurrence} onValueChange={(val) => setRecurrence(val ?? "")}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="No repeat" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No repeat</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="biweekly">Every 2 weeks</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <DialogClose render={<Button variant="outline" />}>
              Cancel
            </DialogClose>
            <Button type="submit" disabled={saving || !title.trim() || !date}>
              {saving ? "Saving..." : "Create Reminder"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
