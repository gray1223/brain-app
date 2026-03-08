"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, RotateCcw, Check, GraduationCap } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import type { Flashcard } from "@/types/database";

function calculateSM2(
  card: Flashcard,
  quality: number // 0 = Again, 1 = Hard, 2 = Good, 3 = Easy
): { ease_factor: number; interval_days: number; next_review: string } {
  let { ease_factor, interval_days } = card;

  if (quality === 0) {
    // Again: reset
    interval_days = 0;
    ease_factor = Math.max(1.3, ease_factor - 0.2);
  } else if (quality === 1) {
    // Hard
    interval_days = Math.max(1, Math.ceil(interval_days * 1.2));
    ease_factor = Math.max(1.3, ease_factor - 0.15);
  } else if (quality === 2) {
    // Good
    if (interval_days === 0) {
      interval_days = 1;
    } else if (interval_days === 1) {
      interval_days = 6;
    } else {
      interval_days = Math.ceil(interval_days * ease_factor);
    }
  } else {
    // Easy
    if (interval_days === 0) {
      interval_days = 4;
    } else {
      interval_days = Math.ceil(interval_days * ease_factor * 1.3);
    }
    ease_factor = ease_factor + 0.15;
  }

  const next = new Date();
  next.setDate(next.getDate() + interval_days);
  const next_review = next.toISOString().split("T")[0];

  return { ease_factor, interval_days, next_review };
}

export default function StudyPage() {
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [done, setDone] = useState(false);
  const supabase = createClient();

  const fetchDueCards = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const today = new Date().toISOString().split("T")[0];

    const { data } = await supabase
      .from("flashcards")
      .select("*")
      .lte("next_review", today)
      .order("next_review", { ascending: true });

    setCards((data as Flashcard[]) ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchDueCards();
  }, [fetchDueCards]);

  async function handleRate(quality: number) {
    const card = cards[currentIndex];
    if (!card) return;

    const updates = calculateSM2(card, quality);

    await supabase
      .from("flashcards")
      .update({
        ease_factor: updates.ease_factor,
        interval_days: updates.interval_days,
        next_review: updates.next_review,
        review_count: card.review_count + 1,
      })
      .eq("id", card.id);

    const newReviewedCount = reviewedCount + 1;
    setReviewedCount(newReviewedCount);
    setRevealed(false);

    if (currentIndex + 1 >= cards.length) {
      setDone(true);
      toast.success("Review session complete!");
    } else {
      setCurrentIndex(currentIndex + 1);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight">Study</h1>
        <p className="text-sm text-muted-foreground">Loading cards...</p>
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <Button variant="ghost" size="sm" render={<Link href="/flashcards" />}>
          <ArrowLeft data-icon="inline-start" />
          Back to Flashcards
        </Button>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <GraduationCap className="mb-4 size-12 text-muted-foreground/50" />
          <h3 className="text-sm font-medium">No cards due for review</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            All caught up! Check back later.
          </p>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <Button variant="ghost" size="sm" render={<Link href="/flashcards" />}>
          <ArrowLeft data-icon="inline-start" />
          Back to Flashcards
        </Button>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Check className="mb-4 size-12 text-green-500" />
          <h3 className="text-lg font-semibold">Session Complete!</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            You reviewed {reviewedCount} card{reviewedCount !== 1 ? "s" : ""}.
          </p>
          <Button
            className="mt-6"
            render={<Link href="/flashcards" />}
          >
            Back to Decks
          </Button>
        </div>
      </div>
    );
  }

  const currentCard = cards[currentIndex];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" render={<Link href="/flashcards" />}>
          <ArrowLeft data-icon="inline-start" />
          Back
        </Button>
        <Badge variant="secondary">
          {currentIndex + 1} of {cards.length}
        </Badge>
      </div>

      <Card
        className="flex min-h-[300px] cursor-pointer items-center justify-center p-8 text-center"
        onClick={() => !revealed && setRevealed(true)}
      >
        <div className="space-y-4">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {revealed ? "Answer" : "Question"}
          </p>
          <p className="text-lg font-medium whitespace-pre-wrap">
            {revealed ? currentCard.back : currentCard.front}
          </p>
          {!revealed && (
            <p className="text-xs text-muted-foreground">
              Click to reveal answer
            </p>
          )}
        </div>
      </Card>

      {revealed ? (
        <div className="grid grid-cols-4 gap-2">
          <Button
            variant="outline"
            className="flex flex-col gap-0.5 py-3 text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950"
            onClick={() => handleRate(0)}
          >
            <RotateCcw className="size-4" />
            <span className="text-xs">Again</span>
          </Button>
          <Button
            variant="outline"
            className="flex flex-col gap-0.5 py-3 text-orange-600 hover:bg-orange-50 hover:text-orange-700 dark:text-orange-400 dark:hover:bg-orange-950"
            onClick={() => handleRate(1)}
          >
            <span className="text-sm font-medium">Hard</span>
          </Button>
          <Button
            variant="outline"
            className="flex flex-col gap-0.5 py-3 text-blue-600 hover:bg-blue-50 hover:text-blue-700 dark:text-blue-400 dark:hover:bg-blue-950"
            onClick={() => handleRate(2)}
          >
            <span className="text-sm font-medium">Good</span>
          </Button>
          <Button
            variant="outline"
            className="flex flex-col gap-0.5 py-3 text-green-600 hover:bg-green-50 hover:text-green-700 dark:text-green-400 dark:hover:bg-green-950"
            onClick={() => handleRate(3)}
          >
            <span className="text-sm font-medium">Easy</span>
          </Button>
        </div>
      ) : (
        <Button className="w-full" onClick={() => setRevealed(true)}>
          Show Answer
        </Button>
      )}

      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-primary transition-all"
          style={{
            width: `${((currentIndex) / cards.length) * 100}%`,
          }}
        />
      </div>
    </div>
  );
}
