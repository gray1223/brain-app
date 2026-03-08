"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Brain, Loader2, Link2, Check, FileText } from "lucide-react";
import Link from "next/link";

interface SmartConnectionsButtonProps {
  noteId: string;
  title: string;
  content: string;
}

interface SuggestedConnection {
  id: string;
  title: string;
  reason: string;
}

export function SmartConnectionsButton({
  noteId,
  title,
  content,
}: SmartConnectionsButtonProps) {
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestedConnection[]>([]);
  const [linkedIds, setLinkedIds] = useState<Set<string>>(new Set());

  async function handleFindConnections() {
    if (!content.trim()) return;

    setLoading(true);
    setSuggestions([]);
    setLinkedIds(new Set());
    setOpen(true);

    try {
      const response = await fetch("/api/smart-connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ noteId, content, title }),
      });

      if (!response.ok) throw new Error("Failed to find connections");

      const data = await response.json();
      setSuggestions(data.connections);
    } catch (error) {
      console.error("Smart connections error:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleLink(targetId: string) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("note_connections").insert({
      note_a_id: noteId,
      note_b_id: targetId,
      user_id: user.id,
    });

    if (!error) {
      setLinkedIds((prev) => new Set([...prev, targetId]));
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={handleFindConnections}
          />
        }
      >
        <Brain data-icon="inline-start" />
        Find connections
      </PopoverTrigger>
      <PopoverContent align="start" side="bottom" className="w-80">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-4">
            <Loader2 className="size-4 animate-spin" />
            <span className="text-sm text-muted-foreground">
              Analyzing connections...
            </span>
          </div>
        ) : suggestions.length === 0 ? (
          <p className="py-3 text-center text-sm text-muted-foreground">
            No connections found.
          </p>
        ) : (
          <div className="flex flex-col gap-1">
            <p className="mb-1 text-xs font-medium text-muted-foreground">
              Suggested connections
            </p>
            {suggestions.map((suggestion) => {
              const isLinked = linkedIds.has(suggestion.id);
              return (
                <div
                  key={suggestion.id}
                  className="flex items-start justify-between gap-2 rounded-md p-1.5 hover:bg-muted"
                >
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <Link
                      href={`/notes/${suggestion.id}`}
                      className="flex items-center gap-1.5 truncate text-sm font-medium hover:underline"
                    >
                      <FileText className="size-3.5 shrink-0 text-muted-foreground" />
                      <span className="truncate">
                        {suggestion.title || "Untitled"}
                      </span>
                    </Link>
                    <span className="text-xs text-muted-foreground">
                      {suggestion.reason}
                    </span>
                  </div>
                  <Button
                    variant={isLinked ? "ghost" : "outline"}
                    size="icon-xs"
                    onClick={() => !isLinked && handleLink(suggestion.id)}
                    disabled={isLinked}
                    aria-label={`Link ${suggestion.title}`}
                  >
                    {isLinked ? <Check /> : <Link2 />}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
