"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  ChevronDown,
  ChevronUp,
  Pencil,
  Trash2,
  Check,
  X,
  ArrowUpDown,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import type { Flashcard } from "@/types/database";

type SortKey = "due" | "newest" | "difficulty";

function getMasteryColor(card: Flashcard) {
  if (card.interval_days === 0 || card.review_count === 0) {
    return "bg-red-500";
  }
  if (card.interval_days > 21) {
    return "bg-green-500";
  }
  return "bg-yellow-500";
}

function getMasteryLabel(card: Flashcard) {
  if (card.interval_days === 0 || card.review_count === 0) {
    return "New";
  }
  if (card.interval_days > 21) {
    return "Mastered";
  }
  return "Learning";
}

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "due", label: "Due Date" },
  { key: "newest", label: "Newest First" },
  { key: "difficulty", label: "Difficulty" },
];

export function CardList({
  cards: initialCards,
  deckId,
}: {
  cards: Flashcard[];
  deckId: string;
}) {
  const [cards, setCards] = useState(initialCards);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFront, setEditFront] = useState("");
  const [editBack, setEditBack] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("due");
  const router = useRouter();
  const supabase = createClient();

  const sortedCards = [...cards].sort((a, b) => {
    if (sortKey === "due") {
      return a.next_review.localeCompare(b.next_review);
    }
    if (sortKey === "newest") {
      return b.created_at.localeCompare(a.created_at);
    }
    return b.ease_factor - a.ease_factor;
  });

  function startEdit(card: Flashcard) {
    setEditingId(card.id);
    setEditFront(card.front);
    setEditBack(card.back);
  }

  async function saveEdit(cardId: string) {
    if (!editFront.trim() || !editBack.trim()) return;

    const { error } = await supabase
      .from("flashcards")
      .update({ front: editFront.trim(), back: editBack.trim() })
      .eq("id", cardId);

    if (error) {
      toast.error("Failed to update card");
      return;
    }

    setCards((prev) =>
      prev.map((c) =>
        c.id === cardId
          ? { ...c, front: editFront.trim(), back: editBack.trim() }
          : c
      )
    );
    setEditingId(null);
    toast.success("Card updated");
    router.refresh();
  }

  async function deleteCard(cardId: string) {
    const { error } = await supabase
      .from("flashcards")
      .delete()
      .eq("id", cardId);

    if (error) {
      toast.error("Failed to delete card");
      return;
    }

    setCards((prev) => prev.filter((c) => c.id !== cardId));
    toast.success("Card deleted");
    router.refresh();
  }

  function formatInterval(days: number): string {
    if (days === 0) return "New";
    if (days === 1) return "1 day interval";
    if (days < 30) return `${days} day interval`;
    if (days < 365) {
      const months = Math.round(days / 30);
      return `${months} month${months !== 1 ? "s" : ""} interval`;
    }
    const years = Math.round(days / 365);
    return `${years} year${years !== 1 ? "s" : ""} interval`;
  }

  function formatReviewCount(count: number): string {
    if (count === 0) return "Not yet reviewed";
    if (count === 1) return "Reviewed once";
    return `Reviewed ${count} times`;
  }

  function formatNextReview(nextReview: string, isDue: boolean): string {
    if (isDue) return "Due now";
    return `Next review ${formatDistanceToNow(new Date(nextReview), {
      addSuffix: true,
    })}`;
  }

  if (cards.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No cards in this view.
      </p>
    );
  }

  const currentSortLabel = SORT_OPTIONS.find((o) => o.key === sortKey)?.label;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {sortedCards.length} card{sortedCards.length !== 1 ? "s" : ""}
        </p>
        <div className="flex items-center gap-1.5">
          <ArrowUpDown className="size-3.5 text-muted-foreground" />
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="h-7 rounded-md border border-input bg-transparent px-2 text-xs text-foreground outline-none"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.key} value={opt.key}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {sortedCards.map((card) => {
        const isExpanded = expandedId === card.id;
        const isEditing = editingId === card.id;
        const today = new Date().toISOString().split("T")[0];
        const isDue = card.next_review <= today;

        return (
          <Card key={card.id} className="p-3">
            {isEditing ? (
              <div className="space-y-3">
                <Textarea
                  value={editFront}
                  onChange={(e) => setEditFront(e.target.value)}
                  rows={2}
                  placeholder="Front (question)"
                />
                <Textarea
                  value={editBack}
                  onChange={(e) => setEditBack(e.target.value)}
                  rows={2}
                  placeholder="Back (answer)"
                />
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingId(null)}
                  >
                    <X className="size-3.5" data-icon="inline-start" />
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => saveEdit(card.id)}
                    disabled={!editFront.trim() || !editBack.trim()}
                  >
                    <Check className="size-3.5" data-icon="inline-start" />
                    Save
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                <div
                  className="flex cursor-pointer items-start gap-3"
                  onClick={() =>
                    setExpandedId(isExpanded ? null : card.id)
                  }
                >
                  <div
                    className={`mt-1.5 size-2 shrink-0 rounded-full ${getMasteryColor(card)}`}
                    title={getMasteryLabel(card)}
                  />
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm ${isExpanded ? "" : "line-clamp-1"}`}>
                      {card.front}
                    </p>
                    {isExpanded && (
                      <p className="mt-2 text-sm text-muted-foreground border-t pt-2">
                        {card.back}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {isDue && (
                      <Badge variant="default" className="text-[10px]">
                        Due
                      </Badge>
                    )}
                    {isExpanded ? (
                      <ChevronUp className="size-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="size-4 text-muted-foreground" />
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-3 flex items-center justify-between border-t pt-3">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span>{getMasteryLabel(card)}</span>
                      <span>{formatInterval(card.interval_days)}</span>
                      <span>{formatReviewCount(card.review_count)}</span>
                      <span>{formatNextReview(card.next_review, isDue)}</span>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          startEdit(card);
                        }}
                      >
                        <Pencil className="size-3" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteCard(card.id);
                        }}
                      >
                        <Trash2 className="size-3" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
