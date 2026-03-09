import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { BookmarkCard } from "@/components/bookmarks/bookmark-card";
import { CreateBookmarkDialog } from "@/components/bookmarks/create-bookmark-dialog";
import { CollectionFilter } from "@/components/bookmarks/collection-filter";
import { ReadingList } from "@/components/bookmarks/reading-list";
import { Badge } from "@/components/ui/badge";
import { Bookmark, BookOpen, Star, ListChecks } from "lucide-react";
import type { Bookmark as BookmarkType } from "@/types/database";

interface PageProps {
  searchParams: Promise<{ collection?: string }>;
}

export default async function BookmarksPage({ searchParams }: PageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data } = await supabase
    .from("bookmarks")
    .select("*")
    .order("created_at", { ascending: false });

  const allBookmarks = (data as BookmarkType[]) ?? [];

  // Extract unique collections
  const collections = [
    ...new Set(
      allBookmarks
        .map((b) => b.collection)
        .filter((c): c is string => c !== null && c !== "")
    ),
  ].sort();

  // Collection counts
  const collectionCounts: Record<string, number> = {};
  for (const b of allBookmarks) {
    if (b.collection) {
      collectionCounts[b.collection] =
        (collectionCounts[b.collection] ?? 0) + 1;
    }
  }

  // Apply collection filter
  const params = await searchParams;
  const activeCollection = params.collection ?? null;
  const bookmarks = activeCollection
    ? allBookmarks.filter((b) => b.collection === activeCollection)
    : allBookmarks;

  const unread = bookmarks.filter((b) => !b.is_read);
  const favorites = bookmarks.filter((b) => b.is_favorite);
  const totalUnread = allBookmarks.filter((b) => !b.is_read).length;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Bookmarks</h1>
          <p className="text-sm text-muted-foreground">
            {allBookmarks.length} bookmark
            {allBookmarks.length !== 1 ? "s" : ""} &middot;{" "}
            {totalUnread} unread
            {activeCollection && (
              <span className="ml-1">
                &middot; filtered by &ldquo;{activeCollection}&rdquo;
              </span>
            )}
          </p>
        </div>
        <CreateBookmarkDialog collections={collections} />
      </div>

      <CollectionFilter
        collections={collections}
        activeCollection={activeCollection}
        collectionCounts={collectionCounts}
      />

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">
            <Bookmark className="size-3.5" />
            All
          </TabsTrigger>
          <TabsTrigger value="reading-list">
            <ListChecks className="size-3.5" />
            Reading List
            {unread.length > 0 && (
              <Badge
                variant="destructive"
                className="ml-1 h-4 min-w-4 px-1 text-[10px]"
              >
                {unread.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="unread">
            <BookOpen className="size-3.5" />
            Unread
          </TabsTrigger>
          <TabsTrigger value="favorites">
            <Star className="size-3.5" />
            Favorites
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          {bookmarks.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {activeCollection
                ? `No bookmarks in "${activeCollection}".`
                : "No bookmarks yet. Add your first one!"}
            </p>
          ) : (
            <div className="space-y-2">
              {bookmarks.map((bookmark) => (
                <BookmarkCard key={bookmark.id} bookmark={bookmark} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="reading-list">
          <ReadingList bookmarks={unread} />
        </TabsContent>

        <TabsContent value="unread">
          {unread.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              All caught up! No unread bookmarks.
            </p>
          ) : (
            <div className="space-y-2">
              {unread.map((bookmark) => (
                <BookmarkCard
                  key={bookmark.id}
                  bookmark={bookmark}
                  showMarkAsRead
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="favorites">
          {favorites.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No favorites yet. Star a bookmark to see it here.
            </p>
          ) : (
            <div className="space-y-2">
              {favorites.map((bookmark) => (
                <BookmarkCard key={bookmark.id} bookmark={bookmark} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
