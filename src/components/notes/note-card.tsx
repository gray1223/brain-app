"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatDistanceToNow } from "date-fns";
import type { Note } from "@/types/database";
import { Card, CardHeader, CardTitle, CardContent, CardAction } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Archive, Trash2 } from "lucide-react";

function getPlainText(content: Record<string, unknown> | null): string {
  if (!content) return "";
  try {
    const extractText = (node: Record<string, unknown>): string => {
      if (node.text && typeof node.text === "string") return node.text;
      if (Array.isArray(node.content)) {
        return node.content.map((child: Record<string, unknown>) => extractText(child)).join(" ");
      }
      return "";
    };
    return extractText(content);
  } catch {
    return "";
  }
}

interface NoteCardProps {
  note: Note;
  onArchive?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function NoteCard({ note, onArchive, onDelete }: NoteCardProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const supabase = createClient();

  const plainText = getPlainText(note.content);
  const preview = plainText.length > 100 ? plainText.slice(0, 100) + "..." : plainText;
  const updatedAgo = formatDistanceToNow(new Date(note.updated_at), { addSuffix: true });

  async function handleArchive(e: React.MouseEvent) {
    e.stopPropagation();
    const { error } = await supabase
      .from("notes")
      .update({ is_archived: true })
      .eq("id", note.id);
    if (!error) onArchive?.(note.id);
  }

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    setIsDeleting(true);
    const { error } = await supabase.from("notes").delete().eq("id", note.id);
    if (!error) onDelete?.(note.id);
    setIsDeleting(false);
  }

  return (
    <Card
      className="cursor-pointer transition-shadow hover:shadow-md"
      onClick={() => router.push(`/notes/${note.id}`)}
    >
      <CardHeader>
        <CardTitle className="line-clamp-1">{note.title || "Untitled"}</CardTitle>
        <CardAction>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="ghost" size="icon-xs" />}
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleArchive}>
                <Archive />
                Archive
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                <Trash2 />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardAction>
      </CardHeader>
      <CardContent>
        {preview ? (
          <p className="line-clamp-3 text-sm text-muted-foreground">{preview}</p>
        ) : (
          <p className="text-sm italic text-muted-foreground">No content yet</p>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {note.tags.map((tag) => (
            <Badge key={tag} variant="secondary">
              {tag}
            </Badge>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">{updatedAgo}</p>
      </CardContent>
    </Card>
  );
}
