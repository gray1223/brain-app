"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { Button } from "@/components/ui/button";
import { Bold, Italic, List, ListOrdered } from "lucide-react";
import { cn } from "@/lib/utils";

interface IdeaMiniEditorProps {
  content: Record<string, unknown> | null;
  onChange: (json: Record<string, unknown>) => void;
  placeholder?: string;
}

export function IdeaMiniEditor({
  content,
  onChange,
  placeholder = "Add details...",
}: IdeaMiniEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
      }),
      Placeholder.configure({ placeholder }),
    ],
    content: content ?? undefined,
    onUpdate: ({ editor }) => {
      onChange(editor.getJSON() as Record<string, unknown>);
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-sm dark:prose-invert max-w-none min-h-[60px] outline-none focus:outline-none px-0 py-1 text-sm",
      },
    },
  });

  if (!editor) return null;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-0.5 rounded border border-border bg-muted/30 p-0.5">
        <MiniToolbarButton
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
          label="Bold"
        >
          <Bold />
        </MiniToolbarButton>
        <MiniToolbarButton
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          label="Italic"
        >
          <Italic />
        </MiniToolbarButton>
        <div className="mx-0.5 h-4 w-px bg-border" />
        <MiniToolbarButton
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          label="Bullet List"
        >
          <List />
        </MiniToolbarButton>
        <MiniToolbarButton
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          label="Ordered List"
        >
          <ListOrdered />
        </MiniToolbarButton>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}

function MiniToolbarButton({
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
      className={cn("size-5", active && "bg-muted text-foreground")}
    >
      {children}
    </Button>
  );
}
