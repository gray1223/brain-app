"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  StickyNote,
  CheckSquare,
  Bookmark,
  X,
  ChevronDown,
  ChevronRight,
  Inbox,
} from "lucide-react";
import { formatDistanceToNow, parseISO } from "date-fns";
import { toast } from "sonner";
import type { Capture } from "@/types/database";

export default function InboxPage() {
  const [captures, setCaptures] = useState<Capture[]>([]);
  const [processedCaptures, setProcessedCaptures] = useState<Capture[]>([]);
  const [showProcessed, setShowProcessed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const fetchCaptures = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const [{ data: unprocessed }, { data: processed }] = await Promise.all([
      supabase
        .from("captures")
        .select("*")
        .eq("processed", false)
        .order("created_at", { ascending: false }),
      supabase
        .from("captures")
        .select("*")
        .eq("processed", true)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

    setCaptures((unprocessed as Capture[]) ?? []);
    setProcessedCaptures((processed as Capture[]) ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchCaptures();
  }, [fetchCaptures]);

  async function convertToNote(capture: Capture) {
    setActionLoading(capture.id);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: note, error: noteError } = await supabase
      .from("notes")
      .insert({
        user_id: user.id,
        title: capture.content.slice(0, 60),
        content: null,
        tags: [],
      })
      .select("id")
      .single();

    if (noteError || !note) {
      toast.error("Failed to create note");
      setActionLoading(null);
      return;
    }

    await supabase
      .from("captures")
      .update({
        processed: true,
        converted_to: "note",
        converted_id: note.id,
      })
      .eq("id", capture.id);

    toast.success("Converted to note");
    setActionLoading(null);
    fetchCaptures();
    router.refresh();
  }

  async function convertToTodo(capture: Capture) {
    setActionLoading(capture.id);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: todo, error: todoError } = await supabase
      .from("todos")
      .insert({
        user_id: user.id,
        title: capture.content.slice(0, 200),
        priority: "medium",
      })
      .select("id")
      .single();

    if (todoError || !todo) {
      toast.error("Failed to create todo");
      setActionLoading(null);
      return;
    }

    await supabase
      .from("captures")
      .update({
        processed: true,
        converted_to: "todo",
        converted_id: todo.id,
      })
      .eq("id", capture.id);

    toast.success("Converted to todo");
    setActionLoading(null);
    fetchCaptures();
    router.refresh();
  }

  async function convertToBookmark(capture: Capture) {
    setActionLoading(capture.id);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const urlMatch = capture.content.match(
      /https?:\/\/[^\s]+/
    );
    const url = urlMatch ? urlMatch[0] : capture.content;

    const { data: bookmark, error: bookmarkError } = await supabase
      .from("bookmarks")
      .insert({
        user_id: user.id,
        url,
        title: capture.content.slice(0, 200),
      })
      .select("id")
      .single();

    if (bookmarkError || !bookmark) {
      toast.error("Failed to create bookmark");
      setActionLoading(null);
      return;
    }

    await supabase
      .from("captures")
      .update({
        processed: true,
        converted_to: "bookmark",
        converted_id: bookmark.id,
      })
      .eq("id", capture.id);

    toast.success("Converted to bookmark");
    setActionLoading(null);
    fetchCaptures();
    router.refresh();
  }

  async function dismiss(capture: Capture) {
    setActionLoading(capture.id);

    await supabase
      .from("captures")
      .update({ processed: true })
      .eq("id", capture.id);

    toast.success("Dismissed");
    setActionLoading(null);
    fetchCaptures();
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight">Inbox</h1>
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Inbox</h1>
        <p className="text-sm text-muted-foreground">
          {captures.length} unprocessed capture{captures.length !== 1 ? "s" : ""}
        </p>
      </div>

      {captures.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Inbox className="mb-4 size-12 text-muted-foreground/50" />
          <h3 className="text-sm font-medium">Inbox zero!</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            All captures have been processed.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {captures.map((capture) => (
            <Card key={capture.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-sm whitespace-pre-wrap">
                    {capture.content}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatDistanceToNow(parseISO(capture.created_at), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => convertToNote(capture)}
                    disabled={actionLoading === capture.id}
                    title="Convert to Note"
                  >
                    <StickyNote className="size-3.5" />
                    <span className="sr-only sm:not-sr-only sm:ml-1">Note</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => convertToTodo(capture)}
                    disabled={actionLoading === capture.id}
                    title="Convert to Todo"
                  >
                    <CheckSquare className="size-3.5" />
                    <span className="sr-only sm:not-sr-only sm:ml-1">Todo</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => convertToBookmark(capture)}
                    disabled={actionLoading === capture.id}
                    title="Convert to Bookmark"
                  >
                    <Bookmark className="size-3.5" />
                    <span className="sr-only sm:not-sr-only sm:ml-1">
                      Bookmark
                    </span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => dismiss(capture)}
                    disabled={actionLoading === capture.id}
                    title="Dismiss"
                  >
                    <X className="size-3.5" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {processedCaptures.length > 0 && (
        <div>
          <button
            onClick={() => setShowProcessed(!showProcessed)}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            {showProcessed ? (
              <ChevronDown className="size-4" />
            ) : (
              <ChevronRight className="size-4" />
            )}
            Processed ({processedCaptures.length})
          </button>
          {showProcessed && (
            <div className="mt-3 space-y-2">
              {processedCaptures.map((capture) => (
                <Card
                  key={capture.id}
                  className="p-3 opacity-60"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm line-through whitespace-pre-wrap">
                        {capture.content}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {capture.converted_to
                          ? `Converted to ${capture.converted_to}`
                          : "Dismissed"}{" "}
                        &middot;{" "}
                        {formatDistanceToNow(parseISO(capture.created_at), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
