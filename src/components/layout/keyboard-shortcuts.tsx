"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/stores/app-store";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const SHORTCUTS = [
  { keys: ["Cmd", "K"], description: "Open search" },
  { keys: ["Cmd", "Shift", "Space"], description: "Quick capture" },
  { keys: ["Cmd", "Shift", "N"], description: "New note" },
  { keys: ["Cmd", "Shift", "T"], description: "Go to todos" },
  { keys: ["Cmd", "Shift", "J"], description: "Go to journal" },
  { keys: ["?"], description: "Show shortcuts help" },
];

export function ShortcutsHelpDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          {SHORTCUTS.map((shortcut) => (
            <div
              key={shortcut.description}
              className="flex items-center justify-between"
            >
              <span className="text-sm text-muted-foreground">
                {shortcut.description}
              </span>
              <div className="flex items-center gap-1">
                {shortcut.keys.map((key) => (
                  <kbd
                    key={key}
                    className="inline-flex items-center justify-center rounded border bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
                  >
                    {key === "Cmd" ? "\u2318" : key === "Shift" ? "\u21E7" : key === "Space" ? "\u2423" : key}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function KeyboardShortcuts() {
  const router = useRouter();
  const toggleSearch = useAppStore((s) => s.toggleSearch);
  const [helpOpen, setHelpOpen] = useState(false);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      const shift = e.shiftKey;
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      // Cmd+K → open search
      if (meta && e.key === "k") {
        e.preventDefault();
        toggleSearch();
        return;
      }

      // Cmd+Shift+Space → quick capture
      if (meta && shift && e.code === "Space") {
        e.preventDefault();
        // Dispatch a custom event that QuickCapture can listen for
        window.dispatchEvent(new CustomEvent("open-quick-capture"));
        return;
      }

      // Cmd+Shift+N → new note
      if (meta && shift && e.key === "N") {
        e.preventDefault();
        router.push("/notes/new");
        return;
      }

      // Cmd+Shift+T → todos
      if (meta && shift && e.key === "T") {
        e.preventDefault();
        router.push("/todos");
        return;
      }

      // Cmd+Shift+J → journal
      if (meta && shift && e.key === "J") {
        e.preventDefault();
        router.push("/journal");
        return;
      }

      // Cmd+/ or ? → show shortcuts help
      if ((meta && e.key === "/") || (e.key === "?" && !isInput)) {
        e.preventDefault();
        setHelpOpen(true);
        return;
      }
    },
    [toggleSearch, router]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return <ShortcutsHelpDialog open={helpOpen} onOpenChange={setHelpOpen} />;
}
