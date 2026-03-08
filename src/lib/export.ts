import type { Note, JournalEntry } from "@/types/database";

// TipTap JSON content types
interface TipTapNode {
  type: string;
  content?: TipTapNode[];
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: { type: string; attrs?: Record<string, unknown> }[];
}

function renderMarks(text: string, marks?: { type: string; attrs?: Record<string, unknown> }[]): string {
  if (!marks || marks.length === 0) return text;

  let result = text;
  for (const mark of marks) {
    switch (mark.type) {
      case "bold":
        result = `**${result}**`;
        break;
      case "italic":
        result = `*${result}*`;
        break;
      case "link":
        result = `[${result}](${mark.attrs?.href ?? ""})`;
        break;
    }
  }
  return result;
}

function renderInlineContent(nodes?: TipTapNode[]): string {
  if (!nodes) return "";
  return nodes.map((node) => {
    if (node.text) {
      return renderMarks(node.text, node.marks);
    }
    return "";
  }).join("");
}

function renderNode(node: TipTapNode, indent = ""): string {
  switch (node.type) {
    case "heading": {
      const level = (node.attrs?.level as number) ?? 1;
      const prefix = "#".repeat(level);
      return `${prefix} ${renderInlineContent(node.content)}`;
    }

    case "paragraph":
      return renderInlineContent(node.content);

    case "bulletList":
      return (node.content ?? [])
        .map((item) => {
          const content = (item.content ?? [])
            .map((child) => renderNode(child))
            .join("\n");
          return `${indent}- ${content}`;
        })
        .join("\n");

    case "orderedList":
      return (node.content ?? [])
        .map((item, i) => {
          const content = (item.content ?? [])
            .map((child) => renderNode(child))
            .join("\n");
          return `${indent}${i + 1}. ${content}`;
        })
        .join("\n");

    case "listItem":
      return (node.content ?? []).map((child) => renderNode(child)).join("\n");

    case "doc":
      return (node.content ?? []).map((child) => renderNode(child)).join("\n\n");

    default:
      if (node.content) {
        return node.content.map((child) => renderNode(child)).join("\n");
      }
      return node.text ?? "";
  }
}

export function exportNoteToMarkdown(note: Note): string {
  const lines: string[] = [];

  lines.push(`# ${note.title}`);
  lines.push("");

  if (note.tags && note.tags.length > 0) {
    lines.push(`Tags: ${note.tags.map((t) => `#${t}`).join(" ")}`);
    lines.push("");
  }

  if (note.content) {
    lines.push(renderNode(note.content as unknown as TipTapNode));
  }

  lines.push("");
  lines.push(`---`);
  lines.push(`Created: ${new Date(note.created_at).toLocaleDateString()}`);
  lines.push(`Updated: ${new Date(note.updated_at).toLocaleDateString()}`);

  return lines.join("\n");
}

const MOOD_EMOJIS: Record<number, string> = {
  1: "\u{1F622}",
  2: "\u{1F615}",
  3: "\u{1F610}",
  4: "\u{1F642}",
  5: "\u{1F60A}",
};

export function exportJournalToMarkdown(entry: JournalEntry): string {
  const lines: string[] = [];

  lines.push(`# Journal - ${entry.date}`);
  lines.push("");

  if (entry.mood !== null) {
    const emoji = MOOD_EMOJIS[entry.mood] ?? "";
    lines.push(`Mood: ${emoji} (${entry.mood}/5)`);
    lines.push("");
  }

  if (entry.tags && entry.tags.length > 0) {
    lines.push(`Tags: ${entry.tags.map((t) => `#${t}`).join(" ")}`);
    lines.push("");
  }

  if (entry.content) {
    lines.push(renderNode(entry.content as unknown as TipTapNode));
  }

  return lines.join("\n");
}

export function downloadAsFile(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
