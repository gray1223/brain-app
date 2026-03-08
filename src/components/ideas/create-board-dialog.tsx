"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus } from "lucide-react";

export function CreateBoardDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleCreate = async () => {
    if (!name.trim()) return;
    setLoading(true);

    const { data, error } = await supabase
      .from("idea_boards")
      .insert({ name: name.trim(), description: description.trim() || null })
      .select()
      .single();

    setLoading(false);

    if (!error && data) {
      setName("");
      setDescription("");
      setOpen(false);
      router.refresh();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <Plus className="size-4" />
        New Board
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Idea Board</DialogTitle>
          <DialogDescription>
            Create a new board to brainstorm and organize your ideas.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="board-name">Name</Label>
            <Input
              id="board-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My brilliant ideas"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate();
              }}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="board-description">Description (optional)</Label>
            <Textarea
              id="board-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this board about?"
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleCreate} disabled={!name.trim() || loading}>
            {loading ? "Creating..." : "Create Board"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
