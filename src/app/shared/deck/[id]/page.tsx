import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { FlashcardDeck, Flashcard } from "@/types/database";
import { CloneButton } from "./clone-button";

export default async function SharedDeckPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch the deck. RLS means only the owner's client can read it.
  // If the visitor is the owner they'll see it; otherwise we show a
  // limited preview based on what the API returns.
  const { data: deck } = await supabase
    .from("flashcard_decks")
    .select("*")
    .eq("id", id)
    .single();

  // Fetch cards if we got the deck (owner viewing their own shared link)
  let cards: Pick<Flashcard, "id" | "front">[] = [];
  let cardCount = 0;
  let isOwner = false;

  if (deck) {
    isOwner = user?.id === deck.user_id;
    const { data: cardsData } = await supabase
      .from("flashcards")
      .select("id, front")
      .eq("deck_id", id)
      .order("created_at", { ascending: true });

    cards = cardsData ?? [];
    cardCount = cards.length;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <Link
            href="/"
            className="text-lg font-semibold tracking-tight"
          >
            BrainSpace
          </Link>
          {user ? (
            <Link
              href="/flashcards"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              My Decks
            </Link>
          ) : (
            <Link
              href="/auth/login"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Log in
            </Link>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        {!deck ? (
          <div className="rounded-lg border bg-card p-8 text-center">
            <h1 className="text-xl font-semibold">Deck Not Found</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              This deck doesn&apos;t exist or is no longer available.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="rounded-lg border bg-card p-6">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Shared Flashcard Deck
              </p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight">
                {deck.name}
              </h1>
              {deck.description && (
                <p className="mt-2 text-sm text-muted-foreground">
                  {deck.description}
                </p>
              )}
              <p className="mt-3 text-sm text-muted-foreground">
                {cardCount} card{cardCount !== 1 ? "s" : ""}
              </p>

              <div className="mt-6">
                {isOwner ? (
                  <Link
                    href={`/flashcards/${deck.id}`}
                    className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                  >
                    Open in My Decks
                  </Link>
                ) : user ? (
                  <CloneButton deckId={deck.id} />
                ) : (
                  <Link
                    href={`/auth/login?redirect=/shared/deck/${deck.id}`}
                    className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                  >
                    Log in to Clone This Deck
                  </Link>
                )}
              </div>
            </div>

            {/* Card preview */}
            {cards.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-sm font-medium text-muted-foreground">
                  Card Preview
                </h2>
                <div className="grid gap-2">
                  {cards.slice(0, 20).map((card) => (
                    <div
                      key={card.id}
                      className="rounded-md border bg-card px-4 py-3 text-sm"
                    >
                      {card.front}
                    </div>
                  ))}
                  {cards.length > 20 && (
                    <p className="text-center text-xs text-muted-foreground">
                      and {cards.length - 20} more cards...
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
