import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreateDeckDialog } from "@/components/flashcards/create-deck-dialog";
import {
  Layers,
  GraduationCap,
  TrendingUp,
  Calendar,
  BookOpen,
  Play,
} from "lucide-react";
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
  const totalMastered = cards.filter((c) => c.interval_days > 21).length;

  function getCardCount(deckId: string) {
    return cards.filter((c) => c.deck_id === deckId).length;
  }

  function getDueCount(deckId: string) {
    return cards.filter(
      (c) => c.deck_id === deckId && c.next_review <= today
    ).length;
  }

  function getMasteredCount(deckId: string) {
    return cards.filter(
      (c) => c.deck_id === deckId && c.interval_days > 21
    ).length;
  }

  function getMasteryPercent(deckId: string) {
    const total = getCardCount(deckId);
    if (total === 0) return 0;
    return Math.round((getMasteredCount(deckId) / total) * 100);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Flashcards</h1>
          <p className="text-sm text-muted-foreground">
            Spaced repetition for effective learning
          </p>
        </div>
        <CreateDeckDialog />
      </div>

      {/* Stats overview */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3 text-center">
          <BookOpen className="mx-auto mb-1 size-5 text-muted-foreground" />
          <p className="text-lg font-semibold">{cards.length}</p>
          <p className="text-xs text-muted-foreground">Total Cards</p>
        </Card>
        <Card className="p-3 text-center">
          <Calendar className="mx-auto mb-1 size-5 text-muted-foreground" />
          <p className="text-lg font-semibold">{totalDue}</p>
          <p className="text-xs text-muted-foreground">Due Today</p>
        </Card>
        <Card className="p-3 text-center">
          <TrendingUp className="mx-auto mb-1 size-5 text-muted-foreground" />
          <p className="text-lg font-semibold">{totalMastered}</p>
          <p className="text-xs text-muted-foreground">Mastered</p>
        </Card>
      </div>

      {/* Study all due button */}
      {totalDue > 0 && (
        <Button render={<Link href="/flashcards/study" />} className="w-full" size="lg">
          <GraduationCap className="size-5" data-icon="inline-start" />
          Study All Due Cards ({totalDue})
        </Button>
      )}

      {/* Deck list */}
      {decks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Layers className="mb-4 size-12 text-muted-foreground/50" />
          <h3 className="text-lg font-medium">No decks yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Create your first flashcard deck to get started.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {decks.map((deck) => {
            const cardCount = getCardCount(deck.id);
            const dueCount = getDueCount(deck.id);
            const masteryPercent = getMasteryPercent(deck.id);

            return (
              <Card key={deck.id} className="p-4 transition-colors hover:bg-muted/50">
                <Link href={`/flashcards/${deck.id}`} className="block">
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

                    {/* Mastery progress bar */}
                    {cardCount > 0 && (
                      <div className="mt-3 space-y-1">
                        <div className="flex justify-between text-[10px] text-muted-foreground">
                          <span>Mastery</span>
                          <span>{masteryPercent}%</span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${masteryPercent}%`,
                              backgroundColor:
                                masteryPercent >= 80
                                  ? "#22c55e"
                                  : masteryPercent >= 40
                                    ? "#eab308"
                                    : "#ef4444",
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </Link>

                {/* Quick study button */}
                {dueCount > 0 && (
                  <Link
                    href={`/flashcards/study?deck=${deck.id}`}
                    className="mt-3 flex items-center justify-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium text-primary shadow-sm transition-colors hover:bg-primary hover:text-primary-foreground"
                  >
                    <Play className="size-3" />
                    Study {dueCount} due card{dueCount !== 1 ? "s" : ""}
                  </Link>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
