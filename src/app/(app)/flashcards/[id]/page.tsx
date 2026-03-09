import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CreateCardDialog } from "@/components/flashcards/create-card-dialog";
import { AIGenerateDialog } from "@/components/flashcards/ai-generate-dialog";
import { CardList } from "@/components/flashcards/card-list";
import { ArrowLeft, GraduationCap, Play } from "lucide-react";
import Link from "next/link";
import type { FlashcardDeck, Flashcard } from "@/types/database";
import { ShareDialog } from "./share-dialog";

export default async function DeckDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const [{ data: deckData }, { data: cardsData }] = await Promise.all([
    supabase
      .from("flashcard_decks")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single(),
    supabase
      .from("flashcards")
      .select("*")
      .eq("deck_id", id)
      .order("created_at", { ascending: false }),
  ]);

  if (!deckData) {
    notFound();
  }

  const deck = deckData as FlashcardDeck;
  const cards = (cardsData as Flashcard[]) ?? [];

  const today = new Date().toISOString().split("T")[0];
  const dueCards = cards.filter((c) => c.next_review <= today);
  const masteredCards = cards.filter((c) => c.interval_days > 21);
  const newCards = cards.filter(
    (c) => c.interval_days === 0 || c.review_count === 0
  );
  const learningCards = cards.filter(
    (c) =>
      c.interval_days > 0 &&
      c.interval_days <= 21 &&
      c.review_count > 0
  );
  const masteryPercent =
    cards.length > 0 ? Math.round((masteredCards.length / cards.length) * 100) : 0;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" render={<Link href="/flashcards" />}>
          <ArrowLeft data-icon="inline-start" />
          Back
        </Button>
      </div>

      <div>
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
          {deck.name}
        </h1>
        {deck.description && (
          <p className="mt-1 text-sm text-muted-foreground">
            {deck.description}
          </p>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <Badge variant="secondary" className="text-[11px]">
            {cards.length} card{cards.length !== 1 ? "s" : ""}
          </Badge>
          {dueCards.length > 0 && (
            <Badge variant="default" className="text-[11px]">
              {dueCards.length} due
            </Badge>
          )}
          {newCards.length > 0 && (
            <Badge variant="secondary" className="text-[11px] text-red-600 dark:text-red-400">
              {newCards.length} new
            </Badge>
          )}
          {learningCards.length > 0 && (
            <Badge variant="secondary" className="text-[11px] text-yellow-600 dark:text-yellow-400">
              {learningCards.length} learning
            </Badge>
          )}
          <Badge variant="secondary" className="text-[11px] text-green-600 dark:text-green-400">
            {masteryPercent}% mastered
          </Badge>
        </div>
      </div>

      {/* Mastery progress bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Mastery Progress</span>
          <span>{masteryPercent}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-green-500 transition-all"
            style={{ width: `${masteryPercent}%` }}
          />
        </div>
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
        {dueCards.length > 0 && (
          <Button
            className="col-span-2"
            size="lg"
            render={<Link href={`/flashcards/study?deck=${deck.id}`} />}
          >
            <GraduationCap className="size-4" data-icon="inline-start" />
            Study {dueCards.length} Due
          </Button>
        )}
        {cards.length > 0 && (
          <Button
            variant={dueCards.length > 0 ? "outline" : "default"}
            size={dueCards.length > 0 ? "default" : "lg"}
            className={dueCards.length > 0 ? "" : "col-span-2"}
            render={
              <Link
                href={`/flashcards/study?deck=${deck.id}&mode=all`}
              />
            }
          >
            <Play className="size-4" data-icon="inline-start" />
            Practice All
          </Button>
        )}
        <CreateCardDialog decks={[deck]} />
        <AIGenerateDialog deckId={deck.id} />
        <ShareDialog deckId={deck.id} deckName={deck.name} />
      </div>

      {/* Tabs for card views */}
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">
            All ({cards.length})
          </TabsTrigger>
          <TabsTrigger value="due">
            Due ({dueCards.length})
          </TabsTrigger>
          <TabsTrigger value="mastered">
            Mastered ({masteredCards.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <CardList cards={cards} deckId={deck.id} />
        </TabsContent>

        <TabsContent value="due">
          <CardList cards={dueCards} deckId={deck.id} />
        </TabsContent>

        <TabsContent value="mastered">
          <CardList cards={masteredCards} deckId={deck.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
