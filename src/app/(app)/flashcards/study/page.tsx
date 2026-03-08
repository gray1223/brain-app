"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  RotateCcw,
  Check,
  GraduationCap,
  Keyboard,
  Shuffle,
  SortAsc,
  FlipHorizontal,
  PenLine,
  Layers,
  Loader2,
  Send,
  Settings2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Flashcard } from "@/types/database";

// --- SM-2 Algorithm ---

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

function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// --- Types ---

type StudyMode = "flip" | "type";
type QuestionSide = "front" | "back";
type CardOrder = "due" | "random";

interface StudyConfig {
  mode: StudyMode;
  questionSide: QuestionSide;
  cardOrder: CardOrder;
}

interface SessionStats {
  ratings: number[];
  easeFactors: number[];
}

interface GradeResult {
  score: number;
  feedback: string;
}

// --- Config Screen ---

function StudyConfigScreen({
  cardCount,
  deckName,
  onStart,
  backLink,
  isPractice,
}: {
  cardCount: number;
  deckName: string | null;
  onStart: (config: StudyConfig) => void;
  backLink: string;
  isPractice: boolean;
}) {
  const [mode, setMode] = useState<StudyMode>("type");
  const [questionSide, setQuestionSide] = useState<QuestionSide>("front");
  const [cardOrder, setCardOrder] = useState<CardOrder>("random");

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" render={<Link href={backLink} />}>
          <ArrowLeft data-icon="inline-start" />
          Back
        </Button>
      </div>

      <div className="text-center space-y-2">
        <GraduationCap className="mx-auto size-10 text-primary" />
        <h1 className="text-2xl font-semibold tracking-tight">Study Session</h1>
        {deckName && (
          <p className="text-sm text-muted-foreground">{deckName}</p>
        )}
        <p className="text-sm text-muted-foreground">
          {cardCount} card{cardCount !== 1 ? "s" : ""}{" "}
          {isPractice ? "available to practice" : "due for review"}
        </p>
      </div>

      <Card className="p-5 space-y-5">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Settings2 className="size-4" />
          Session Settings
        </div>

        {/* Study Mode */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Study Mode
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setMode("flip")}
              className={`flex items-center gap-2.5 rounded-lg border p-3 text-left text-sm transition-colors ${
                mode === "flip"
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-input hover:bg-muted/50"
              }`}
            >
              <FlipHorizontal className="size-4 shrink-0" />
              <div>
                <p className="font-medium">Flip Cards</p>
                <p className="text-[11px] text-muted-foreground">
                  Reveal answer, then self-rate
                </p>
              </div>
            </button>
            <button
              onClick={() => setMode("type")}
              className={`flex items-center gap-2.5 rounded-lg border p-3 text-left text-sm transition-colors ${
                mode === "type"
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-input hover:bg-muted/50"
              }`}
            >
              <PenLine className="size-4 shrink-0" />
              <div>
                <p className="font-medium">Type Answer</p>
                <p className="text-[11px] text-muted-foreground">
                  Type your answer, AI grades it
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* Question Side */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Question Side
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setQuestionSide("front")}
              className={`flex items-center gap-2.5 rounded-lg border p-3 text-left text-sm transition-colors ${
                questionSide === "front"
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-input hover:bg-muted/50"
              }`}
            >
              <Layers className="size-4 shrink-0" />
              <div>
                <p className="font-medium">Term First</p>
                <p className="text-[11px] text-muted-foreground">
                  Show question, recall answer
                </p>
              </div>
            </button>
            <button
              onClick={() => setQuestionSide("back")}
              className={`flex items-center gap-2.5 rounded-lg border p-3 text-left text-sm transition-colors ${
                questionSide === "back"
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-input hover:bg-muted/50"
              }`}
            >
              <Layers className="size-4 shrink-0 rotate-180" />
              <div>
                <p className="font-medium">Definition First</p>
                <p className="text-[11px] text-muted-foreground">
                  Show answer, recall question
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* Card Order */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Card Order
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setCardOrder("due")}
              className={`flex items-center gap-2.5 rounded-lg border p-3 text-left text-sm transition-colors ${
                cardOrder === "due"
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-input hover:bg-muted/50"
              }`}
            >
              <SortAsc className="size-4 shrink-0" />
              <div>
                <p className="font-medium">By Due Date</p>
                <p className="text-[11px] text-muted-foreground">
                  Most overdue first
                </p>
              </div>
            </button>
            <button
              onClick={() => setCardOrder("random")}
              className={`flex items-center gap-2.5 rounded-lg border p-3 text-left text-sm transition-colors ${
                cardOrder === "random"
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-input hover:bg-muted/50"
              }`}
            >
              <Shuffle className="size-4 shrink-0" />
              <div>
                <p className="font-medium">Shuffled</p>
                <p className="text-[11px] text-muted-foreground">
                  Random order
                </p>
              </div>
            </button>
          </div>
        </div>
      </Card>

      <div className="space-y-2">
        <Button
          className="w-full"
          size="lg"
          onClick={() => onStart({ mode, questionSide, cardOrder })}
        >
          <GraduationCap className="size-4" data-icon="inline-start" />
          Start Studying
        </Button>
        <p className="text-center text-[11px] text-muted-foreground">
          {mode === "type"
            ? "You'll type your answer and AI will grade it"
            : "You'll flip cards and rate yourself"}
        </p>
      </div>
    </div>
  );
}

// --- Main Component ---

export default function StudyPage() {
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [done, setDone] = useState(false);
  const [deckName, setDeckName] = useState<string | null>(null);
  const [config, setConfig] = useState<StudyConfig | null>(null);
  const [stats, setStats] = useState<SessionStats>({
    ratings: [],
    easeFactors: [],
  });

  // Type-answer mode state
  const [typedAnswer, setTypedAnswer] = useState("");
  const [grading, setGrading] = useState(false);
  const [gradeResult, setGradeResult] = useState<GradeResult | null>(null);

  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const deckId = searchParams.get("deck");

  const mode = searchParams.get("mode"); // "all" = practice all cards, default = due only

  const fetchCards = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const today = new Date().toISOString().split("T")[0];

    let query = supabase
      .from("flashcards")
      .select("*");

    // Only filter by due date if not in "practice all" mode
    if (mode !== "all") {
      query = query.lte("next_review", today);
    }

    query = query.order("next_review", { ascending: true });

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
  }, [supabase, deckId, mode]);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  // Get question/answer text based on config
  function getQuestion(card: Flashcard): string {
    if (!config) return card.front;
    return config.questionSide === "front" ? card.front : card.back;
  }

  function getAnswer(card: Flashcard): string {
    if (!config) return card.back;
    return config.questionSide === "front" ? card.back : card.front;
  }

  function getQuestionLabel(): string {
    if (!config) return "Question";
    return config.questionSide === "front" ? "Question" : "Definition";
  }

  function getAnswerLabel(): string {
    if (!config) return "Answer";
    return config.questionSide === "front" ? "Answer" : "Term";
  }

  const handleRateRef = useRef(handleRate);
  handleRateRef.current = handleRate;

  // Keyboard shortcuts (flip mode only)
  useEffect(() => {
    if (!config || config.mode !== "flip") return;

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
  }, [flipped, done, loading, cards.length, config]);

  async function handleRate(quality: number) {
    const card = cards[currentIndex];
    if (!card) return;

    const updates = calculateSM2(card, quality);

    try {
      const res = await fetch("/api/flashcards/rate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cardId: card.id,
          ease_factor: updates.ease_factor,
          interval_days: updates.interval_days,
          next_review: updates.next_review,
          review_count: card.review_count + 1,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        console.error("Failed to update card:", err);
        toast.error("Failed to save progress");
      }
    } catch (err) {
      console.error("Network error updating card:", err);
      toast.error("Failed to save progress");
    }

    // Update local card state so subsequent reviews chain correctly
    setCards((prev) =>
      prev.map((c) =>
        c.id === card.id
          ? {
              ...c,
              ease_factor: updates.ease_factor,
              interval_days: updates.interval_days,
              next_review: updates.next_review,
              review_count: c.review_count + 1,
            }
          : c
      )
    );

    setStats((prev) => ({
      ratings: [...prev.ratings, quality],
      easeFactors: [...prev.easeFactors, updates.ease_factor],
    }));

    const newReviewedCount = reviewedCount + 1;
    setReviewedCount(newReviewedCount);
    setFlipped(false);
    setTypedAnswer("");
    setGradeResult(null);

    if (currentIndex + 1 >= cards.length) {
      setDone(true);
      toast.success("Review session complete!");
    } else {
      setCurrentIndex(currentIndex + 1);
    }
  }

  async function handleGradeAnswer() {
    const card = cards[currentIndex];
    if (!card || !typedAnswer.trim()) return;

    setGrading(true);
    try {
      const res = await fetch("/api/flashcards/grade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: getQuestion(card),
          correctAnswer: getAnswer(card),
          userAnswer: typedAnswer.trim(),
        }),
      });

      if (!res.ok) throw new Error("Failed to grade");

      const result = (await res.json()) as GradeResult;
      setGradeResult(result);
      setFlipped(true);
    } catch {
      toast.error("Failed to grade answer. Please rate manually.");
      setFlipped(true);
    } finally {
      setGrading(false);
    }
  }

  function handleStartSession(cfg: StudyConfig) {
    let orderedCards = [...cards];
    if (cfg.cardOrder === "random") {
      orderedCards = shuffleArray(orderedCards);
    }
    setCards(orderedCards);
    setConfig(cfg);
  }

  const backLink = deckId ? `/flashcards/${deckId}` : "/flashcards";

  // --- Loading ---
  if (loading) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight">Study</h1>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading cards...
        </div>
      </div>
    );
  }

  // --- No Cards ---
  if (cards.length === 0) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <Button variant="ghost" size="sm" render={<Link href={backLink} />}>
          <ArrowLeft data-icon="inline-start" />
          Back
        </Button>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <GraduationCap className="mb-4 size-12 text-muted-foreground/50" />
          <h3 className="text-lg font-medium">All caught up!</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            No cards are due for review right now. Check back later.
          </p>
          <Button
            variant="outline"
            className="mt-6"
            render={<Link href={backLink} />}
          >
            Back to {deckName || "Decks"}
          </Button>
        </div>
      </div>
    );
  }

  // --- Config Screen ---
  if (!config) {
    return (
      <StudyConfigScreen
        cardCount={cards.length}
        deckName={deckName}
        onStart={handleStartSession}
        backLink={backLink}
        isPractice={mode === "all"}
      />
    );
  }

  // --- Session Complete ---
  if (done) {
    const avgEase =
      stats.easeFactors.length > 0
        ? stats.easeFactors.reduce((a, b) => a + b, 0) /
          stats.easeFactors.length
        : 0;

    const ratingCounts = [0, 0, 0, 0];
    stats.ratings.forEach((r) => ratingCounts[r]++);

    const accuracy =
      stats.ratings.length > 0
        ? Math.round(
            (stats.ratings.filter((r) => r >= 2).length /
              stats.ratings.length) *
              100
          )
        : 0;

    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <Button variant="ghost" size="sm" render={<Link href={backLink} />}>
          <ArrowLeft data-icon="inline-start" />
          Back
        </Button>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
            <Check className="size-8 text-green-600 dark:text-green-400" />
          </div>
          <h3 className="text-xl font-semibold">Session Complete!</h3>
          {deckName && (
            <p className="mt-1 text-sm text-muted-foreground">{deckName}</p>
          )}
          <p className="mt-2 text-sm text-muted-foreground">
            You reviewed {reviewedCount} card
            {reviewedCount !== 1 ? "s" : ""}.
          </p>

          <Card className="mt-6 w-full max-w-sm p-5 text-left">
            <h4 className="text-sm font-semibold mb-4">Session Summary</h4>
            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cards Reviewed</span>
                <span className="font-medium">{reviewedCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Accuracy</span>
                <span className="font-medium">{accuracy}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Avg. Ease Factor</span>
                <span className="font-medium">{avgEase.toFixed(2)}</span>
              </div>
              <div className="border-t pt-3 mt-3 grid grid-cols-4 gap-2 text-center">
                <div>
                  <p className="text-lg font-semibold text-red-600 dark:text-red-400">
                    {ratingCounts[0]}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Again</p>
                </div>
                <div>
                  <p className="text-lg font-semibold text-orange-600 dark:text-orange-400">
                    {ratingCounts[1]}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Hard</p>
                </div>
                <div>
                  <p className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                    {ratingCounts[2]}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Good</p>
                </div>
                <div>
                  <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                    {ratingCounts[3]}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Easy</p>
                </div>
              </div>
            </div>
          </Card>

          <Button
            className="mt-6"
            onClick={() => {
              router.push(backLink);
              router.refresh();
            }}
          >
            Back to {deckName || "Decks"}
          </Button>
        </div>
      </div>
    );
  }

  // --- Active Study Session ---

  const currentCard = cards[currentIndex];
  const progressPercent = ((currentIndex) / cards.length) * 100;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
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
        <div className="flex items-center gap-2">
          <Badge variant="secondary">
            {config.mode === "flip" ? "Flip" : "Type"}
          </Badge>
          <Badge variant="secondary">
            {currentIndex + 1} / {cards.length}
          </Badge>
        </div>
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

      {/* Card Display */}
      {config.mode === "flip" ? (
        <>
          {/* Flip Mode Card */}
          <div
            className="cursor-pointer"
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
                className="flex min-h-[280px] items-center justify-center p-8 text-center"
                style={{ backfaceVisibility: "hidden" }}
              >
                <div className="space-y-4 max-w-md">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    {getQuestionLabel()}
                  </p>
                  <p className="text-lg font-medium leading-relaxed whitespace-pre-wrap">
                    {getQuestion(currentCard)}
                  </p>
                  {!flipped && (
                    <p className="text-xs text-muted-foreground/60 pt-2">
                      Click or press Space to reveal
                    </p>
                  )}
                </div>
              </Card>

              {/* Back */}
              <Card
                className="absolute inset-0 flex min-h-[280px] items-center justify-center p-8 text-center"
                style={{
                  backfaceVisibility: "hidden",
                  transform: "rotateY(180deg)",
                }}
              >
                <div className="space-y-4 max-w-md">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    {getAnswerLabel()}
                  </p>
                  <p className="text-lg font-medium leading-relaxed whitespace-pre-wrap">
                    {getAnswer(currentCard)}
                  </p>
                </div>
              </Card>
            </div>
          </div>

          {/* Rating Buttons */}
          {flipped ? (
            <div className="space-y-3">
              <p className="text-center text-xs font-medium text-muted-foreground">
                How well did you know this?
              </p>
              <div className="grid grid-cols-4 gap-3">
                <button
                  className="flex flex-col items-center justify-center gap-1.5 rounded-lg border border-input bg-background px-3 py-4 text-red-600 shadow-sm transition-colors hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950"
                  onClick={() => handleRate(0)}
                >
                  <RotateCcw className="size-4" />
                  <span className="text-xs font-medium">Again</span>
                  <span className="text-[10px] text-muted-foreground">1</span>
                </button>
                <button
                  className="flex flex-col items-center justify-center gap-1.5 rounded-lg border border-input bg-background px-3 py-4 text-orange-600 shadow-sm transition-colors hover:bg-orange-50 hover:text-orange-700 dark:text-orange-400 dark:hover:bg-orange-950"
                  onClick={() => handleRate(1)}
                >
                  <span className="text-sm font-medium">Hard</span>
                  <span className="text-[10px] text-muted-foreground">2</span>
                </button>
                <button
                  className="flex flex-col items-center justify-center gap-1.5 rounded-lg border border-input bg-background px-3 py-4 text-blue-600 shadow-sm transition-colors hover:bg-blue-50 hover:text-blue-700 dark:text-blue-400 dark:hover:bg-blue-950"
                  onClick={() => handleRate(2)}
                >
                  <span className="text-sm font-medium">Good</span>
                  <span className="text-[10px] text-muted-foreground">3</span>
                </button>
                <button
                  className="flex flex-col items-center justify-center gap-1.5 rounded-lg border border-input bg-background px-3 py-4 text-green-600 shadow-sm transition-colors hover:bg-green-50 hover:text-green-700 dark:text-green-400 dark:hover:bg-green-950"
                  onClick={() => handleRate(3)}
                >
                  <span className="text-sm font-medium">Easy</span>
                  <span className="text-[10px] text-muted-foreground">4</span>
                </button>
              </div>
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
        </>
      ) : (
        <>
          {/* Type Answer Mode */}
          <Card className="flex min-h-[200px] items-center justify-center p-8 text-center">
            <div className="space-y-4 max-w-md">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                {getQuestionLabel()}
              </p>
              <p className="text-lg font-medium leading-relaxed whitespace-pre-wrap">
                {getQuestion(currentCard)}
              </p>
            </div>
          </Card>

          {!flipped ? (
            <div className="space-y-3">
              <Textarea
                value={typedAnswer}
                onChange={(e) => setTypedAnswer(e.target.value)}
                placeholder="Type your answer..."
                rows={3}
                className="resize-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    if (typedAnswer.trim()) handleGradeAnswer();
                  }
                }}
                autoFocus
              />
              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  onClick={handleGradeAnswer}
                  disabled={!typedAnswer.trim() || grading}
                >
                  {grading ? (
                    <>
                      <Loader2
                        className="size-4 animate-spin"
                        data-icon="inline-start"
                      />
                      Grading...
                    </>
                  ) : (
                    <>
                      <Send className="size-4" data-icon="inline-start" />
                      Submit Answer
                    </>
                  )}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setFlipped(true);
                    setGradeResult(null);
                  }}
                >
                  Skip
                </Button>
              </div>
              <p className="text-center text-[10px] text-muted-foreground">
                Ctrl+Enter to submit
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Show correct answer */}
              <Card className="p-4 space-y-3 border-primary/20 bg-primary/5">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Correct {getAnswerLabel()}
                </p>
                <p className="text-sm font-medium whitespace-pre-wrap">
                  {getAnswer(currentCard)}
                </p>
              </Card>

              {/* Show user's answer and AI grade */}
              {typedAnswer.trim() && (
                <Card className="p-4 space-y-3">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Your Answer
                  </p>
                  <p className="text-sm whitespace-pre-wrap">{typedAnswer}</p>
                </Card>
              )}

              {gradeResult && (
                <Card
                  className={`p-4 space-y-2.5 ${
                    gradeResult.score >= 2
                      ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30"
                      : gradeResult.score === 1
                        ? "border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/30"
                        : "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-flex h-5 items-center rounded-full px-2 text-xs font-semibold text-white"
                      style={{
                        backgroundColor:
                          gradeResult.score >= 2
                            ? "#16a34a"
                            : gradeResult.score === 1
                              ? "#ea580c"
                              : "#dc2626",
                      }}
                    >
                      {gradeResult.score === 3
                        ? "Correct"
                        : gradeResult.score === 2
                          ? "Mostly Correct"
                          : gradeResult.score === 1
                            ? "Partially Correct"
                            : "Incorrect"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Score: {gradeResult.score}/3
                    </span>
                  </div>
                  <p className="text-sm">
                    {gradeResult.feedback}
                  </p>
                </Card>
              )}

              {/* Rate buttons */}
              <div className="space-y-2">
                <p className="text-center text-xs font-medium text-muted-foreground">
                  {gradeResult
                    ? "Confirm your rating or adjust:"
                    : "How well did you know this?"}
                </p>
                <div className="grid grid-cols-4 gap-3">
                  <button
                    className={`flex flex-col items-center justify-center gap-1.5 rounded-lg border px-3 py-4 shadow-sm transition-colors ${
                      gradeResult?.score === 0
                        ? "border-red-300 bg-red-50 text-red-700 dark:border-red-700 dark:bg-red-950 dark:text-red-400"
                        : "border-input bg-background text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950"
                    }`}
                    onClick={() => handleRate(0)}
                  >
                    <RotateCcw className="size-4" />
                    <span className="text-xs font-medium">Again</span>
                  </button>
                  <button
                    className={`flex flex-col items-center justify-center gap-1.5 rounded-lg border px-3 py-4 shadow-sm transition-colors ${
                      gradeResult?.score === 1
                        ? "border-orange-300 bg-orange-50 text-orange-700 dark:border-orange-700 dark:bg-orange-950 dark:text-orange-400"
                        : "border-input bg-background text-orange-600 hover:bg-orange-50 hover:text-orange-700 dark:text-orange-400 dark:hover:bg-orange-950"
                    }`}
                    onClick={() => handleRate(1)}
                  >
                    <span className="text-sm font-medium">Hard</span>
                  </button>
                  <button
                    className={`flex flex-col items-center justify-center gap-1.5 rounded-lg border px-3 py-4 shadow-sm transition-colors ${
                      gradeResult?.score === 2
                        ? "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-950 dark:text-blue-400"
                        : "border-input bg-background text-blue-600 hover:bg-blue-50 hover:text-blue-700 dark:text-blue-400 dark:hover:bg-blue-950"
                    }`}
                    onClick={() => handleRate(2)}
                  >
                    <span className="text-sm font-medium">Good</span>
                  </button>
                  <button
                    className={`flex flex-col items-center justify-center gap-1.5 rounded-lg border px-3 py-4 shadow-sm transition-colors ${
                      gradeResult?.score === 3
                        ? "border-green-300 bg-green-50 text-green-700 dark:border-green-700 dark:bg-green-950 dark:text-green-400"
                        : "border-input bg-background text-green-600 hover:bg-green-50 hover:text-green-700 dark:text-green-400 dark:hover:bg-green-950"
                    }`}
                    onClick={() => handleRate(3)}
                  >
                    <span className="text-sm font-medium">Easy</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
