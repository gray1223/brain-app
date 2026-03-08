import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreateDeckDialog } from "@/components/flashcards/create-deck-dialog";
import { CreateCardDialog } from "@/components/flashcards/create-card-dialog";
import { Layers, GraduationCap } from "lucide-react";
import Link from "next/link";
import type { FlashcardDeck, Flashcard } from "@/types/database";

export default async function FlashcardsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const [{ data: decksData }, { data: cardsData }] = await Promise.all([
    supabase
      .from("flashcard_decks")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase.from("flashcards").select("*"),
  ]);

  const decks = (decksData as FlashcardDeck[]) ?? [];
  const cards = (cardsData as Flashcard[]) ?? [];

  const today = new Date().toISOString().split("T")[0];
  const totalDue = cards.filter((c) => c.next_review <= today).length;

  function getCardCount(deckId: string) {
    return cards.filter((c) => c.deck_id === deckId).length;
  }

  function getDueCount(deckId: string) {
    return cards.filter(
      (c) => c.deck_id === deckId && c.next_review <= today
    ).length;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Flashcards</h1>
          <p className="text-sm text-muted-foreground">
            {decks.length} deck{decks.length !== 1 ? "s" : ""} &middot;{" "}
            {cards.length} card{cards.length !== 1 ? "s" : ""} &middot;{" "}
            {totalDue} due for review
          </p>
        </div>
        <div className="flex items-center gap-2">
          <CreateCardDialog decks={decks} />
          <CreateDeckDialog />
        </div>
      </div>

      {totalDue > 0 && (
        <Button render={<Link href="/flashcards/study" />} className="w-full">
          <GraduationCap className="size-4" data-icon="inline-start" />
          Review {totalDue} Due Card{totalDue !== 1 ? "s" : ""}
        </Button>
      )}

      {decks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Layers className="mb-4 size-12 text-muted-foreground/50" />
          <h3 className="text-sm font-medium">No decks yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Create your first flashcard deck to get started.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {decks.map((deck) => {
            const cardCount = getCardCount(deck.id);
            const dueCount = getDueCount(deck.id);

            return (
              <Card key={deck.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-medium">{deck.name}</h3>
                    {deck.description && (
                      <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                        {deck.description}
                      </p>
                    )}
                    <div className="mt-2 flex items-center gap-2">
                      <Badge variant="secondary">
                        {cardCount} card{cardCount !== 1 ? "s" : ""}
                      </Badge>
                      {dueCount > 0 && (
                        <Badge variant="default">
                          {dueCount} due
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
