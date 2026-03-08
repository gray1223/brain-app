"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";
import { JournalTemplates } from "@/components/journal/journal-templates";

const MOOD_OPTIONS = [
  { value: 1, emoji: "😢", label: "Awful" },
  { value: 2, emoji: "😕", label: "Bad" },
  { value: 3, emoji: "😐", label: "Okay" },
  { value: 4, emoji: "🙂", label: "Good" },
  { value: 5, emoji: "😄", label: "Great" },
];

const WRITING_PROMPTS = [
  "What made you smile today?",
  "What are you grateful for right now?",
  "Describe a challenge you faced and how you handled it.",
  "What's something new you learned today?",
  "How are you feeling right now, and why?",
  "What would make tomorrow a great day?",
  "Write about a moment that stood out today.",
  "What's on your mind that you haven't told anyone?",
  "Describe your ideal version of today.",
  "What's one thing you'd like to let go of?",
  "Who made a positive impact on your day?",
  "What are you looking forward to?",
  "Reflect on a recent decision you made.",
  "What's something you accomplished today, big or small?",
  "If today had a title, what would it be?",
];

function getDailyPrompt(date: string): string {
  // Use the date string to deterministically pick a prompt
  let hash = 0;
  for (let i = 0; i < date.length; i++) {
    hash = (hash << 5) - hash + date.charCodeAt(i);
    hash |= 0;
  }
  return WRITING_PROMPTS[Math.abs(hash) % WRITING_PROMPTS.length];
}

interface JournalEditorProps {
  entryId: string | null;
  date: string;
  initialContent: Record<string, unknown> | null;
  initialMood: number | null;
  initialTags: string[];
}

export function JournalEditor({
  entryId,
  date,
  initialContent,
  initialMood,
  initialTags,
}: JournalEditorProps) {
  const [mood, setMood] = useState<number | null>(initialMood);
  const [tags, setTags] = useState<string[]>(initialTags);
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [currentEntryId, setCurrentEntryId] = useState<string | null>(entryId);
  const [templateApplied, setTemplateApplied] = useState(!!initialContent);
  const isNewEntry = !initialContent;
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const supabase = createClient();

  const prompt = getDailyPrompt(date);

  const saveEntry = useCallback(
    async (content: Record<string, unknown>, currentMood: number | null, currentTags: string[]) => {
      setSaving(true);
      try {
        if (currentEntryId) {
          await supabase
            .from("journal_entries")
            .update({
              content,
              mood: currentMood,
              tags: currentTags,
            })
            .eq("id", currentEntryId);
        } else {
          const { data } = await supabase
            .from("journal_entries")
            .insert({
              date,
              content,
              mood: currentMood,
              tags: currentTags,
            })
            .select("id")
            .single();

          if (data) {
            setCurrentEntryId(data.id);
          }
        }
      } catch (error) {
        console.error("Failed to save journal entry:", error);
      } finally {
        setSaving(false);
      }
    },
    [currentEntryId, date, supabase]
  );

  const debouncedSave = useCallback(
    (content: Record<string, unknown>, currentMood: number | null, currentTags: string[]) => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(() => {
        saveEntry(content, currentMood, currentTags);
      }, 1000);
    },
    [saveEntry]
  );

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false }),
      Placeholder.configure({
        placeholder: prompt,
      }),
    ],
    content: initialContent || undefined,
    editorProps: {
      attributes: {
        class:
          "prose prose-sm dark:prose-invert max-w-none min-h-[300px] focus:outline-none px-4 py-3",
      },
    },
    onUpdate: ({ editor }) => {
      const json = editor.getJSON();
      debouncedSave(json as Record<string, unknown>, mood, tags);
    },
  });

  // Save when mood changes
  useEffect(() => {
    if (editor && (mood !== initialMood || currentEntryId)) {
      const json = editor.getJSON();
      debouncedSave(json as Record<string, unknown>, mood, tags);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mood]);

  // Save when tags change
  useEffect(() => {
    if (editor && currentEntryId) {
      const json = editor.getJSON();
      debouncedSave(json as Record<string, unknown>, mood, tags);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tags]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  function handleTemplateSelect(template: Record<string, unknown> | null) {
    if (editor) {
      if (template) {
        editor.commands.setContent(template);
      }
      setTemplateApplied(true);
    }
  }

  function handleAddTag(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && tagInput.trim()) {
      e.preventDefault();
      const newTag = tagInput.trim().toLowerCase();
      if (!tags.includes(newTag)) {
        setTags([...tags, newTag]);
      }
      setTagInput("");
    }
  }

  function handleRemoveTag(tag: string) {
    setTags(tags.filter((t) => t !== tag));
  }

  return (
    <div className="space-y-4">
      {/* Template Picker */}
      {isNewEntry && !templateApplied && (
        <JournalTemplates onSelect={handleTemplateSelect} />
      )}

      {/* Mood Picker */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-muted-foreground">
          How are you feeling?
        </label>
        <div className="flex gap-2">
          {MOOD_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() =>
                setMood(mood === option.value ? null : option.value)
              }
              className={`flex flex-col items-center gap-1 rounded-lg p-2 transition-all ${
                mood === option.value
                  ? "bg-primary/10 ring-2 ring-primary"
                  : "hover:bg-muted"
              }`}
            >
              <span className="text-2xl">{option.emoji}</span>
              <span className="text-xs text-muted-foreground">
                {option.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Editor */}
      <div className="rounded-lg border bg-background">
        <EditorContent editor={editor} />
      </div>

      {/* Tags */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-muted-foreground">
          Tags
        </label>
        <div className="flex flex-wrap items-center gap-1.5">
          {tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="gap-1">
              {tag}
              <button
                type="button"
                onClick={() => handleRemoveTag(tag)}
                className="ml-0.5 rounded-full hover:bg-muted-foreground/20"
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
          <Input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleAddTag}
            placeholder="Add a tag..."
            className="h-7 w-32 text-sm"
          />
        </div>
      </div>

      {/* Save indicator */}
      <div className="flex justify-end">
        <span className="text-xs text-muted-foreground">
          {saving ? "Saving..." : currentEntryId ? "Saved" : "Not saved yet"}
        </span>
      </div>
    </div>
  );
}
