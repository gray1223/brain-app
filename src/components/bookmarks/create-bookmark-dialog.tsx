"use client";

import { useState, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface CreateBookmarkDialogProps {
  collections?: string[];
}

export function CreateBookmarkDialog({
  collections = [],
}: CreateBookmarkDialogProps) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [collection, setCollection] = useState("");
  const [newCollection, setNewCollection] = useState("");
  const [favicon, setFavicon] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [metadataFetched, setMetadataFetched] = useState(false);
  const fetchedUrlRef = useRef("");
  const router = useRouter();
  const supabase = createClient();

  function resetForm() {
    setUrl("");
    setTitle("");
    setDescription("");
    setTagsInput("");
    setCollection("");
    setNewCollection("");
    setFavicon(null);
    setFetching(false);
    setMetadataFetched(false);
    fetchedUrlRef.current = "";
  }

  const fetchMetadata = useCallback(
    async (targetUrl: string) => {
      const trimmed = targetUrl.trim();
      if (!trimmed || fetchedUrlRef.current === trimmed) return;

      // Basic URL validation
      try {
        new URL(trimmed);
      } catch {
        return;
      }

      fetchedUrlRef.current = trimmed;
      setFetching(true);

      try {
        const res = await fetch("/api/bookmarks/metadata", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: trimmed }),
        });

        if (!res.ok) throw new Error("Fetch failed");

        const data = await res.json();

        // Only auto-fill if user hasn't manually edited fields
        if (!title) setTitle(data.title ?? "");
        if (!description) setDescription(data.description ?? "");
        if (data.favicon) setFavicon(data.favicon);
        setMetadataFetched(true);
      } catch {
        // Silently fail - user can still enter title manually
      } finally {
        setFetching(false);
      }
    },
    [title, description]
  );

  function handleUrlPaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData("text");
    // Let the paste happen, then fetch
    setTimeout(() => fetchMetadata(pasted), 0);
  }

  function handleUrlBlur() {
    if (url.trim()) {
      fetchMetadata(url);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim() || !title.trim()) return;

    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      return;
    }

    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const finalCollection = newCollection.trim() || collection || null;

    const { error } = await supabase.from("bookmarks").insert({
      user_id: user.id,
      url: url.trim(),
      title: title.trim(),
      description: description.trim() || null,
      tags,
      collection: finalCollection,
      favicon: favicon,
    });

    setSaving(false);

    if (error) {
      toast.error("Failed to create bookmark");
      return;
    }

    toast.success("Bookmark added");
    resetForm();
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <Plus className="size-4" data-icon="inline-start" />
        Add Bookmark
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add Bookmark</DialogTitle>
            <DialogDescription>
              Paste a URL to auto-fill title and description.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bookmark-url">URL</Label>
              <div className="relative">
                <Input
                  id="bookmark-url"
                  type="url"
                  placeholder="https://example.com/article"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onPaste={handleUrlPaste}
                  onBlur={handleUrlBlur}
                  required
                  autoFocus
                  className={fetching ? "pr-9" : ""}
                />
                {fetching && (
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                    <Loader2 className="size-4 animate-spin text-muted-foreground" />
                  </div>
                )}
              </div>
              {metadataFetched && favicon && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <img
                    src={favicon}
                    alt=""
                    className="size-4 rounded-sm"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                  <span>Metadata fetched successfully</span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="bookmark-title">Title</Label>
              <div className="relative">
                <Input
                  id="bookmark-title"
                  placeholder={fetching ? "Fetching title..." : "Article title"}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  disabled={fetching}
                />
                {fetching && (
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                    <Loader2 className="size-4 animate-spin text-muted-foreground" />
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bookmark-description">Description</Label>
              <Textarea
                id="bookmark-description"
                placeholder={
                  fetching
                    ? "Fetching description..."
                    : "Brief description..."
                }
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={fetching}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bookmark-collection">Collection</Label>
              {collections.length > 0 ? (
                <div className="flex gap-2">
                  <select
                    id="bookmark-collection"
                    value={collection}
                    onChange={(e) => {
                      setCollection(e.target.value);
                      if (e.target.value) setNewCollection("");
                    }}
                    className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
                  >
                    <option value="">No collection</option>
                    {collections.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <span className="flex items-center text-xs text-muted-foreground">
                    or
                  </span>
                  <Input
                    placeholder="New collection"
                    value={newCollection}
                    onChange={(e) => {
                      setNewCollection(e.target.value);
                      if (e.target.value) setCollection("");
                    }}
                    className="flex-1"
                  />
                </div>
              ) : (
                <Input
                  id="bookmark-collection"
                  placeholder="Collection name (e.g. Design, Dev Tools)"
                  value={newCollection}
                  onChange={(e) => setNewCollection(e.target.value)}
                />
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="bookmark-tags">Tags</Label>
              <Input
                id="bookmark-tags"
                placeholder="Comma-separated tags (e.g. tech, ai, design)"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="mt-4">
            <DialogClose render={<Button variant="outline" />}>
              Cancel
            </DialogClose>
            <Button
              type="submit"
              disabled={saving || fetching || !url.trim() || !title.trim()}
            >
              {saving ? "Saving..." : "Add Bookmark"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
