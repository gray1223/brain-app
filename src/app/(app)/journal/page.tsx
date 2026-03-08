import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { JournalCard } from "@/components/journal/journal-card";
import { StreakCounter } from "@/components/journal/streak-counter";
import { JournalCalendarWrapper } from "@/components/journal/journal-calendar-wrapper";
import { Plus } from "lucide-react";
import type { JournalEntry } from "@/types/database";

export default async function JournalPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: entries } = await supabase
    .from("journal_entries")
    .select("*")
    .order("date", { ascending: false });

  const journalEntries = (entries ?? []) as JournalEntry[];
  const entryDates = journalEntries.map((e) => e.date);
  const today = format(new Date(), "yyyy-MM-dd");

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Journal</h1>
          <StreakCounter entries={entryDates} />
        </div>
        <Link href={`/journal/${today}`} className={buttonVariants()}>
          <Plus className="size-4" />
          Write Today&apos;s Entry
        </Link>
      </div>

      {/* Calendar view */}
      <JournalCalendarWrapper entryDates={entryDates} />

      {/* Entry list */}
      <div className="space-y-3">
        {journalEntries.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <p className="text-muted-foreground">
              No journal entries yet. Start writing today!
            </p>
          </div>
        ) : (
          journalEntries.map((entry) => (
            <JournalCard key={entry.id} entry={entry} />
          ))
        )}
      </div>
    </div>
  );
}
