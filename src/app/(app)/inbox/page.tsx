"use client";

import { useState, useEffect, useCallback, Fragment } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  StickyNote,
  CheckSquare,
  Bookmark,
  X,
  ChevronDown,
  ChevronRight,
  Inbox,
  Sparkles,
  Loader2,
  ExternalLink,
  Check,
  ListChecks,
  Trash2,
} from "lucide-react";
import { formatDistanceToNow, parseISO } from "date-fns";
import { toast } from "sonner";
import type { Capture } from "@/types/database";

interface TriageSuggestion {
  id: string;
  suggestion: "note" | "todo" | "bookmark";
  confidence: "high" | "medium" | "low";
  reason: string;
}

const URL_REGEX = /https?:\/\/[^\s]+/g;
const TODO_REGEX = /^(\s*[-*]\s|\s*\[[\sx]?\]\s|\s*TODO:?\s)/i;

function RichContent({ content }: { content: string }) {
  const hasUrl = URL_REGEX.test(content);
  const isTodoLike = TODO_REGEX.test(content);
  // Reset regex lastIndex
  URL_REGEX.lastIndex = 0;

  if (!hasUrl && !isTodoLike) {
    return <span>{content}</span>;
  }

  // Render URLs as clickable links
  if (hasUrl) {
    URL_REGEX.lastIndex = 0;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = URL_REGEX.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push(
          <Fragment key={`t-${lastIndex}`}>
            {content.slice(lastIndex, match.index)}
          </Fragment>
        );
      }
      parts.push(
        <a
          key={`u-${match.index}`}
          href={match[0]}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-0.5 text-primary underline underline-offset-2 hover:text-primary/80"
          onClick={(e) => e.stopPropagation()}
        >
          {match[0].length > 60 ? match[0].slice(0, 57) + "..." : match[0]}
          <ExternalLink className="inline size-3" />
        </a>
      );
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < content.length) {
      parts.push(
        <Fragment key={`t-${lastIndex}`}>
          {content.slice(lastIndex)}
        </Fragment>
      );
    }

    return (
      <span>
        {isTodoLike && (
          <CheckSquare className="mr-1.5 inline size-3.5 text-muted-foreground" />
        )}
        {parts}
      </span>
    );
  }

  // Todo-like content
  return (
    <span>
      <CheckSquare className="mr-1.5 inline size-3.5 text-muted-foreground" />
      {content}
    </span>
  );
}

const SUGGESTION_ICON = {
  note: StickyNote,
  todo: CheckSquare,
  bookmark: Bookmark,
};

const CONFIDENCE_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  high: "default",
  medium: "secondary",
  low: "outline",
};

export default function InboxPage() {
  const [captures, setCaptures] = useState<Capture[]>([]);
  const [processedCaptures, setProcessedCaptures] = useState<Capture[]>([]);
  const [showProcessed, setShowProcessed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [triageLoading, setTriageLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Map<string, TriageSuggestion>>(
    new Map()
  );
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchLoading, setBatchLoading] = useState(false);
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

  // --- Smart Sort / AI Triage ---
  async function handleSmartSort() {
    if (captures.length === 0) return;
    setTriageLoading(true);
    try {
      const res = await fetch("/api/triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          captures: captures.map((c) => ({ id: c.id, content: c.content })),
        }),
      });
      if (!res.ok) throw new Error("Failed to triage");
      const data = await res.json();
      const map = new Map<string, TriageSuggestion>();
      for (const s of data.suggestions) {
        map.set(s.id, s);
      }
      setSuggestions(map);
      toast.success("Smart Sort complete");
    } catch {
      toast.error("Failed to analyze captures");
    } finally {
      setTriageLoading(false);
    }
  }

  async function acceptSuggestion(capture: Capture) {
    const suggestion = suggestions.get(capture.id);
    if (!suggestion) return;
    switch (suggestion.suggestion) {
      case "note":
        await convertToNote(capture);
        break;
      case "todo":
        await convertToTodo(capture);
        break;
      case "bookmark":
        await convertToBookmark(capture);
        break;
    }
    setSuggestions((prev) => {
      const next = new Map(prev);
      next.delete(capture.id);
      return next;
    });
  }

  // --- Selection / Batch ---
  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === captures.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(captures.map((c) => c.id)));
    }
  }

  async function batchConvert(type: "note" | "todo") {
    if (selectedIds.size === 0) return;
    setBatchLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setBatchLoading(false);
      return;
    }

    const selected = captures.filter((c) => selectedIds.has(c.id));
    let successCount = 0;

    for (const capture of selected) {
      try {
        if (type === "note") {
          const { data: note } = await supabase
            .from("notes")
            .insert({
              user_id: user.id,
              title: capture.content.slice(0, 60),
              content: null,
              tags: [],
            })
            .select("id")
            .single();

          if (note) {
            await supabase
              .from("captures")
              .update({
                processed: true,
                converted_to: "note",
                converted_id: note.id,
              })
              .eq("id", capture.id);
            successCount++;
          }
        } else {
          const { data: todo } = await supabase
            .from("todos")
            .insert({
              user_id: user.id,
              title: capture.content.slice(0, 200),
              priority: "medium",
            })
            .select("id")
            .single();

          if (todo) {
            await supabase
              .from("captures")
              .update({
                processed: true,
                converted_to: "todo",
                converted_id: todo.id,
              })
              .eq("id", capture.id);
            successCount++;
          }
        }
      } catch {
        // continue with others
      }
    }

    toast.success(
      `Converted ${successCount} capture${successCount !== 1 ? "s" : ""} to ${type}${type === "note" ? "s" : "s"}`
    );
    setSelectedIds(new Set());
    setBatchLoading(false);
    fetchCaptures();
    router.refresh();
  }

  async function batchDismiss() {
    if (selectedIds.size === 0) return;
    setBatchLoading(true);

    const ids = Array.from(selectedIds);
    await supabase
      .from("captures")
      .update({ processed: true })
      .in("id", ids);

    toast.success(
      `Dismissed ${ids.length} capture${ids.length !== 1 ? "s" : ""}`
    );
    setSelectedIds(new Set());
    setBatchLoading(false);
    fetchCaptures();
  }

  // --- Single actions ---
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

    const urlMatch = capture.content.match(/https?:\/\/[^\s]+/);
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

  const hasSelection = selectedIds.size > 0;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Inbox</h1>
          <p className="text-sm text-muted-foreground">
            {captures.length} unprocessed capture
            {captures.length !== 1 ? "s" : ""}
          </p>
        </div>
        {captures.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleSmartSort}
            disabled={triageLoading}
          >
            {triageLoading ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Sparkles className="size-3.5" />
            )}
            <span className="ml-1">Smart Sort</span>
          </Button>
        )}
      </div>

      {/* Batch actions bar */}
      {hasSelection && (
        <div className="flex items-center gap-2 rounded-lg border bg-muted/50 p-3">
          <span className="text-sm font-medium">
            {selectedIds.size} selected
          </span>
          <div className="ml-auto flex gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => batchConvert("note")}
              disabled={batchLoading}
            >
              <StickyNote className="size-3.5" />
              <span className="ml-1">All to Notes</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => batchConvert("todo")}
              disabled={batchLoading}
            >
              <ListChecks className="size-3.5" />
              <span className="ml-1">All to Todos</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={batchDismiss}
              disabled={batchLoading}
            >
              <Trash2 className="size-3.5" />
              <span className="ml-1">Dismiss All</span>
            </Button>
          </div>
        </div>
      )}

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
          {/* Select all */}
          <div className="flex items-center gap-2 px-1">
            <Checkbox
              checked={
                selectedIds.size === captures.length && captures.length > 0
              }
              onCheckedChange={toggleSelectAll}
            />
            <span className="text-xs text-muted-foreground">Select all</span>
          </div>

          {captures.map((capture) => {
            const suggestion = suggestions.get(capture.id);
            const SuggIcon = suggestion
              ? SUGGESTION_ICON[suggestion.suggestion]
              : null;

            return (
              <Card key={capture.id} className="p-4">
                <div className="flex items-start gap-3">
                  {/* Checkbox */}
                  <div className="pt-0.5">
                    <Checkbox
                      checked={selectedIds.has(capture.id)}
                      onCheckedChange={() => toggleSelect(capture.id)}
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    {/* AI suggestion badge */}
                    {suggestion && (
                      <div className="mb-2 flex items-center gap-2">
                        <Badge
                          variant={
                            CONFIDENCE_VARIANT[suggestion.confidence] ??
                            "outline"
                          }
                          className="gap-1"
                        >
                          {SuggIcon && <SuggIcon className="size-3" />}
                          {suggestion.suggestion}
                          <span className="opacity-60">
                            ({suggestion.confidence})
                          </span>
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {suggestion.reason}
                        </span>
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() => acceptSuggestion(capture)}
                          disabled={actionLoading === capture.id}
                          className="ml-auto"
                        >
                          <Check className="size-3" />
                          <span className="ml-0.5">Accept</span>
                        </Button>
                      </div>
                    )}

                    <p className="text-sm whitespace-pre-wrap">
                      <RichContent content={capture.content} />
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
                      <span className="sr-only sm:not-sr-only sm:ml-1">
                        Note
                      </span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => convertToTodo(capture)}
                      disabled={actionLoading === capture.id}
                      title="Convert to Todo"
                    >
                      <CheckSquare className="size-3.5" />
                      <span className="sr-only sm:not-sr-only sm:ml-1">
                        Todo
                      </span>
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
            );
          })}
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
                <Card key={capture.id} className="p-3 opacity-60">
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
