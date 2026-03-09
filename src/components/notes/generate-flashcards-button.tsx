"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { GraduationCap, Loader2, Check } from "lucide-react";
import { toast } from "sonner";

interface GenerateFlashcardsButtonProps {
  noteId: string;
  noteTitle: string;
  noteContent: Record<string, unknown> | null;
}

interface GeneratedCard {
  front: string;
  back: string;
  selected: boolean;
}

function extractTextFromTiptap(content: Record<string, unknown> | null): string {
  if (!content) return "";
  function walk(node: Record<string, unknown>): string {
    if (node.type === "text") return (node.text as string) ?? "";
    const children = node.content as Record<string, unknown>[] | undefined;
    if (!children) return "";
    return children.map(walk).join(" ");
  }
  return walk(content).trim();
}

export function GenerateFlashcardsButton({
  noteId,
  noteTitle,
  noteContent,
}: GenerateFlashcardsButtonProps) {
  const [open, setOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cards, setCards] = useState<GeneratedCard[]>([]);
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);
  const [decks, setDecks] = useState<{ id: string; name: string }[]>([]);
  const [newDeckName, setNewDeckName] = useState("");
  const router = useRouter();
  const supabase = createClient();

  async function loadDecks() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("flashcard_decks")
      .select("id, name")
      .eq("user_id", user.id)
      .order("name");
    setDecks(data ?? []);
  }

  async function handleGenerate() {
    setGenerating(true);
    try {
      const text = extractTextFromTiptap(noteContent);
      if (text.length < 20) {
        toast.error("Note is too short to generate flashcards");
        setGenerating(false);
        return;
      }

      const res = await fetch("/api/flashcards/generate-from-note", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: noteTitle, content: text }),
      });

      if (!res.ok) {
        const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 10);
        const fallbackCards = sentences.slice(0, 5).map((s) => ({
          front: `What do you know about: ${s.trim().slice(0, 80)}...?`,
          back: s.trim(),
          selected: true,
        }));
        setCards(fallbackCards);
        setGenerating(false);
        return;
      }

      const data = await res.json();
      setCards(
        (data.cards as { front: string; back: string }[]).map((c) => ({
          ...c,
          selected: true,
        }))
      );
    } catch {
      toast.error("Failed to generate flashcards");
    } finally {
      setGenerating(false);
    }
  }

  async function handleSave() {
    const selectedCards = cards.filter((c) => c.selected);
    if (selectedCards.length === 0) {
      toast.error("Select at least one card");
      return;
    }

    setSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      let deckId = selectedDeckId;

      if (!deckId) {
        const deckName = newDeckName.trim() || `From: ${noteTitle}`;
        const { data } = await supabase
          .from("flashcard_decks")
          .insert({ user_id: user.id, name: deckName })
          .select("id")
          .single();
        if (!data) throw new Error("Failed to create deck");
        deckId = data.id;
      }

      const today = new Date().toISOString().split("T")[0];
      const { error } = await supabase.from("flashcards").insert(
        selectedCards.map((c) => ({
          deck_id: deckId,
          user_id: user.id,
          front: c.front,
          back: c.back,
          ease_factor: 2.5,
          interval_days: 0,
          next_review: today,
          review_count: 0,
        }))
      );

      if (error) throw error;

      toast.success(`Created ${selectedCards.length} flashcards!`);
      setOpen(false);
      setCards([]);
      router.refresh();
    } catch {
      toast.error("Failed to save flashcards");
    } finally {
      setSaving(false);
    }
  }

  function toggleCard(index: number) {
    setCards((prev) =>
      prev.map((c, i) => (i === index ? { ...c, selected: !c.selected } : c))
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (isOpen) {
          loadDecks();
          if (cards.length === 0) handleGenerate();
        }
      }}
    >
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            <GraduationCap className="size-4" data-icon="inline-start" />
            Generate Flashcards
          </Button>
        }
      />
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Generate Flashcards from Note</DialogTitle>
          <DialogDescription>
            AI will create flashcards from &ldquo;{noteTitle}&rdquo;
          </DialogDescription>
        </DialogHeader>

        {generating && (
          <div className="flex flex-col items-center gap-3 py-8">
            <Loader2 className="size-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Generating flashcards...</p>
          </div>
        )}

        {!generating && cards.length > 0 && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Save to deck</label>
              <select
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={selectedDeckId ?? ""}
                onChange={(e) => setSelectedDeckId(e.target.value || null)}
              >
                <option value="">+ Create new deck</option>
                {decks.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
              {!selectedDeckId && (
                <input
                  type="text"
                  placeholder={`From: ${noteTitle}`}
                  value={newDeckName}
                  onChange={(e) => setNewDeckName(e.target.value)}
                  className="mt-2 w-full rounded-md border bg-background px-3 py-2 text-sm"
                />
              )}
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {cards.map((card, i) => (
                <button
                  key={i}
                  onClick={() => toggleCard(i)}
                  className={`w-full rounded-lg border p-3 text-left transition-colors ${
                    card.selected
                      ? "border-primary/50 bg-primary/5"
                      : "border-border opacity-50"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <div
                      className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border ${
                        card.selected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-muted-foreground"
                      }`}
                    >
                      {card.selected && <Check className="size-3" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{card.front}</p>
                      <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                        {card.back}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <p className="text-xs text-muted-foreground">
              {cards.filter((c) => c.selected).length} of {cards.length} cards selected
            </p>

            <DialogFooter>
              <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="size-4 animate-spin" data-icon="inline-start" />
                    Saving...
                  </>
                ) : (
                  `Save ${cards.filter((c) => c.selected).length} Cards`
                )}
              </Button>
            </DialogFooter>
          </div>
        )}

        {!generating && cards.length === 0 && (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">No cards generated yet.</p>
            <Button className="mt-3" onClick={handleGenerate}>
              Generate
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
