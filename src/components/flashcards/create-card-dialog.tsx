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

export function CreateCardDialog({ decks }: { decks: FlashcardDeck[] }) {
  const [open, setOpen] = useState(false);
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [deckId, setDeckId] = useState(decks[0]?.id ?? "");
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  function resetForm() {
    setFront("");
    setBack("");
  }

  async function handleSubmit(e: React.FormEvent) {
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

  if (decks.length === 0) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" />}>
        <Plus className="size-4" data-icon="inline-start" />
        Add Card
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>New Flashcard</DialogTitle>
            <DialogDescription>
              Add a new card to a deck.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-4">
            <div className="space-y-2">
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
      </DialogContent>
    </Dialog>
  );
}
