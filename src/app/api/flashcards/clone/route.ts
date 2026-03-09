import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { deckId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { deckId } = body;
  if (!deckId) {
    return NextResponse.json(
      { error: "deckId is required" },
      { status: 400 }
    );
  }

  // Fetch the original deck
  const { data: originalDeck } = await supabase
    .from("flashcard_decks")
    .select("*")
    .eq("id", deckId)
    .single();

  if (!originalDeck) {
    return NextResponse.json(
      { error: "Deck not found or not accessible" },
      { status: 404 }
    );
  }

  // Fetch all cards from the original deck
  const { data: originalCards } = await supabase
    .from("flashcards")
    .select("*")
    .eq("deck_id", deckId)
    .order("created_at", { ascending: true });

  // Create a new deck for the current user
  const { data: newDeck, error: deckError } = await supabase
    .from("flashcard_decks")
    .insert({
      user_id: user.id,
      name: `Copy of ${originalDeck.name}`,
      description: originalDeck.description,
    })
    .select()
    .single();

  if (deckError || !newDeck) {
    console.error("Error creating cloned deck:", deckError);
    return NextResponse.json(
      { error: "Failed to create deck" },
      { status: 500 }
    );
  }

  // Clone all cards with default SM-2 values
  if (originalCards && originalCards.length > 0) {
    const today = new Date().toISOString().split("T")[0];
    const newCards = originalCards.map((card) => ({
      deck_id: newDeck.id,
      user_id: user.id,
      front: card.front,
      back: card.back,
      ease_factor: 2.5,
      interval_days: 0,
      next_review: today,
      review_count: 0,
    }));

    const { error: cardsError } = await supabase
      .from("flashcards")
      .insert(newCards);

    if (cardsError) {
      console.error("Error cloning cards:", cardsError);
      // Deck was created but cards failed — still return the deck
      return NextResponse.json({
        deckId: newDeck.id,
        warning: "Deck created but some cards failed to clone",
      });
    }
  }

  return NextResponse.json({ deckId: newDeck.id });
}
