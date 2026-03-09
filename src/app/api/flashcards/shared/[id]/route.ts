import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  // Check if the caller is authenticated (optional — used to determine if they own the deck)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch the deck — RLS will scope this to the current user's data if they're logged in.
  // For a public share we first try fetching as the current user. If the current user
  // is the owner, they get full data. Otherwise, we still attempt the query — if RLS
  // blocks it (no rows returned), we return a minimal "not found" rather than leaking data.
  const { data: deck } = await supabase
    .from("flashcard_decks")
    .select("*")
    .eq("id", id)
    .single();

  if (!deck) {
    return NextResponse.json(
      { error: "Deck not found or not accessible" },
      { status: 404 }
    );
  }

  const isOwner = user?.id === deck.user_id;

  // Fetch cards
  const { data: cards } = await supabase
    .from("flashcards")
    .select("*")
    .eq("deck_id", id)
    .order("created_at", { ascending: true });

  const allCards = cards ?? [];

  if (isOwner) {
    // Owner gets everything
    return NextResponse.json({
      deck,
      cards: allCards,
      isOwner: true,
    });
  }

  // Non-owner: return preview data only (fronts, no backs)
  return NextResponse.json({
    deck: {
      id: deck.id,
      name: deck.name,
      description: deck.description,
      created_at: deck.created_at,
    },
    cards: allCards.map((c) => ({
      id: c.id,
      front: c.front,
    })),
    cardCount: allCards.length,
    isOwner: false,
  });
}
