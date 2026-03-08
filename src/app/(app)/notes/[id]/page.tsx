import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { NoteEditor } from "@/components/notes/note-editor";
import { NoteTagManager } from "@/components/notes/note-tag-manager";
import { NoteConnections } from "@/components/notes/note-connections";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function NotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: note, error } = await supabase
    .from("notes")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !note) notFound();

  const { data: connections } = await supabase
    .from("note_connections")
    .select("*")
    .or(`note_a_id.eq.${id},note_b_id.eq.${id}`)
    .eq("user_id", user.id);

  const connectedNoteIds = (connections ?? []).map((c) =>
    c.note_a_id === id ? c.note_b_id : c.note_a_id
  );

  let connectedNotes: { id: string; title: string }[] = [];
  if (connectedNoteIds.length > 0) {
    const { data } = await supabase
      .from("notes")
      .select("id, title")
      .in("id", connectedNoteIds);
    connectedNotes = data ?? [];
  }

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <div className="flex-1">
        <div className="mb-4">
          <Button variant="ghost" size="sm" render={<Link href="/notes" />}>
            <ArrowLeft data-icon="inline-start" />
            Back to Notes
          </Button>
        </div>

        <NoteEditor
          noteId={note.id}
          initialContent={note.content as Record<string, unknown> | null}
          initialTitle={note.title}
        />

        <div className="mt-6">
          <NoteTagManager noteId={note.id} initialTags={note.tags ?? []} />
        </div>
      </div>

      <aside className="w-full shrink-0 lg:w-72">
        <NoteConnections
          noteId={note.id}
          connectedNotes={connectedNotes}
          connections={connections ?? []}
        />
      </aside>
    </div>
  );
}
