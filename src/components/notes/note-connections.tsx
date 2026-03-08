"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { NoteConnection } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Link2, Plus, Trash2, FileText } from "lucide-react";
import Link from "next/link";

interface NoteConnectionsProps {
  noteId: string;
  connectedNotes: { id: string; title: string }[];
  connections: NoteConnection[];
}

export function NoteConnections({
  noteId,
  connectedNotes: initialConnectedNotes,
  connections: initialConnections,
}: NoteConnectionsProps) {
  const router = useRouter();
  const supabase = createClient();
  const [connectedNotes, setConnectedNotes] = useState(initialConnectedNotes);
  const [connections, setConnections] = useState(initialConnections);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<{ id: string; title: string }[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!search.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      const { data } = await supabase
        .from("notes")
        .select("id, title")
        .ilike("title", `%${search}%`)
        .neq("id", noteId)
        .eq("is_archived", false)
        .limit(10);

      const connectedIds = new Set(connectedNotes.map((n) => n.id));
      setSearchResults((data ?? []).filter((n) => !connectedIds.has(n.id)));
      setSearching(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [search, noteId, connectedNotes, supabase]);

  async function handleConnect(targetId: string, targetTitle: string) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("note_connections")
      .insert({
        note_a_id: noteId,
        note_b_id: targetId,
        user_id: user.id,
      })
      .select()
      .single();

    if (!error && data) {
      setConnections((prev) => [...prev, data]);
      setConnectedNotes((prev) => [...prev, { id: targetId, title: targetTitle }]);
      setSearch("");
      setSearchResults([]);
      setDialogOpen(false);
    }
  }

  async function handleDisconnect(targetId: string) {
    const connection = connections.find(
      (c) =>
        (c.note_a_id === noteId && c.note_b_id === targetId) ||
        (c.note_b_id === noteId && c.note_a_id === targetId)
    );
    if (!connection) return;

    const { error } = await supabase
      .from("note_connections")
      .delete()
      .eq("id", connection.id);

    if (!error) {
      setConnections((prev) => prev.filter((c) => c.id !== connection.id));
      setConnectedNotes((prev) => prev.filter((n) => n.id !== targetId));
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link2 className="size-4" />
          Connected Notes
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {connectedNotes.length === 0 ? (
          <p className="text-sm text-muted-foreground">No connections yet.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {connectedNotes.map((note) => (
              <li key={note.id} className="flex items-center justify-between gap-2">
                <Link
                  href={`/notes/${note.id}`}
                  className="flex items-center gap-1.5 truncate text-sm hover:underline"
                >
                  <FileText className="size-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate">{note.title || "Untitled"}</span>
                </Link>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => handleDisconnect(note.id)}
                  aria-label={`Disconnect ${note.title}`}
                >
                  <Trash2 />
                </Button>
              </li>
            ))}
          </ul>
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger render={<Button variant="outline" size="sm" className="mt-2 w-full" />}>
            <Plus data-icon="inline-start" />
            Connect Note
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Connect a Note</DialogTitle>
            </DialogHeader>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search notes by title..."
              autoFocus
            />
            <div className="max-h-60 overflow-y-auto">
              {searching && (
                <p className="py-2 text-center text-sm text-muted-foreground">Searching...</p>
              )}
              {!searching && search.trim() && searchResults.length === 0 && (
                <p className="py-2 text-center text-sm text-muted-foreground">No notes found.</p>
              )}
              {searchResults.map((result) => (
                <button
                  key={result.id}
                  onClick={() => handleConnect(result.id, result.title)}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
                >
                  <FileText className="size-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">{result.title || "Untitled"}</span>
                </button>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
