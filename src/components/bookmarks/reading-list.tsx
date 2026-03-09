"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ExternalLink, Globe } from "lucide-react";
import { toast } from "sonner";
import type { Bookmark } from "@/types/database";

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return url;
  }
}

function getFaviconUrl(bookmark: Bookmark): string {
  if (bookmark.favicon) return bookmark.favicon;
  try {
    const hostname = new URL(bookmark.url).hostname;
    return `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`;
  } catch {
    return "";
  }
}

export function ReadingList({ bookmarks }: { bookmarks: Bookmark[] }) {
  if (bookmarks.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        All caught up! No unread bookmarks.
      </p>
    );
  }

  return (
    <div className="space-y-1">
      {bookmarks.map((bookmark) => (
        <ReadingListItem key={bookmark.id} bookmark={bookmark} />
      ))}
    </div>
  );
}

function ReadingListItem({ bookmark }: { bookmark: Bookmark }) {
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [imgError, setImgError] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function markAsRead() {
    setLoading(true);
    setDismissed(true);
    await supabase
      .from("bookmarks")
      .update({ is_read: true })
      .eq("id", bookmark.id);
    toast.success("Marked as read");
    router.refresh();
    setLoading(false);
  }

  const faviconUrl = getFaviconUrl(bookmark);

  if (dismissed) {
    return (
      <div className="flex items-center gap-3 rounded-lg bg-muted/30 px-4 py-3 text-muted-foreground">
        <CheckCircle2 className="size-4 text-green-500" />
        <span className="text-sm line-through">{bookmark.title}</span>
      </div>
    );
  }

  return (
    <div className="group flex items-center gap-3 rounded-lg border border-transparent px-4 py-3 transition-colors hover:bg-muted/50">
      {/* Favicon */}
      <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
        {faviconUrl && !imgError ? (
          <img
            src={faviconUrl}
            alt=""
            className="size-5 rounded-sm"
            onError={() => setImgError(true)}
          />
        ) : (
          <Globe className="size-4 text-muted-foreground" />
        )}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <a
          href={bookmark.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium hover:underline"
        >
          {bookmark.title}
          <ExternalLink className="ml-1 inline size-3 text-muted-foreground" />
        </a>
        <p className="text-xs text-muted-foreground">
          {extractDomain(bookmark.url)}
          {bookmark.collection && (
            <span className="ml-2 text-[10px] opacity-70">
              in {bookmark.collection}
            </span>
          )}
        </p>
      </div>

      {/* Mark as read button */}
      <Button
        variant="outline"
        size="sm"
        onClick={markAsRead}
        disabled={loading}
        className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
      >
        <CheckCircle2 className="size-3.5" />
        {loading ? "..." : "Read"}
      </Button>
    </div>
  );
}
