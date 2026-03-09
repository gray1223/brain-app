"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Plus,
  StickyNote,
  CheckSquare,
  Lightbulb,
  BookOpen,
  Inbox,
  LinkIcon,
  CalendarIcon,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type InlineForm = "task" | "capture" | "bookmark" | null;

const ACTIONS = [
  { id: "note", label: "Note", icon: StickyNote, color: "bg-blue-500" },
  { id: "task", label: "Task", icon: CheckSquare, color: "bg-green-500" },
  { id: "capture", label: "Capture", icon: Inbox, color: "bg-orange-500" },
  { id: "bookmark", label: "Bookmark", icon: LinkIcon, color: "bg-teal-500" },
  { id: "idea", label: "Idea", icon: Lightbulb, color: "bg-yellow-500" },
  { id: "journal", label: "Journal", icon: BookOpen, color: "bg-purple-500" },
] as const;

export function QuickAddFab() {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [inlineForm, setInlineForm] = useState<InlineForm>(null);
  // Task form
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDueDate, setTaskDueDate] = useState("");
  // Capture form
  const [captureText, setCaptureText] = useState("");
  // Bookmark form
  const [bookmarkUrl, setBookmarkUrl] = useState("");

  const router = useRouter();
  const supabase = createClient();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function closeAll() {
    setOpen(false);
    setInlineForm(null);
    setTaskTitle("");
    setTaskDueDate("");
    setCaptureText("");
    setBookmarkUrl("");
  }

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") closeAll();
      if (e.metaKey && e.shiftKey && e.code === "Space") {
        e.preventDefault();
        if (open || inlineForm) {
          closeAll();
        } else {
          setOpen(true);
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, inlineForm]);

  // Close on click outside
  useEffect(() => {
    if (!open && !inlineForm) return;
    function handleClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        closeAll();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open, inlineForm]);

  // Focus input when inline form opens
  useEffect(() => {
    if (inlineForm) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [inlineForm]);

  async function getUser() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user;
  }

  async function handleAction(actionId: string) {
    // Actions that open inline forms
    if (actionId === "task" || actionId === "capture" || actionId === "bookmark") {
      setOpen(false);
      setInlineForm(actionId);
      return;
    }

    setCreating(true);
    try {
      const user = await getUser();
      if (!user) return;

      if (actionId === "note") {
        const { data } = await supabase
          .from("notes")
          .insert({
            user_id: user.id,
            title: "Untitled Note",
            content: null,
            tags: [],
          })
          .select("id")
          .single();
        if (data) {
          closeAll();
          router.push(`/notes/${data.id}`);
          return;
        }
      }

      if (actionId === "idea") {
        closeAll();
        router.push("/ideas");
        return;
      }

      if (actionId === "journal") {
        const today = new Date().toISOString().split("T")[0];
        closeAll();
        router.push(`/journal/${today}`);
        return;
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setCreating(false);
    }
  }

  async function handleTaskSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!taskTitle.trim()) return;

    setCreating(true);
    try {
      const user = await getUser();
      if (!user) return;

      const { error } = await supabase.from("todos").insert({
        user_id: user.id,
        title: taskTitle.trim(),
        priority: "medium",
        due_date: taskDueDate || null,
      });

      if (error) {
        toast.error("Failed to create task");
        return;
      }

      toast.success("Task created");
      closeAll();
      router.refresh();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setCreating(false);
    }
  }

  async function handleCaptureSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!captureText.trim()) return;

    setCreating(true);
    try {
      const user = await getUser();
      if (!user) return;

      const { error } = await supabase.from("captures").insert({
        user_id: user.id,
        content: captureText.trim(),
        processed: false,
      });

      if (error) {
        toast.error("Failed to save capture");
        return;
      }

      toast.success("Captured");
      closeAll();
      router.refresh();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setCreating(false);
    }
  }

  async function handleBookmarkSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!bookmarkUrl.trim()) return;

    setCreating(true);
    try {
      const user = await getUser();
      if (!user) return;

      let url = bookmarkUrl.trim();
      if (!/^https?:\/\//i.test(url)) {
        url = `https://${url}`;
      }

      // Extract a title from the URL as a fallback
      let title = url;
      try {
        const parsed = new URL(url);
        title = parsed.hostname.replace(/^www\./, "");
      } catch {
        // keep url as title
      }

      const { error } = await supabase.from("bookmarks").insert({
        user_id: user.id,
        url,
        title,
        tags: [],
      });

      if (error) {
        toast.error("Failed to save bookmark");
        return;
      }

      toast.success("Bookmark saved");
      closeAll();
      router.refresh();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div
      ref={containerRef}
      className="fixed right-4 z-40 bottom-20 md:bottom-6 md:right-6"
    >
      {/* Inline forms */}
      {inlineForm && (
        <div className="absolute bottom-14 right-0 w-72 rounded-xl border bg-card p-3 shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-200">
          {inlineForm === "task" && (
            <form onSubmit={handleTaskSubmit} className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-sm font-medium text-green-600">
                <CheckSquare className="size-3.5" />
                Quick Task
              </div>
              <Input
                ref={inputRef}
                placeholder="What needs to be done?"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                disabled={creating}
              />
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <CalendarIcon className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="date"
                    className="pl-7 text-xs"
                    value={taskDueDate}
                    onChange={(e) => setTaskDueDate(e.target.value)}
                    disabled={creating}
                  />
                </div>
                <Button
                  type="submit"
                  size="sm"
                  disabled={creating || !taskTitle.trim()}
                >
                  {creating ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    "Add"
                  )}
                </Button>
              </div>
            </form>
          )}

          {inlineForm === "capture" && (
            <form onSubmit={handleCaptureSubmit} className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-sm font-medium text-orange-600">
                <Inbox className="size-3.5" />
                Quick Capture
              </div>
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  placeholder="Capture a thought..."
                  value={captureText}
                  onChange={(e) => setCaptureText(e.target.value)}
                  disabled={creating}
                />
                <Button
                  type="submit"
                  size="sm"
                  disabled={creating || !captureText.trim()}
                >
                  {creating ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    "Save"
                  )}
                </Button>
              </div>
            </form>
          )}

          {inlineForm === "bookmark" && (
            <form
              onSubmit={handleBookmarkSubmit}
              className="flex flex-col gap-2"
            >
              <div className="flex items-center gap-2 text-sm font-medium text-teal-600">
                <LinkIcon className="size-3.5" />
                Quick Bookmark
              </div>
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  type="url"
                  placeholder="Paste a URL..."
                  value={bookmarkUrl}
                  onChange={(e) => setBookmarkUrl(e.target.value)}
                  disabled={creating}
                />
                <Button
                  type="submit"
                  size="sm"
                  disabled={creating || !bookmarkUrl.trim()}
                >
                  {creating ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    "Save"
                  )}
                </Button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Action buttons */}
      {!inlineForm && (
        <div
          className={cn(
            "absolute bottom-14 right-0 flex flex-col-reverse gap-2 transition-all duration-200",
            open
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-4 pointer-events-none"
          )}
        >
          {ACTIONS.map((action, i) => (
            <button
              key={action.id}
              onClick={() => handleAction(action.id)}
              disabled={creating}
              className={cn(
                "flex items-center gap-2.5 rounded-full pl-3 pr-4 py-2 text-white shadow-lg transition-all duration-200 hover:scale-105",
                action.color,
                open
                  ? "translate-x-0 opacity-100"
                  : "translate-x-4 opacity-0"
              )}
              style={{ transitionDelay: open ? `${i * 50}ms` : "0ms" }}
            >
              <action.icon className="size-4" />
              <span className="text-sm font-medium whitespace-nowrap">
                {action.label}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Main FAB */}
      <Button
        size="icon"
        className="size-12 rounded-full shadow-lg"
        onClick={() => {
          if (inlineForm) {
            closeAll();
          } else {
            setOpen(!open);
          }
        }}
      >
        <Plus
          className={cn(
            "size-5 transition-transform duration-200",
            (open || inlineForm) && "rotate-45"
          )}
        />
      </Button>
    </div>
  );
}
