"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Flame,
  CalendarClock,
  Users,
  Trash2,
  Plus,
  Calendar,
} from "lucide-react";
import { format, parseISO, isToday, isPast } from "date-fns";
import type { Todo } from "@/types/database";

interface QuadrantConfig {
  key: string;
  label: string;
  subtitle: string;
  icon: React.ReactNode;
  bgClass: string;
  borderClass: string;
  priority: Todo["priority"];
  filter: (todo: Todo) => boolean;
}

const QUADRANTS: QuadrantConfig[] = [
  {
    key: "q1",
    label: "Do First",
    subtitle: "Urgent & Important",
    icon: <Flame className="size-4" />,
    bgClass: "bg-red-50 dark:bg-red-950/30",
    borderClass: "border-red-200 dark:border-red-900/50",
    priority: "urgent",
    filter: (todo) => todo.priority === "urgent",
  },
  {
    key: "q2",
    label: "Schedule",
    subtitle: "Not Urgent & Important",
    icon: <CalendarClock className="size-4" />,
    bgClass: "bg-blue-50 dark:bg-blue-950/30",
    borderClass: "border-blue-200 dark:border-blue-900/50",
    priority: "high",
    filter: (todo) => todo.priority === "high",
  },
  {
    key: "q3",
    label: "Delegate",
    subtitle: "Urgent & Not Important",
    icon: <Users className="size-4" />,
    bgClass: "bg-yellow-50 dark:bg-yellow-950/30",
    borderClass: "border-yellow-200 dark:border-yellow-900/50",
    priority: "medium",
    filter: (todo) =>
      todo.priority === "medium" &&
      !!todo.due_date &&
      (isPast(parseISO(todo.due_date)) || isToday(parseISO(todo.due_date))),
  },
  {
    key: "q4",
    label: "Eliminate",
    subtitle: "Not Urgent & Not Important",
    icon: <Trash2 className="size-4" />,
    bgClass: "bg-gray-50 dark:bg-gray-950/30",
    borderClass: "border-gray-200 dark:border-gray-800/50",
    priority: "low",
    filter: (todo) => todo.priority === "low",
  },
];

interface EisenhowerMatrixProps {
  todos: Todo[];
}

export function EisenhowerMatrix({ todos }: EisenhowerMatrixProps) {
  const router = useRouter();
  const supabase = createClient();
  const [quickAddInputs, setQuickAddInputs] = useState<Record<string, string>>(
    {}
  );

  async function handleToggleComplete(todoId: string) {
    await supabase
      .from("todos")
      .update({ completed: true, completed_at: new Date().toISOString() })
      .eq("id", todoId);
    router.refresh();
  }

  async function handleQuickAdd(quadrantKey: string, priority: Todo["priority"]) {
    const title = quickAddInputs[quadrantKey]?.trim();
    if (!title) return;

    await supabase.from("todos").insert({
      title,
      priority,
      completed: false,
      order_index: 0,
    });

    setQuickAddInputs((prev) => ({ ...prev, [quadrantKey]: "" }));
    router.refresh();
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2" style={{ minHeight: "calc(100vh - 200px)" }}>
      {QUADRANTS.map((quadrant) => {
        const quadrantTodos = todos.filter(quadrant.filter);

        return (
          <Card
            key={quadrant.key}
            className={`flex flex-col ${quadrant.bgClass} ${quadrant.borderClass} border`}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {quadrant.icon}
                  <CardTitle className="text-base">{quadrant.label}</CardTitle>
                </div>
                <Badge variant="secondary">{quadrantTodos.length}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {quadrant.subtitle}
              </p>
            </CardHeader>

            <CardContent className="flex flex-1 flex-col gap-2">
              <div className="flex-1 space-y-1.5 overflow-y-auto">
                {quadrantTodos.length === 0 && (
                  <p className="py-4 text-center text-xs text-muted-foreground">
                    No items
                  </p>
                )}
                {quadrantTodos.map((todo) => (
                  <div
                    key={todo.id}
                    className="flex items-start gap-2 rounded-md bg-background/80 p-2 ring-1 ring-foreground/5"
                  >
                    <Checkbox
                      checked={false}
                      onCheckedChange={() => handleToggleComplete(todo.id)}
                      className="mt-0.5"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm">{todo.title}</p>
                      {todo.due_date && (
                        <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="size-3" />
                          {format(parseISO(todo.due_date), "MMM d")}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2 pt-2">
                <Plus className="size-4 shrink-0 text-muted-foreground" />
                <Input
                  value={quickAddInputs[quadrant.key] || ""}
                  onChange={(e) =>
                    setQuickAddInputs((prev) => ({
                      ...prev,
                      [quadrant.key]: e.target.value,
                    }))
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleQuickAdd(quadrant.key, quadrant.priority);
                    }
                  }}
                  placeholder="Quick add..."
                  className="h-7 text-sm"
                />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
