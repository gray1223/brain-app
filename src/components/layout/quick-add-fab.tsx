"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Plus,
  X,
  StickyNote,
  CheckSquare,
  Lightbulb,
  BookOpen,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const ACTIONS = [
  { id: "note", label: "Note", icon: StickyNote, color: "bg-blue-500" },
  { id: "task", label: "Task", icon: CheckSquare, color: "bg-green-500" },
  { id: "idea", label: "Idea", icon: Lightbulb, color: "bg-yellow-500" },
  { id: "journal", label: "Journal", icon: BookOpen, color: "bg-purple-500" },
] as const;

export function QuickAddFab() {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const router = useRouter();
  const supabase = createClient();
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
      if (e.metaKey && e.shiftKey && e.code === "Space") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  async function handleAction(actionId: string) {
    setCreating(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
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
          setOpen(false);
          router.push(`/notes/${data.id}`);
          return;
        }
      }

      if (actionId === "task") {
        await supabase.from("todos").insert({
          user_id: user.id,
          title: "New Task",
          priority: "medium",
        });
        setOpen(false);
        router.push("/todos");
        router.refresh();
        return;
      }

      if (actionId === "idea") {
        setOpen(false);
        router.push("/ideas");
        return;
      }

      if (actionId === "journal") {
        const today = new Date().toISOString().split("T")[0];
        setOpen(false);
        router.push(`/journal/${today}`);
        return;
      }
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
      {/* Action buttons */}
      <div
        className={cn(
          "absolute bottom-14 right-0 flex flex-col-reverse gap-2 transition-all duration-200",
          open ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
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
              open ? "translate-x-0 opacity-100" : "translate-x-4 opacity-0"
            )}
            style={{ transitionDelay: open ? `${i * 50}ms` : "0ms" }}
          >
            <action.icon className="size-4" />
            <span className="text-sm font-medium whitespace-nowrap">{action.label}</span>
          </button>
        ))}
      </div>

      {/* Main FAB */}
      <Button
        size="icon"
        className="size-12 rounded-full shadow-lg"
        onClick={() => setOpen(!open)}
      >
        <Plus
          className={cn(
            "size-5 transition-transform duration-200",
            open && "rotate-45"
          )}
        />
      </Button>
    </div>
  );
}
