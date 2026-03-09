"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Calendar as CalendarIcon, MoreHorizontal, GripVertical } from "lucide-react";
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
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<TaskStatus | null>(null);

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

    // Optimistic update
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? { ...t, status: newStatus, order_index: orderIndex }
          : t
      )
    );

    const { error } = await supabase
      .from("project_tasks")
      .update({ status: newStatus, order_index: orderIndex })
      .eq("id", taskId);

    if (error) {
      toast.error("Failed to move task");
      // Revert
      setTasks((prev) =>
        prev.map((t) => {
          const original = initialTasks.find((ot) => ot.id === t.id);
          return original ? { ...t, status: original.status, order_index: original.order_index } : t;
        })
      );
    }
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

  // Drag handlers
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.effectAllowed = "move";
    // Make the drag image slightly transparent
    if (e.currentTarget instanceof HTMLElement) {
      e.dataTransfer.setDragImage(e.currentTarget, 0, 0);
    }
  };

  const handleDragOver = (e: React.DragEvent, columnKey: TaskStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverColumn(columnKey);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear if actually leaving the column
    const relatedTarget = e.relatedTarget as HTMLElement | null;
    if (!relatedTarget || !e.currentTarget.contains(relatedTarget)) {
      setDragOverColumn(null);
    }
  };

  const handleDrop = (e: React.DragEvent, columnKey: TaskStatus) => {
    e.preventDefault();
    setDragOverColumn(null);

    if (!draggedTaskId) return;

    const task = tasks.find((t) => t.id === draggedTaskId);
    if (task && task.status !== columnKey) {
      moveTask(draggedTaskId, columnKey);
    }

    setDraggedTaskId(null);
  };

  const handleDragEnd = () => {
    setDraggedTaskId(null);
    setDragOverColumn(null);
  };

  return (
    <div className="flex gap-3 overflow-x-auto pb-4 sm:gap-4">
      {COLUMNS.map((column) => {
        const columnTasks = getTasksForColumn(column.key);
        const isOver = dragOverColumn === column.key;

        return (
          <div
            key={column.key}
            className={`flex w-56 shrink-0 flex-col gap-2 rounded-lg p-2 transition-colors sm:w-64 ${
              isOver ? "bg-primary/10 ring-2 ring-primary/30" : ""
            }`}
            onDragOver={(e) => handleDragOver(e, column.key)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, column.key)}
          >
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-medium text-muted-foreground sm:text-sm">
                {column.label}
              </h3>
              <Badge variant="secondary" className="text-[10px] sm:text-xs">
                {columnTasks.length}
              </Badge>
            </div>

            <div className="flex min-h-[48px] flex-col gap-2">
              {columnTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onMove={moveTask}
                  onDelete={deleteTask}
                  currentStatus={column.key}
                  isDragging={draggedTaskId === task.id}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
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
  isDragging,
  onDragStart,
  onDragEnd,
}: {
  task: ProjectTask;
  onMove: (taskId: string, status: TaskStatus) => void;
  onDelete: (taskId: string) => void;
  currentStatus: TaskStatus;
  isDragging: boolean;
  onDragStart: (e: React.DragEvent, taskId: string) => void;
  onDragEnd: () => void;
}) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <Card
      className={`group relative cursor-grab p-3 active:cursor-grabbing ${
        isDragging ? "opacity-40" : ""
      }`}
      draggable
      onDragStart={(e) => onDragStart(e, task.id)}
      onDragEnd={onDragEnd}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-start gap-1.5">
          <GripVertical className="mt-0.5 size-3 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-60" />
          <p className="min-w-0 break-words text-sm font-medium leading-tight">{task.title}</p>
        </div>
        <div className="relative shrink-0">
          <Button
            variant="ghost"
            size="icon-xs"
            className="opacity-0 transition-opacity group-hover:opacity-100"
            onClick={() => setShowMenu(!showMenu)}
          >
            <MoreHorizontal className="size-3" />
          </Button>
          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 top-6 z-20 w-36 rounded-lg border bg-popover p-1 shadow-md">
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
            </>
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
