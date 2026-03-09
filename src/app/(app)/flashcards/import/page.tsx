import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ImportFlashcards } from "@/components/flashcards/import-flashcards";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function ImportFlashcardsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: decks } = await supabase
    .from("flashcard_decks")
    .select("id, name")
    .eq("user_id", user.id)
    .order("name");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" render={<Link href="/flashcards" />}>
          <ArrowLeft data-icon="inline-start" />
          Back
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Import Flashcards
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Import cards from CSV or TSV files (compatible with Anki and Quizlet
          exports).
        </p>
      </div>

      <ImportFlashcards decks={decks ?? []} />
    </div>
  );
}
