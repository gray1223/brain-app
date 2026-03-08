"use client";

import { Brain, User } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
}

function formatMarkdown(text: string): string {
  // Bold: **text** or __text__
  let formatted = text.replace(
    /\*\*(.*?)\*\*/g,
    '<strong class="font-semibold">$1</strong>'
  );
  formatted = formatted.replace(
    /__(.*?)__/g,
    '<strong class="font-semibold">$1</strong>'
  );

  // Italic: *text* or _text_ (not inside bold)
  formatted = formatted.replace(
    /(?<!\*)\*(?!\*)(.*?)(?<!\*)\*(?!\*)/g,
    "<em>$1</em>"
  );
  formatted = formatted.replace(
    /(?<!_)_(?!_)(.*?)(?<!_)_(?!_)/g,
    "<em>$1</em>"
  );

  // Inline code: `text`
  formatted = formatted.replace(
    /`(.*?)`/g,
    '<code class="rounded bg-muted px-1 py-0.5 text-sm">$1</code>'
  );

  // Unordered list items: - item or * item
  formatted = formatted.replace(
    /^[\-\*]\s+(.+)$/gm,
    '<li class="ml-4 list-disc">$1</li>'
  );

  // Ordered list items: 1. item
  formatted = formatted.replace(
    /^\d+\.\s+(.+)$/gm,
    '<li class="ml-4 list-decimal">$1</li>'
  );

  // Wrap consecutive <li> in <ul> or <ol>
  formatted = formatted.replace(
    /((?:<li class="ml-4 list-disc">.*?<\/li>\n?)+)/g,
    '<ul class="my-1 space-y-0.5">$1</ul>'
  );
  formatted = formatted.replace(
    /((?:<li class="ml-4 list-decimal">.*?<\/li>\n?)+)/g,
    '<ol class="my-1 space-y-0.5">$1</ol>'
  );

  // Line breaks (double newline = paragraph break)
  formatted = formatted.replace(/\n\n/g, '<div class="my-2"></div>');
  formatted = formatted.replace(/\n/g, "<br />");

  return formatted;
}

export function ChatMessage({ role, content }: ChatMessageProps) {
  const isUser = role === "user";

  return (
    <div
      className={cn(
        "flex items-start gap-3",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      <Avatar size="sm">
        <AvatarFallback
          className={cn(
            isUser
              ? "bg-primary text-primary-foreground"
              : "bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300"
          )}
        >
          {isUser ? (
            <User className="size-3.5" />
          ) : (
            <Brain className="size-3.5" />
          )}
        </AvatarFallback>
      </Avatar>

      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-foreground"
        )}
      >
        {isUser ? (
          <p>{content}</p>
        ) : (
          <div
            dangerouslySetInnerHTML={{ __html: formatMarkdown(content) }}
          />
        )}
      </div>
    </div>
  );
}
