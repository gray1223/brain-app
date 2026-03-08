"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Sparkles } from "lucide-react";
import { AutoTagButton } from "./auto-tag-button";
import { SmartConnectionsButton } from "./smart-connections-button";

interface NoteAIToolsProps {
  noteId: string;
  title: string;
  content: Record<string, unknown> | null;
  initialTags: string[];
}

function extractPlainText(node: Record<string, unknown>): string {
  if (!node) return "";
  let text = "";
  if (node.text && typeof node.text === "string") {
    text += node.text;
  }
  if (Array.isArray(node.content)) {
    for (const child of node.content) {
      text += extractPlainText(child as Record<string, unknown>);
    }
    // Add newline after block-level nodes
    if (node.type && node.type !== "text") {
      text += "\n";
    }
  }
  return text;
}

export function NoteAITools({
  noteId,
  title,
  content,
  initialTags,
}: NoteAIToolsProps) {
  const [tags, setTags] = useState<string[]>(initialTags);

  const plainText = content ? extractPlainText(content).trim() : "";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="size-4" />
          AI Tools
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <AutoTagButton
          noteId={noteId}
          currentContent={plainText}
          currentTags={tags}
          onTagsUpdated={setTags}
        />
        <SmartConnectionsButton
          noteId={noteId}
          title={title}
          content={plainText}
        />
      </CardContent>
    </Card>
  );
}
