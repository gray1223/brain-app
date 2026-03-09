"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Copy, Loader2 } from "lucide-react";

interface CloneButtonProps {
  deckId: string;
}

export function CloneButton({ deckId }: CloneButtonProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleClone() {
    setLoading(true);
    try {
      const res = await fetch("/api/flashcards/clone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deckId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to clone deck");
      }

      const { deckId: newDeckId, warning } = await res.json();

      if (warning) {
        toast.warning(warning);
      } else {
        toast.success("Deck cloned to your account!");
      }

      router.push(`/flashcards/${newDeckId}`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to clone deck"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleClone}
      disabled={loading}
      className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
    >
      {loading ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Copy className="size-4" />
      )}
      Clone to My Decks
    </button>
  );
}
