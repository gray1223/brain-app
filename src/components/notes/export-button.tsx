"use client";

import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { exportNoteToMarkdown, downloadAsFile } from "@/lib/export";
import type { Note } from "@/types/database";

interface ExportButtonProps {
  note: Note;
}

export function ExportButton({ note }: ExportButtonProps) {
  const handleExport = () => {
    const markdown = exportNoteToMarkdown(note);
    const filename = `${note.title.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase()}.md`;
    downloadAsFile(markdown, filename);
  };

  return (
    <Button variant="outline" size="sm" onClick={handleExport}>
      <Download className="size-4" />
      Export
    </Button>
  );
}
