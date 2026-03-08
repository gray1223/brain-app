import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CreateNoteButton } from "@/components/notes/create-note-button";
import { NotesListClient } from "@/components/notes/notes-list-client";

export default async function NotesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: notes, error } = await supabase
    .from("notes")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_archived", false)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch notes:", error);
  }

  const allTags = Array.from(
    new Set((notes ?? []).flatMap((note) => note.tags ?? []))
  ).sort();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Notes</h1>
        <CreateNoteButton />
      </div>

      <NotesListClient notes={notes ?? []} allTags={allTags} />
    </div>
  );
}
