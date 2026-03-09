"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { CalendarEvent } from "@/types/database";

const COLORS = [
  { label: "Blue", value: "#3b82f6" },
  { label: "Red", value: "#ef4444" },
  { label: "Green", value: "#22c55e" },
  { label: "Purple", value: "#a855f7" },
  { label: "Orange", value: "#f97316" },
  { label: "Pink", value: "#ec4899" },
];

interface EditEventDialogProps {
  event: CalendarEvent;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEventUpdated: () => void;
}

export function EditEventDialog({
  event,
  open,
  onOpenChange,
  onEventUpdated,
}: EditEventDialogProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const startDt = new Date(event.start_time);
  const endDt = new Date(event.end_time);

  const [title, setTitle] = useState(event.title);
  const [description, setDescription] = useState(event.description ?? "");
  const [startDate, setStartDate] = useState(format(startDt, "yyyy-MM-dd"));
  const [startTime, setStartTime] = useState(format(startDt, "HH:mm"));
  const [endDate, setEndDate] = useState(format(endDt, "yyyy-MM-dd"));
  const [endTime, setEndTime] = useState(format(endDt, "HH:mm"));
  const [allDay, setAllDay] = useState(event.all_day);
  const [color, setColor] = useState(event.color || COLORS[0].value);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !startDate) return;

    setLoading(true);
    const supabase = createClient();

    const startDateTime = allDay
      ? `${startDate}T00:00:00`
      : `${startDate}T${startTime}:00`;
    const endDateTime = allDay
      ? `${endDate || startDate}T23:59:59`
      : `${endDate || startDate}T${endTime}:00`;

    const { error } = await supabase
      .from("calendar_events")
      .update({
        title: title.trim(),
        description: description.trim() || null,
        start_time: startDateTime,
        end_time: endDateTime,
        all_day: allDay,
        color,
      })
      .eq("id", event.id);

    setLoading(false);

    if (error) {
      toast.error("Failed to update event");
      return;
    }

    toast.success("Event updated");
    onOpenChange(false);
    onEventUpdated();
    router.refresh();
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }

    setLoading(true);
    const supabase = createClient();

    const { error } = await supabase
      .from("calendar_events")
      .delete()
      .eq("id", event.id);

    setLoading(false);

    if (error) {
      toast.error("Failed to delete event");
      return;
    }

    toast.success("Event deleted");
    onOpenChange(false);
    onEventUpdated();
    router.refresh();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        onOpenChange(val);
        setConfirmDelete(false);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Event</DialogTitle>
            <DialogDescription>
              Update event details or delete this event.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-event-title">Title</Label>
              <Input
                id="edit-event-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Event title"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-event-description">Description</Label>
              <Textarea
                id="edit-event-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description"
                rows={2}
              />
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                checked={allDay}
                onCheckedChange={(checked) => setAllDay(checked as boolean)}
                id="edit-all-day"
              />
              <Label htmlFor="edit-all-day" className="text-sm">
                All day
              </Label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit-start-date">Start Date</Label>
                <Input
                  id="edit-start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
              </div>
              {!allDay && (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="edit-start-time">Start Time</Label>
                  <Input
                    id="edit-start-time"
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit-end-date">End Date</Label>
                <Input
                  id="edit-end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              {!allDay && (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="edit-end-time">End Time</Label>
                  <Input
                    id="edit-end-time"
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                  />
                </div>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Color</Label>
              <div className="flex gap-2">
                {COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setColor(c.value)}
                    className={`size-7 rounded-full border-2 transition-all ${
                      color === c.value
                        ? "border-foreground scale-110"
                        : "border-transparent"
                    }`}
                    style={{ backgroundColor: c.value }}
                    title={c.label}
                  />
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <div className="flex w-full items-center justify-between">
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={loading}
              >
                <Trash2 className="size-4" />
                {confirmDelete ? "Confirm Delete" : "Delete"}
              </Button>
              <Button
                type="submit"
                disabled={loading || !title.trim() || !startDate}
              >
                {loading ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
