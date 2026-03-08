"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Wand2, Loader2, Plus, Check } from "lucide-react";

interface AutoTagButtonProps {
  noteId: string;
  currentContent: string;
  currentTags: string[];
  onTagsUpdated: (tags: string[]) => void;
}

export function AutoTagButton({
  noteId,
  currentContent,
  currentTags,
  onTagsUpdated,
}: AutoTagButtonProps) {
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const [acceptedTags, setAcceptedTags] = useState<Set<string>>(new Set());

  async function handleAutoTag() {
    if (!currentContent.trim()) return;

    setLoading(true);
    setSuggestedTags([]);
    setAcceptedTags(new Set());
    setOpen(true);

    try {
      const response = await fetch("/api/auto-tag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: currentContent,
          existingTags: currentTags,
        }),
      });

      if (!response.ok) throw new Error("Failed to get suggestions");

      const data = await response.json();
      // Filter out tags that already exist on the note
      const newTags = (data.tags as string[]).filter(
        (tag) => !currentTags.includes(tag)
      );
      setSuggestedTags(newTags);
    } catch (error) {
      console.error("Auto-tag error:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleAcceptTag(tag: string) {
    const updatedTags = [...currentTags, tag];
    setAcceptedTags((prev) => new Set([...prev, tag]));

    await supabase
      .from("notes")
      .update({ tags: updatedTags, updated_at: new Date().toISOString() })
      .eq("id", noteId);

    onTagsUpdated(updatedTags);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button variant="outline" size="xs" onClick={handleAutoTag} />
        }
      >
        <Wand2 data-icon="inline-start" />
        Auto-tag
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-3">
            <Loader2 className="size-4 animate-spin" />
            <span className="text-sm text-muted-foreground">
              Generating tags...
            </span>
          </div>
        ) : suggestedTags.length === 0 ? (
          <p className="py-2 text-center text-sm text-muted-foreground">
            No new tag suggestions.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium text-muted-foreground">
              Suggested tags
            </p>
            <div className="flex flex-wrap gap-1.5">
              {suggestedTags.map((tag) => {
                const isAccepted = acceptedTags.has(tag);
                return (
                  <Badge
                    key={tag}
                    variant={isAccepted ? "default" : "secondary"}
                    className="cursor-pointer gap-1 transition-colors"
                    onClick={() => !isAccepted && handleAcceptTag(tag)}
                  >
                    {isAccepted ? (
                      <Check className="size-3" />
                    ) : (
                      <Plus className="size-3" />
                    )}
                    {tag}
                  </Badge>
                );
              })}
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
