"use client";

import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { JournalEntry } from "@/types/database";

const MOOD_EMOJIS: Record<number, string> = {
  1: "😢",
  2: "😕",
  3: "😐",
  4: "🙂",
  5: "😄",
};

function getContentPreview(content: Record<string, unknown> | null): string {
  if (!content) return "No content yet...";

  try {
    // TipTap JSON content - extract text from content nodes
    const doc = content as {
      content?: Array<{
        content?: Array<{ text?: string }>;
      }>;
    };
    if (doc.content) {
      const texts: string[] = [];
      for (const node of doc.content) {
        if (node.content) {
          for (const inline of node.content) {
            if (inline.text) texts.push(inline.text);
          }
        }
      }
      const preview = texts.join(" ");
      return preview.length > 120 ? preview.slice(0, 120) + "..." : preview || "No content yet...";
    }
  } catch {
    // fallback
  }

  return "No content yet...";
}

interface JournalCardProps {
  entry: JournalEntry;
}

export function JournalCard({ entry }: JournalCardProps) {
  const router = useRouter();
  const date = parseISO(entry.date);
  const moodEmoji = entry.mood ? MOOD_EMOJIS[entry.mood] : null;
  const preview = getContentPreview(entry.content);

  return (
    <Card
      className="cursor-pointer transition-colors hover:bg-muted/50"
      onClick={() => router.push(`/journal/${entry.date}`)}
    >
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {moodEmoji && <span className="text-lg">{moodEmoji}</span>}
          <span>{format(date, "EEEE, MMMM d, yyyy")}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-sm text-muted-foreground line-clamp-2">{preview}</p>
        {entry.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {entry.tags.map((tag) => (
              <Badge key={tag} variant="secondary">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
