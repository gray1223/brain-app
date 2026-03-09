"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CheckSquare, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface CreateTodoFromNoteButtonProps {
  noteId: string;
  noteTitle: string;
}

export function CreateTodoFromNoteButton({
  noteId,
  noteTitle,
}: CreateTodoFromNoteButtonProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleCreate() {
    setLoading(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { error } = await supabase.from("todos").insert({
        user_id: user.id,
        title: noteTitle || "Untitled Note",
        description: `Created from note: /notes/${noteId}`,
        priority: "medium",
      });

      if (error) {
        toast.error("Failed to create todo");
        return;
      }

      toast.success("Todo created from note");
      router.refresh();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleCreate}
      disabled={loading}
    >
      {loading ? (
        <Loader2 className="size-3.5 animate-spin" data-icon="inline-start" />
      ) : (
        <CheckSquare className="size-3.5" data-icon="inline-start" />
      )}
      Create Todo
    </Button>
  );
}
