"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, EyeOff, Star, Trash2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import type { Bookmark } from "@/types/database";

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return url;
  }
}

export function BookmarkCard({ bookmark }: { bookmark: Bookmark }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function toggleRead() {
    setLoading(true);
    await supabase
      .from("bookmarks")
      .update({ is_read: !bookmark.is_read })
      .eq("id", bookmark.id);
    router.refresh();
    setLoading(false);
  }

  async function toggleFavorite() {
    setLoading(true);
    await supabase
      .from("bookmarks")
      .update({ is_favorite: !bookmark.is_favorite })
      .eq("id", bookmark.id);
    router.refresh();
    setLoading(false);
  }

  async function deleteBookmark() {
    setLoading(true);
    await supabase.from("bookmarks").delete().eq("id", bookmark.id);
    toast.success("Bookmark deleted");
    router.refresh();
    setLoading(false);
  }

  return (
    <Card className="group p-4 transition-colors hover:bg-muted/50">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <a
              href={bookmark.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium hover:underline"
            >
              {bookmark.title}
              <ExternalLink className="ml-1 inline size-3 text-muted-foreground" />
            </a>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {extractDomain(bookmark.url)}
          </p>
          {bookmark.description && (
            <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
              {bookmark.description}
            </p>
          )}
          {bookmark.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {bookmark.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={toggleRead}
            disabled={loading}
            title={bookmark.is_read ? "Mark as unread" : "Mark as read"}
          >
            {bookmark.is_read ? (
              <EyeOff className="size-3.5 text-muted-foreground" />
            ) : (
              <Eye className="size-3.5 text-muted-foreground" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={toggleFavorite}
            disabled={loading}
            title={bookmark.is_favorite ? "Remove from favorites" : "Add to favorites"}
          >
            <Star
              className={`size-3.5 ${
                bookmark.is_favorite
                  ? "fill-yellow-400 text-yellow-400"
                  : "text-muted-foreground"
              }`}
            />
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            className="opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={deleteBookmark}
            disabled={loading}
            title="Delete bookmark"
          >
            <Trash2 className="size-3.5 text-muted-foreground" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
