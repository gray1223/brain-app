"use client";

import { useState } from "react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Share2, Copy, Check } from "lucide-react";
import { toast } from "sonner";

interface ShareDialogProps {
  deckId: string;
  deckName: string;
}

export function ShareDialog({ deckId, deckName }: ShareDialogProps) {
  const [copied, setCopied] = useState(false);

  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/shared/deck/${deckId}`
      : "";

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Link copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  }

  return (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <Share2 className="size-4" data-icon="inline-start" />
        Share
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share Deck</DialogTitle>
          <DialogDescription>
            Anyone with this link can preview and clone &ldquo;{deckName}&rdquo;
            to their own account.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1 rounded-md border bg-muted px-3 py-2 text-sm break-all select-all">
            {shareUrl}
          </div>
          <Button variant="outline" size="sm" onClick={handleCopy}>
            {copied ? (
              <Check className="size-4" />
            ) : (
              <Copy className="size-4" />
            )}
          </Button>
        </div>

        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Close</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
