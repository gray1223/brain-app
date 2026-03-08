"use client";

import { useMemo, useState } from "react";
import type { Note } from "@/types/database";
import { NoteCard } from "@/components/notes/note-card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface NotesListClientProps {
  notes: Note[];
  allTags: string[];
}

function getPlainText(content: Record<string, unknown> | null): string {
  if (!content) return "";
  try {
    const extractText = (node: Record<string, unknown>): string => {
      if (node.text && typeof node.text === "string") return node.text;
      if (Array.isArray(node.content)) {
        return node.content.map((child: Record<string, unknown>) => extractText(child)).join(" ");
      }
      return "";
    };
    return extractText(content);
  } catch {
    return "";
  }
}

export function NotesListClient({ notes: initialNotes, allTags }: NotesListClientProps) {
  const [notes, setNotes] = useState(initialNotes);
  const [search, setSearch] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const filteredNotes = useMemo(() => {
    let result = notes;

    if (selectedTags.length > 0) {
      result = result.filter((note) =>
        selectedTags.every((tag) => note.tags?.includes(tag))
      );
    }

    if (search.trim()) {
      const query = search.toLowerCase();
      result = result.filter((note) => {
        const titleMatch = note.title.toLowerCase().includes(query);
        const contentMatch = getPlainText(note.content).toLowerCase().includes(query);
        const tagMatch = note.tags?.some((t) => t.toLowerCase().includes(query));
        return titleMatch || contentMatch || tagMatch;
      });
    }

    return result;
  }, [notes, search, selectedTags]);

  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  function handleRemoveNote(id: string) {
    setNotes((prev) => prev.filter((n) => n.id !== id));
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search notes..."
          className="pl-9"
        />
      </div>

      {allTags.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">Tags:</span>
          {allTags.map((tag) => (
            <button key={tag} onClick={() => toggleTag(tag)}>
              <Badge variant={selectedTags.includes(tag) ? "default" : "outline"}>
                {tag}
              </Badge>
            </button>
          ))}
          {selectedTags.length > 0 && (
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => setSelectedTags([])}
              aria-label="Clear tag filters"
            >
              <X />
            </Button>
          )}
        </div>
      )}

      {filteredNotes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <p className="text-sm">
            {notes.length === 0 ? "No notes yet. Create one to get started!" : "No notes match your search."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredNotes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              onArchive={handleRemoveNote}
              onDelete={handleRemoveNote}
            />
          ))}
        </div>
      )}
    </div>
  );
}
