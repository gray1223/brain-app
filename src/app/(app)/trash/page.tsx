"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, RotateCcw, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface TrashedItem {
  id: string;
  name: string;
  type: "note" | "todo" | "project";
  deleted_at: string;
}

export default function TrashPage() {
  const supabase = createClient();
  const [items, setItems] = useState<TrashedItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTrashedItems = useCallback(async () => {
    setLoading(true);

    const [notesRes, todosRes, projectsRes] = await Promise.all([
      supabase
        .from("notes")
        .select("id, title, deleted_at")
        .not("deleted_at", "is", null),
      supabase
        .from("todos")
        .select("id, title, deleted_at")
        .not("deleted_at", "is", null),
      supabase
        .from("projects")
        .select("id, name, deleted_at")
        .not("deleted_at", "is", null),
    ]);

    const trashedItems: TrashedItem[] = [
      ...(notesRes.data ?? []).map((n) => ({
        id: n.id,
        name: n.title,
        type: "note" as const,
        deleted_at: n.deleted_at,
      })),
      ...(todosRes.data ?? []).map((t) => ({
        id: t.id,
        name: t.title,
        type: "todo" as const,
        deleted_at: t.deleted_at,
      })),
      ...(projectsRes.data ?? []).map((p) => ({
        id: p.id,
        name: p.name,
        type: "project" as const,
        deleted_at: p.deleted_at,
      })),
    ];

    trashedItems.sort(
      (a, b) => new Date(b.deleted_at).getTime() - new Date(a.deleted_at).getTime()
    );

    setItems(trashedItems);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchTrashedItems();
  }, [fetchTrashedItems]);

  const handleRestore = async (item: TrashedItem) => {
    const table = item.type === "note" ? "notes" : item.type === "todo" ? "todos" : "projects";
    const { error } = await supabase
      .from(table)
      .update({ deleted_at: null })
      .eq("id", item.id);

    if (error) {
      toast.error("Failed to restore item");
    } else {
      toast.success(`${item.name} restored`);
      setItems((prev) => prev.filter((i) => i.id !== item.id));
    }
  };

  const handleDeleteForever = async (item: TrashedItem) => {
    const table = item.type === "note" ? "notes" : item.type === "todo" ? "todos" : "projects";
    const { error } = await supabase.from(table).delete().eq("id", item.id);

    if (error) {
      toast.error("Failed to delete item");
    } else {
      toast.success(`${item.name} permanently deleted`);
      setItems((prev) => prev.filter((i) => i.id !== item.id));
    }
  };

  const handleEmptyTrash = async () => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const cutoff = thirtyDaysAgo.toISOString();

    const oldItems = items.filter(
      (item) => new Date(item.deleted_at).getTime() < new Date(cutoff).getTime()
    );

    if (oldItems.length === 0) {
      toast.info("No items older than 30 days");
      return;
    }

    const grouped = {
      notes: oldItems.filter((i) => i.type === "note").map((i) => i.id),
      todos: oldItems.filter((i) => i.type === "todo").map((i) => i.id),
      projects: oldItems.filter((i) => i.type === "project").map((i) => i.id),
    };

    const promises = [];
    if (grouped.notes.length > 0) {
      promises.push(supabase.from("notes").delete().in("id", grouped.notes).then());
    }
    if (grouped.todos.length > 0) {
      promises.push(supabase.from("todos").delete().in("id", grouped.todos).then());
    }
    if (grouped.projects.length > 0) {
      promises.push(supabase.from("projects").delete().in("id", grouped.projects).then());
    }

    await Promise.all(promises);
    toast.success(`Permanently deleted ${oldItems.length} items`);
    fetchTrashedItems();
  };

  const typeBadgeColor = (type: string) => {
    switch (type) {
      case "note":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
      case "todo":
        return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
      case "project":
        return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400";
      default:
        return "";
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Trash</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Deleted items. Restore or permanently delete them.
          </p>
        </div>
        <Button variant="destructive" size="sm" onClick={handleEmptyTrash}>
          <Trash2 className="size-4" />
          Empty Trash
        </Button>
      </div>

      <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
        <AlertTriangle className="size-4 shrink-0" />
        Items are permanently deleted after 30 days.
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Trash2 className="size-12 text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground">Trash is empty</p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((item) => (
            <Card key={`${item.type}-${item.id}`}>
              <CardContent className="flex items-center justify-between py-3 px-4">
                <div className="flex items-center gap-3 min-w-0">
                  <Badge
                    variant="secondary"
                    className={typeBadgeColor(item.type)}
                  >
                    {item.type}
                  </Badge>
                  <span className="text-sm font-medium truncate">
                    {item.name}
                  </span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {formatDistanceToNow(new Date(item.deleted_at), {
                      addSuffix: true,
                    })}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRestore(item)}
                  >
                    <RotateCcw className="size-3.5" />
                    Restore
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteForever(item)}
                  >
                    <Trash2 className="size-3.5" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
