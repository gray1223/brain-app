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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import type { FlashcardDeck } from "@/types/database";

function parseBulkCards(text: string): { front: string; back: string }[] {
  const cards: { front: string; back: string }[] = [];
  const blocks = text.split(/\n\s*\n/);

  for (const block of blocks) {
    const trimmed = block.trim();
    if (!trimmed) continue;

    const qMatch = trimmed.match(/^Q:\s*(.+)/im);
    const aMatch = trimmed.match(/^A:\s*(.+)/im);

    if (qMatch && aMatch) {
      cards.push({
        front: qMatch[1].trim(),
        back: aMatch[1].trim(),
      });
    }
  }

  return cards;
}

export function CreateCardDialog({ decks }: { decks: FlashcardDeck[] }) {
  const [open, setOpen] = useState(false);
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [bulkText, setBulkText] = useState("");
  const [deckId, setDeckId] = useState(decks[0]?.id ?? "");
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  function resetForm() {
    setFront("");
    setBack("");
    setBulkText("");
  }

  async function handleSubmitSingle(e: React.FormEvent) {
    e.preventDefault();
    if (!front.trim() || !back.trim() || !deckId) return;

    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      return;
    }

    const { error } = await supabase.from("flashcards").insert({
      user_id: user.id,
      deck_id: deckId,
      front: front.trim(),
      back: back.trim(),
    });

    setSaving(false);

    if (error) {
      toast.error("Failed to create card");
      return;
    }

    toast.success("Card created");
    resetForm();
    setOpen(false);
    router.refresh();
  }

  async function handleSubmitBulk(e: React.FormEvent) {
    e.preventDefault();
    if (!bulkText.trim() || !deckId) return;

    const parsed = parseBulkCards(bulkText);
    if (parsed.length === 0) {
      toast.error("No valid cards found. Use the format:\nQ: question\nA: answer");
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
      parsed.map((card) => ({
        user_id: user.id,
        deck_id: deckId,
        front: card.front,
        back: card.back,
      }))
    );

    setSaving(false);

    if (error) {
      toast.error("Failed to create cards");
      return;
    }

    toast.success(`Created ${parsed.length} cards`);
    resetForm();
    setOpen(false);
    router.refresh();
  }

  if (decks.length === 0) {
    return null;
  }

  const bulkParsed = bulkText.trim() ? parseBulkCards(bulkText) : [];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" />}>
        <Plus className="size-4" data-icon="inline-start" />
        Add Card
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Flashcard</DialogTitle>
          <DialogDescription>
            Add cards to a deck individually or in bulk.
          </DialogDescription>
        </DialogHeader>

        {/* Deck selector (shared between tabs) */}
        <div className="mt-2 space-y-2">
          <Label>Deck</Label>
          <Select value={deckId} onValueChange={(val) => setDeckId(val ?? "")}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a deck" />
            </SelectTrigger>
            <SelectContent>
              {decks.map((deck) => (
                <SelectItem key={deck.id} value={deck.id}>
                  {deck.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Tabs defaultValue="single">
          <TabsList>
            <TabsTrigger value="single">Single</TabsTrigger>
            <TabsTrigger value="bulk">Bulk Add</TabsTrigger>
          </TabsList>

          <TabsContent value="single">
            <form onSubmit={handleSubmitSingle}>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="card-front">Front</Label>
                  <Textarea
                    id="card-front"
                    placeholder="Question or prompt..."
                    value={front}
                    onChange={(e) => setFront(e.target.value)}
                    required
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="card-back">Back</Label>
                  <Textarea
                    id="card-back"
                    placeholder="Answer..."
                    value={back}
                    onChange={(e) => setBack(e.target.value)}
                    required
                    rows={3}
                  />
                </div>
              </div>

              <DialogFooter className="mt-4">
                <DialogClose render={<Button variant="outline" />}>
                  Cancel
                </DialogClose>
                <Button
                  type="submit"
                  disabled={saving || !front.trim() || !back.trim() || !deckId}
                >
                  {saving ? "Creating..." : "Create Card"}
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>

          <TabsContent value="bulk">
            <form onSubmit={handleSubmitBulk}>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="bulk-cards">Cards</Label>
                  <Textarea
                    id="bulk-cards"
                    placeholder={`Q: What is photosynthesis?\nA: The process by which plants convert light energy into chemical energy.\n\nQ: What is the mitochondria?\nA: The powerhouse of the cell.`}
                    value={bulkText}
                    onChange={(e) => setBulkText(e.target.value)}
                    required
                    rows={8}
                    className="min-h-[160px] font-mono text-xs"
                  />
                </div>
                {bulkText.trim() && (
                  <p className="text-xs text-muted-foreground">
                    {bulkParsed.length} card{bulkParsed.length !== 1 ? "s" : ""}{" "}
                    detected
                  </p>
                )}
              </div>

              <DialogFooter className="mt-4">
                <DialogClose render={<Button variant="outline" />}>
                  Cancel
                </DialogClose>
                <Button
                  type="submit"
                  disabled={saving || bulkParsed.length === 0 || !deckId}
                >
                  {saving
                    ? "Creating..."
                    : `Create ${bulkParsed.length} Card${bulkParsed.length !== 1 ? "s" : ""}`}
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
