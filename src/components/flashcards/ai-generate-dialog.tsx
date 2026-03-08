"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
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
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { Sparkles, Loader2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

interface GeneratedCard {
  front: string;
  back: string;
  selected: boolean;
  showBack: boolean;
}

export function AIGenerateDialog({ deckId }: { deckId: string }) {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState("");
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cards, setCards] = useState<GeneratedCard[]>([]);
  const router = useRouter();
  const supabase = createClient();

  function resetForm() {
    setContent("");
    setCards([]);
  }

  async function handleGenerate() {
    if (!content.trim()) return;

    setGenerating(true);
    try {
      const res = await fetch("/api/flashcards/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content.trim(), deckId }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to generate");
      }

      const data = await res.json();
      setCards(
        data.cards.map((c: { front: string; back: string }) => ({
          ...c,
          selected: true,
          showBack: false,
        }))
      );
      toast.success(`Generated ${data.cards.length} flashcards`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to generate flashcards"
      );
    } finally {
      setGenerating(false);
    }
  }

  function toggleSelect(index: number) {
    setCards((prev) =>
      prev.map((c, i) =>
        i === index ? { ...c, selected: !c.selected } : c
      )
    );
  }

  function toggleShowBack(index: number) {
    setCards((prev) =>
      prev.map((c, i) =>
        i === index ? { ...c, showBack: !c.showBack } : c
      )
    );
  }

  function selectAll() {
    setCards((prev) => prev.map((c) => ({ ...c, selected: true })));
  }

  function deselectAll() {
    setCards((prev) => prev.map((c) => ({ ...c, selected: false })));
  }

  async function handleAddSelected() {
    const selected = cards.filter((c) => c.selected);
    if (selected.length === 0) {
      toast.error("No cards selected");
      return;
    }

    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      return;
    }

    const { error } = await supabase.from("flashcards").insert(
      selected.map((c) => ({
        user_id: user.id,
        deck_id: deckId,
        front: c.front,
        back: c.back,
      }))
    );

    setSaving(false);

    if (error) {
      toast.error("Failed to add cards");
      return;
    }

    toast.success(`Added ${selected.length} cards to deck`);
    resetForm();
    setOpen(false);
    router.refresh();
  }

  const selectedCount = cards.filter((c) => c.selected).length;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" />}>
        <Sparkles className="size-4" data-icon="inline-start" />
        AI Generate
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>AI Flashcard Generator</DialogTitle>
          <DialogDescription>
            Paste your study notes, textbook excerpts, or any text to
            automatically generate flashcards.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          {cards.length === 0 ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="ai-content">Source Text</Label>
                <Textarea
                  id="ai-content"
                  placeholder="Paste your notes, textbook content, article, or any study material here..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={10}
                  className="min-h-[200px]"
                />
              </div>

              <Button
                className="w-full"
                onClick={handleGenerate}
                disabled={generating || !content.trim()}
              >
                {generating ? (
                  <>
                    <Loader2 className="size-4 animate-spin" data-icon="inline-start" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="size-4" data-icon="inline-start" />
                    Generate Flashcards
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {selectedCount} of {cards.length} cards selected
                </p>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={selectAll}>
                    Select All
                  </Button>
                  <Button variant="ghost" size="sm" onClick={deselectAll}>
                    Deselect All
                  </Button>
                </div>
              </div>

              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {cards.map((card, index) => (
                  <Card
                    key={index}
                    className={`p-3 transition-colors ${
                      card.selected
                        ? "border-primary/30 bg-primary/5"
                        : "opacity-50"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={card.selected}
                        onCheckedChange={() => toggleSelect(index)}
                        className="mt-0.5"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{card.front}</p>
                        {card.showBack && (
                          <p className="mt-1.5 text-sm text-muted-foreground border-t pt-1.5">
                            {card.back}
                          </p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => toggleShowBack(index)}
                      >
                        {card.showBack ? (
                          <EyeOff className="size-3.5" />
                        ) : (
                          <Eye className="size-3.5" />
                        )}
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCards([])}
              >
                Back to Editor
              </Button>
            </>
          )}
        </div>

        {cards.length > 0 && (
          <DialogFooter className="mt-4">
            <DialogClose render={<Button variant="outline" />}>
              Cancel
            </DialogClose>
            <Button
              onClick={handleAddSelected}
              disabled={saving || selectedCount === 0}
            >
              {saving
                ? "Adding..."
                : `Add ${selectedCount} Card${selectedCount !== 1 ? "s" : ""}`}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
