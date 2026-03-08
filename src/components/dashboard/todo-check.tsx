"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { createClient } from "@/lib/supabase/client";

interface TodoCheckProps {
  todoId: string;
  completed: boolean;
}

export function TodoCheck({ todoId, completed }: TodoCheckProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  async function handleToggle() {
    const supabase = createClient();
    const now = new Date().toISOString();

    await supabase
      .from("todos")
      .update({
        completed: !completed,
        completed_at: !completed ? now : null,
      })
      .eq("id", todoId);

    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <Checkbox
      checked={completed}
      onCheckedChange={handleToggle}
      disabled={isPending}
      className={isPending ? "opacity-50" : ""}
    />
  );
}
