"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, Trash2, Calendar } from "lucide-react";
import { format, isPast, isToday, parseISO } from "date-fns";
import type { Todo } from "@/types/database";

const priorityConfig = {
  urgent: { label: "Urgent", className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  high: { label: "High", className: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
  medium: { label: "Medium", className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" },
  low: { label: "Low", className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
} as const;

export function TodoItem({ todo }: { todo: Todo }) {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const priority = priorityConfig[todo.priority];

  const dueDate = todo.due_date ? parseISO(todo.due_date) : null;
  const isOverdue =
    dueDate && !todo.completed && isPast(dueDate) && !isToday(dueDate);

  async function toggleComplete() {
    setLoading(true);
    const now = new Date().toISOString();
    await supabase
      .from("todos")
      .update({
        completed: !todo.completed,
        completed_at: !todo.completed ? now : null,
      })
      .eq("id", todo.id);
    router.refresh();
    setLoading(false);
  }

  async function deleteTodo() {
    setLoading(true);
    await supabase.from("todos").delete().eq("id", todo.id);
    router.refresh();
    setLoading(false);
  }

  return (
    <div className="group rounded-lg border bg-card p-3 transition-colors hover:bg-muted/50">
      <div className="flex items-start gap-3">
        <Checkbox
          checked={todo.completed}
          onCheckedChange={toggleComplete}
          disabled={loading}
          className="mt-0.5"
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-left"
            >
              {todo.description && (
                expanded ? (
                  <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
                ) : (
                  <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
                )
              )}
              <span
                className={
                  todo.completed
                    ? "text-sm text-muted-foreground line-through"
                    : "text-sm"
                }
              >
                {todo.title}
              </span>
            </button>

            <Badge
              variant="secondary"
              className={priority.className}
            >
              {priority.label}
            </Badge>

            {dueDate && (
              <span
                className={`inline-flex items-center gap-1 text-xs ${
                  isOverdue
                    ? "font-medium text-red-600 dark:text-red-400"
                    : "text-muted-foreground"
                }`}
              >
                <Calendar className="size-3" />
                {format(dueDate, "MMM d")}
                {isOverdue && " (overdue)"}
              </span>
            )}
          </div>

          {expanded && todo.description && (
            <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">
              {todo.description}
            </p>
          )}
        </div>

        <Button
          variant="ghost"
          size="icon-xs"
          className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
          onClick={deleteTodo}
          disabled={loading}
        >
          <Trash2 className="size-3.5 text-muted-foreground" />
        </Button>
      </div>
    </div>
  );
}
