"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Plus, Calendar as CalendarIcon, MoreHorizontal } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import type { ProjectTask } from "@/types/database";

type TaskStatus = ProjectTask["status"];

const COLUMNS: { key: TaskStatus; label: string }[] = [
  { key: "backlog", label: "Backlog" },
  { key: "todo", label: "To Do" },
  { key: "in_progress", label: "In Progress" },
  { key: "review", label: "Review" },
  { key: "done", label: "Done" },
];

interface KanbanBoardProps {
  projectId: string;
  initialTasks: ProjectTask[];
}

export function KanbanBoard({ projectId, initialTasks }: KanbanBoardProps) {
  const [tasks, setTasks] = useState<ProjectTask[]>(initialTasks);
  const [addingTo, setAddingTo] = useState<TaskStatus | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");

  const getTasksForColumn = (status: TaskStatus) =>
    tasks
      .filter((t) => t.status === status)
      .sort((a, b) => a.order_index - b.order_index);

  const addTask = async (status: TaskStatus) => {
    if (!newTaskTitle.trim()) return;

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const columnTasks = getTasksForColumn(status);
    const orderIndex =
      columnTasks.length > 0
        ? columnTasks[columnTasks.length - 1].order_index + 1
        : 0;

    const { data, error } = await supabase
      .from("project_tasks")
      .insert({
        project_id: projectId,
        user_id: user.id,
        title: newTaskTitle.trim(),
        status,
        order_index: orderIndex,
      })
      .select()
      .single();

    if (error) {
      toast.error("Failed to add task");
      return;
    }

    if (data) {
      setTasks((prev) => [...prev, data]);
    }

    setNewTaskTitle("");
    setAddingTo(null);
  };

  const moveTask = async (taskId: string, newStatus: TaskStatus) => {
    const supabase = createClient();

    const columnTasks = getTasksForColumn(newStatus);
    const orderIndex =
      columnTasks.length > 0
        ? columnTasks[columnTasks.length - 1].order_index + 1
        : 0;

    const { error } = await supabase
      .from("project_tasks")
      .update({ status: newStatus, order_index: orderIndex })
      .eq("id", taskId);

    if (error) {
      toast.error("Failed to move task");
      return;
    }

    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? { ...t, status: newStatus, order_index: orderIndex }
          : t
      )
    );
  };

  const deleteTask = async (taskId: string) => {
    const supabase = createClient();

    const { error } = await supabase
      .from("project_tasks")
      .delete()
      .eq("id", taskId);

    if (error) {
      toast.error("Failed to delete task");
      return;
    }

    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {COLUMNS.map((column) => {
        const columnTasks = getTasksForColumn(column.key);
        return (
          <div
            key={column.key}
            className="flex w-64 shrink-0 flex-col gap-2"
          >
            <div className="flex items-center justify-between px-1">
              <h3 className="text-sm font-medium text-muted-foreground">
                {column.label}
              </h3>
              <Badge variant="secondary" className="text-xs">
                {columnTasks.length}
              </Badge>
            </div>

            <div className="flex flex-col gap-2">
              {columnTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onMove={moveTask}
                  onDelete={deleteTask}
                  currentStatus={column.key}
                />
              ))}

              {addingTo === column.key ? (
                <Card className="p-2">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      addTask(column.key);
                    }}
                  >
                    <Input
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      placeholder="Task title..."
                      autoFocus
                      onBlur={() => {
                        if (!newTaskTitle.trim()) setAddingTo(null);
                      }}
                    />
                    <div className="mt-2 flex gap-1">
                      <Button type="submit" size="xs" disabled={!newTaskTitle.trim()}>
                        Add
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="xs"
                        onClick={() => {
                          setAddingTo(null);
                          setNewTaskTitle("");
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </Card>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="justify-start text-muted-foreground"
                  onClick={() => {
                    setAddingTo(column.key);
                    setNewTaskTitle("");
                  }}
                >
                  <Plus className="size-4" />
                  Add task
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TaskCard({
  task,
  onMove,
  onDelete,
  currentStatus,
}: {
  task: ProjectTask;
  onMove: (taskId: string, status: TaskStatus) => void;
  onDelete: (taskId: string) => void;
  currentStatus: TaskStatus;
}) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <Card className="group relative p-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium leading-tight">{task.title}</p>
        <div className="relative">
          <Button
            variant="ghost"
            size="icon-xs"
            className="opacity-0 transition-opacity group-hover:opacity-100"
            onClick={() => setShowMenu(!showMenu)}
          >
            <MoreHorizontal className="size-3" />
          </Button>
          {showMenu && (
            <div className="absolute right-0 top-6 z-10 w-36 rounded-lg border bg-popover p-1 shadow-md">
              {COLUMNS.filter((c) => c.key !== currentStatus).map((col) => (
                <button
                  key={col.key}
                  className="flex w-full rounded-md px-2 py-1.5 text-left text-xs hover:bg-muted"
                  onClick={() => {
                    onMove(task.id, col.key);
                    setShowMenu(false);
                  }}
                >
                  Move to {col.label}
                </button>
              ))}
              <div className="my-1 h-px bg-border" />
              <button
                className="flex w-full rounded-md px-2 py-1.5 text-left text-xs text-destructive hover:bg-destructive/10"
                onClick={() => {
                  onDelete(task.id);
                  setShowMenu(false);
                }}
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </div>
      {task.due_date && (
        <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
          <CalendarIcon className="size-3" />
          {format(new Date(task.due_date), "MMM d")}
        </div>
      )}
    </Card>
  );
}
