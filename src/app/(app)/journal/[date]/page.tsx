import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { format, parseISO } from "date-fns";
import { JournalEditor } from "@/components/journal/journal-editor";
import { buttonVariants } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";

interface JournalDatePageProps {
  params: Promise<{ date: string }>;
}

export default async function JournalDatePage({ params }: JournalDatePageProps) {
  const { date } = await params;

  // Validate date format
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) {
    redirect("/journal");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Fetch existing entry for this date
  const { data: entry } = await supabase
    .from("journal_entries")
    .select("*")
    .eq("user_id", user.id)
    .eq("date", date)
    .maybeSingle();

  const parsedDate = parseISO(date);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/journal" className={buttonVariants({ variant: "ghost", size: "icon" })}>
          <ChevronLeft className="size-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">
            {format(parsedDate, "EEEE, MMMM d, yyyy")}
          </h1>
          <p className="text-sm text-muted-foreground">Journal Entry</p>
        </div>
      </div>

      <JournalEditor
        entryId={entry?.id ?? null}
        date={date}
        initialContent={entry?.content ?? null}
        initialMood={entry?.mood ?? null}
        initialTags={entry?.tags ?? []}
      />
    </div>
  );
}
