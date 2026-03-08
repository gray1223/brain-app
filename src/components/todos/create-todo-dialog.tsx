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
import type { TodoList } from "@/types/database";

export function CreateTodoDialog({ lists }: { lists: TodoList[] }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [listId, setListId] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  function resetForm() {
    setTitle("");
    setDescription("");
    setPriority("medium");
    setDueDate(undefined);
    setListId("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    setSaving(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("todos").insert({
      user_id: user.id,
      title: title.trim(),
      description: description.trim() || null,
      priority,
      due_date: dueDate ? dueDate.toISOString() : null,
      list_id: listId || null,
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
        New Todo
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>New Todo</DialogTitle>
            <DialogDescription>
              Add a new task to your list.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="todo-title">Title</Label>
              <Input
                id="todo-title"
                placeholder="What needs to be done?"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="todo-description">Description</Label>
              <Textarea
                id="todo-description"
                placeholder="Add details..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={priority} onValueChange={(val) => setPriority(val ?? "medium")}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>List</Label>
                <Select value={listId} onValueChange={(val) => setListId(val ?? "")}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="No list" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No list</SelectItem>
                    {lists.map((list) => (
                      <SelectItem key={list.id} value={list.id}>
                        {list.color && (
                          <span
                            className="mr-1.5 inline-block size-2 rounded-full"
                            style={{ backgroundColor: list.color }}
                          />
                        )}
                        {list.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Due Date</Label>
              <Popover>
                <PopoverTrigger
                  render={
                    <Button variant="outline" className="w-full justify-start font-normal" />
                  }
                >
                  <CalendarIcon className="size-4 text-muted-foreground" data-icon="inline-start" />
                  {dueDate ? format(dueDate, "PPP") : "Pick a date"}
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dueDate}
                    onSelect={setDueDate}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <DialogClose render={<Button variant="outline" />}>
              Cancel
            </DialogClose>
            <Button type="submit" disabled={saving || !title.trim()}>
              {saving ? "Saving..." : "Create Todo"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
