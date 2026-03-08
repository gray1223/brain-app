"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  RotateCcw,
  Check,
  GraduationCap,
  Keyboard,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { format, addDays } from "date-fns";
import type { Flashcard } from "@/types/database";

function calculateSM2(
  card: Flashcard,
  quality: number
): { ease_factor: number; interval_days: number; next_review: string } {
  let { ease_factor, interval_days } = card;

  if (quality === 0) {
    interval_days = 0;
    ease_factor = Math.max(1.3, ease_factor - 0.2);
  } else if (quality === 1) {
    interval_days = Math.max(1, Math.ceil(interval_days * 1.2));
    ease_factor = Math.max(1.3, ease_factor - 0.15);
  } else if (quality === 2) {
    if (interval_days === 0) {
      interval_days = 1;
    } else if (interval_days === 1) {
      interval_days = 6;
    } else {
      interval_days = Math.ceil(interval_days * ease_factor);
    }
  } else {
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

interface SessionStats {
  ratings: number[];
  easeFactors: number[];
}

export default function StudyPage() {
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [done, setDone] = useState(false);
  const [deckName, setDeckName] = useState<string | null>(null);
  const [lastNextReview, setLastNextReview] = useState<string | null>(null);
  const [stats, setStats] = useState<SessionStats>({
    ratings: [],
    easeFactors: [],
  });
  const supabase = createClient();
  const searchParams = useSearchParams();
  const deckId = searchParams.get("deck");

  const fetchDueCards = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const today = new Date().toISOString().split("T")[0];

    let query = supabase
      .from("flashcards")
      .select("*")
      .lte("next_review", today)
      .order("next_review", { ascending: true });

    if (deckId) {
      query = query.eq("deck_id", deckId);

      const { data: deckData } = await supabase
        .from("flashcard_decks")
        .select("name")
        .eq("id", deckId)
        .single();

      if (deckData) {
        setDeckName(deckData.name);
      }
    }

    const { data } = await query;
    setCards((data as Flashcard[]) ?? []);
    setLoading(false);
  }, [supabase, deckId]);

  useEffect(() => {
    fetchDueCards();
  }, [fetchDueCards]);

  const handleRateRef = useRef(handleRate);
  handleRateRef.current = handleRate;

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (done || loading || cards.length === 0) return;

      if (e.code === "Space") {
        e.preventDefault();
        if (!flipped) {
          setFlipped(true);
        }
      }

      if (flipped) {
        if (e.key === "1") handleRateRef.current(0);
        if (e.key === "2") handleRateRef.current(1);
        if (e.key === "3") handleRateRef.current(2);
        if (e.key === "4") handleRateRef.current(3);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [flipped, done, loading, cards.length]);

  async function handleRate(quality: number) {
    const card = cards[currentIndex];
    if (!card) return;

    const updates = calculateSM2(card, quality);
    setLastNextReview(updates.next_review);

    await supabase
      .from("flashcards")
      .update({
        ease_factor: updates.ease_factor,
        interval_days: updates.interval_days,
        next_review: updates.next_review,
        review_count: card.review_count + 1,
      })
      .eq("id", card.id);

    setStats((prev) => ({
      ratings: [...prev.ratings, quality],
      easeFactors: [...prev.easeFactors, updates.ease_factor],
    }));

    const newReviewedCount = reviewedCount + 1;
    setReviewedCount(newReviewedCount);
    setFlipped(false);
    setLastNextReview(null);

    if (currentIndex + 1 >= cards.length) {
      setDone(true);
      toast.success("Review session complete!");
    } else {
      setCurrentIndex(currentIndex + 1);
    }
  }

  const backLink = deckId ? `/flashcards/${deckId}` : "/flashcards";

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
        <Button variant="ghost" size="sm" render={<Link href={backLink} />}>
          <ArrowLeft data-icon="inline-start" />
          Back
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
    const avgEase =
      stats.easeFactors.length > 0
        ? stats.easeFactors.reduce((a, b) => a + b, 0) /
          stats.easeFactors.length
        : 0;

    const ratingCounts = [0, 0, 0, 0];
    stats.ratings.forEach((r) => ratingCounts[r]++);

    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <Button variant="ghost" size="sm" render={<Link href={backLink} />}>
          <ArrowLeft data-icon="inline-start" />
          Back
        </Button>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Check className="mb-4 size-12 text-green-500" />
          <h3 className="text-lg font-semibold">Session Complete!</h3>
          {deckName && (
            <p className="mt-1 text-sm text-muted-foreground">{deckName}</p>
          )}
          <p className="mt-2 text-sm text-muted-foreground">
            You reviewed {reviewedCount} card
            {reviewedCount !== 1 ? "s" : ""}.
          </p>

          {/* Session stats */}
          <Card className="mt-6 w-full max-w-sm p-4 text-left">
            <h4 className="text-sm font-medium mb-3">Session Summary</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cards Reviewed</span>
                <span className="font-medium">{reviewedCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Average Ease</span>
                <span className="font-medium">{avgEase.toFixed(2)}</span>
              </div>
              <div className="border-t pt-2 mt-2 space-y-1">
                <div className="flex justify-between">
                  <span className="text-red-600 dark:text-red-400">
                    Again
                  </span>
                  <span>{ratingCounts[0]}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-orange-600 dark:text-orange-400">
                    Hard
                  </span>
                  <span>{ratingCounts[1]}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-600 dark:text-blue-400">
                    Good
                  </span>
                  <span>{ratingCounts[2]}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-600 dark:text-green-400">
                    Easy
                  </span>
                  <span>{ratingCounts[3]}</span>
                </div>
              </div>
            </div>
          </Card>

          <Button className="mt-6" render={<Link href={backLink} />}>
            Back to {deckName || "Decks"}
          </Button>
        </div>
      </div>
    );
  }

  const currentCard = cards[currentIndex];
  const progressPercent = (currentIndex / cards.length) * 100;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" render={<Link href={backLink} />}>
            <ArrowLeft data-icon="inline-start" />
            Back
          </Button>
          {deckName && (
            <span className="text-sm text-muted-foreground">{deckName}</span>
          )}
        </div>
        <Badge variant="secondary">
          {currentIndex + 1} of {cards.length}
        </Badge>
      </div>

      {/* Progress bar */}
      <div className="space-y-1">
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <p className="text-[10px] text-muted-foreground text-right">
          {currentIndex} reviewed / {cards.length} total
        </p>
      </div>

      {/* Flashcard with flip animation */}
      <div
        className="perspective-1000 cursor-pointer"
        style={{ perspective: "1000px" }}
        onClick={() => !flipped && setFlipped(true)}
      >
        <div
          className="relative transition-transform duration-500"
          style={{
            transformStyle: "preserve-3d",
            transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
          }}
        >
          {/* Front */}
          <Card
            className="flex min-h-[300px] items-center justify-center p-8 text-center"
            style={{ backfaceVisibility: "hidden" }}
          >
            <div className="space-y-4">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Question
              </p>
              <p className="text-lg font-medium whitespace-pre-wrap">
                {currentCard.front}
              </p>
              {!flipped && (
                <p className="text-xs text-muted-foreground">
                  Click or press Space to reveal
                </p>
              )}
            </div>
          </Card>

          {/* Back */}
          <Card
            className="absolute inset-0 flex min-h-[300px] items-center justify-center p-8 text-center"
            style={{
              backfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
            }}
          >
            <div className="space-y-4">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Answer
              </p>
              <p className="text-lg font-medium whitespace-pre-wrap">
                {currentCard.back}
              </p>
            </div>
          </Card>
        </div>
      </div>

      {/* Rating buttons */}
      {flipped ? (
        <div className="space-y-3">
          <div className="grid grid-cols-4 gap-3">
            <button
              className="flex flex-col items-center justify-center gap-1 rounded-lg border border-input bg-background px-3 py-4 text-red-600 shadow-sm transition-colors hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950"
              onClick={() => handleRate(0)}
            >
              <RotateCcw className="size-4" />
              <span className="text-xs font-medium">Again</span>
              <span className="text-[10px] text-muted-foreground">1</span>
            </button>
            <button
              className="flex flex-col items-center justify-center gap-1 rounded-lg border border-input bg-background px-3 py-4 text-orange-600 shadow-sm transition-colors hover:bg-orange-50 hover:text-orange-700 dark:text-orange-400 dark:hover:bg-orange-950"
              onClick={() => handleRate(1)}
            >
              <span className="text-sm font-medium">Hard</span>
              <span className="text-[10px] text-muted-foreground">2</span>
            </button>
            <button
              className="flex flex-col items-center justify-center gap-1 rounded-lg border border-input bg-background px-3 py-4 text-blue-600 shadow-sm transition-colors hover:bg-blue-50 hover:text-blue-700 dark:text-blue-400 dark:hover:bg-blue-950"
              onClick={() => handleRate(2)}
            >
              <span className="text-sm font-medium">Good</span>
              <span className="text-[10px] text-muted-foreground">3</span>
            </button>
            <button
              className="flex flex-col items-center justify-center gap-1 rounded-lg border border-input bg-background px-3 py-4 text-green-600 shadow-sm transition-colors hover:bg-green-50 hover:text-green-700 dark:text-green-400 dark:hover:bg-green-950"
              onClick={() => handleRate(3)}
            >
              <span className="text-sm font-medium">Easy</span>
              <span className="text-[10px] text-muted-foreground">4</span>
            </button>
          </div>

          {lastNextReview && (
            <p className="text-center text-xs text-muted-foreground">
              Next review: {format(new Date(lastNextReview), "MMM d, yyyy")}
            </p>
          )}

          <div className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground">
            <Keyboard className="size-3" />
            <span>Space: flip | 1-4: rate</span>
          </div>
        </div>
      ) : (
        <Button className="w-full" onClick={() => setFlipped(true)}>
          Show Answer
        </Button>
      )}
    </div>
  );
}
