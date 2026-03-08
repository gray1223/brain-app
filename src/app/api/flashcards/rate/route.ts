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

  let body: {
    cardId?: string;
    ease_factor?: number;
    interval_days?: number;
    next_review?: string;
    review_count?: number;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { cardId, ease_factor, interval_days, next_review, review_count } =
    body;

  if (
    !cardId ||
    ease_factor === undefined ||
    interval_days === undefined ||
    !next_review ||
    review_count === undefined
  ) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from("flashcards")
    .update({
      ease_factor,
      interval_days,
      next_review,
      review_count,
    })
    .eq("id", cardId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Failed to update flashcard:", error);
    return NextResponse.json(
      { error: "Failed to update card: " + error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
