"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, X } from "lucide-react";

interface NoteTagManagerProps {
  noteId: string;
  initialTags: string[];
}

export function NoteTagManager({ noteId, initialTags }: NoteTagManagerProps) {
  const supabase = createClient();
  const [tags, setTags] = useState<string[]>(initialTags);
  const [newTag, setNewTag] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  async function updateTags(updatedTags: string[]) {
    setTags(updatedTags);
    await supabase
      .from("notes")
      .update({ tags: updatedTags, updated_at: new Date().toISOString() })
      .eq("id", noteId);
  }

  async function handleAddTag() {
    const tag = newTag.trim().toLowerCase();
    if (!tag || tags.includes(tag)) {
      setNewTag("");
      return;
    }
    await updateTags([...tags, tag]);
    setNewTag("");
    setIsAdding(false);
  }

  async function handleRemoveTag(tag: string) {
    await updateTags(tags.filter((t) => t !== tag));
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddTag();
    }
    if (e.key === "Escape") {
      setIsAdding(false);
      setNewTag("");
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-medium">Tags</h3>
      <div className="flex flex-wrap items-center gap-1.5">
        {tags.map((tag) => (
          <Badge key={tag} variant="secondary" className="gap-1">
            {tag}
            <button
              onClick={() => handleRemoveTag(tag)}
              className="ml-0.5 rounded-full hover:bg-foreground/10"
              aria-label={`Remove tag ${tag}`}
            >
              <X className="size-3" />
            </button>
          </Badge>
        ))}
        {isAdding ? (
          <div className="flex items-center gap-1">
            <Input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={() => {
                if (!newTag.trim()) setIsAdding(false);
              }}
              placeholder="Tag name"
              className="h-6 w-24 text-xs"
              autoFocus
            />
            <Button variant="ghost" size="icon-xs" onClick={handleAddTag}>
              <Plus />
            </Button>
          </div>
        ) : (
          <Button variant="outline" size="xs" onClick={() => setIsAdding(true)}>
            <Plus data-icon="inline-start" />
            Add tag
          </Button>
        )}
      </div>
    </div>
  );
}
