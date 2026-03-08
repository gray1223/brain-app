"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Bold,
  Italic,
  Heading2,
  List,
  ListOrdered,
  Link as LinkIcon,
  Unlink,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NoteEditorProps {
  noteId: string;
  initialContent: Record<string, unknown> | null;
  initialTitle: string;
}

export function NoteEditor({ noteId, initialContent, initialTitle }: NoteEditorProps) {
  const supabase = createClient();
  const [title, setTitle] = useState(initialTitle);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const saveContent = useCallback(
    (json: Record<string, unknown>) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(async () => {
        await supabase
          .from("notes")
          .update({ content: json, updated_at: new Date().toISOString() })
          .eq("id", noteId);
      }, 1000);
    },
    [noteId, supabase]
  );

  const saveTitle = useCallback(
    (newTitle: string) => {
      if (titleTimerRef.current) clearTimeout(titleTimerRef.current);
      titleTimerRef.current = setTimeout(async () => {
        await supabase
          .from("notes")
          .update({ title: newTitle, updated_at: new Date().toISOString() })
          .eq("id", noteId);
      }, 1000);
    },
    [noteId, supabase]
  );

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: "Start writing...",
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-primary underline underline-offset-2 cursor-pointer",
        },
      }),
    ],
    content: initialContent ?? undefined,
    onUpdate: ({ editor }) => {
      saveContent(editor.getJSON() as Record<string, unknown>);
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-sm dark:prose-invert max-w-none min-h-[300px] outline-none focus:outline-none px-0 py-2",
      },
    },
  });

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (titleTimerRef.current) clearTimeout(titleTimerRef.current);
    };
  }, []);

  function handleTitleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newTitle = e.target.value;
    setTitle(newTitle);
    saveTitle(newTitle);
  }

  function handleSetLink() {
    if (!editor) return;
    const previousUrl = editor.getAttributes("link").href;
    const url = window.prompt("Enter URL", previousUrl ?? "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }

  if (!editor) return null;

  return (
    <div className="flex flex-col gap-4">
      <Input
        value={title}
        onChange={handleTitleChange}
        placeholder="Note title"
        className="border-none bg-transparent text-2xl font-bold outline-none focus-visible:ring-0 focus-visible:border-transparent h-auto px-0 py-1"
      />

      <div className="flex flex-wrap items-center gap-1 rounded-lg border border-border bg-muted/30 p-1">
        <ToolbarButton
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
          label="Bold"
        >
          <Bold />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          label="Italic"
        >
          <Italic />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("heading", { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          label="Heading"
        >
          <Heading2 />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          label="Bullet List"
        >
          <List />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          label="Ordered List"
        >
          <ListOrdered />
        </ToolbarButton>
        {editor.isActive("link") ? (
          <ToolbarButton
            active
            onClick={() => editor.chain().focus().unsetLink().run()}
            label="Remove Link"
          >
            <Unlink />
          </ToolbarButton>
        ) : (
          <ToolbarButton active={false} onClick={handleSetLink} label="Add Link">
            <LinkIcon />
          </ToolbarButton>
        )}
      </div>

      <EditorContent editor={editor} />
    </div>
  );
}

function ToolbarButton({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Button
      variant="ghost"
      size="icon-xs"
      onClick={onClick}
      aria-label={label}
      className={cn(active && "bg-muted text-foreground")}
    >
      {children}
    </Button>
  );
}
