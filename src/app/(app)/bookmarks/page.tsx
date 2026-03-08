import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { BookmarkCard } from "@/components/bookmarks/bookmark-card";
import { CreateBookmarkDialog } from "@/components/bookmarks/create-bookmark-dialog";
import { Bookmark, BookOpen, Star } from "lucide-react";
import type { Bookmark as BookmarkType } from "@/types/database";

export default async function BookmarksPage() {
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

  const bookmarks = (data as BookmarkType[]) ?? [];
  const unread = bookmarks.filter((b) => !b.is_read);
  const favorites = bookmarks.filter((b) => b.is_favorite);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Bookmarks</h1>
          <p className="text-sm text-muted-foreground">
            {bookmarks.length} bookmark{bookmarks.length !== 1 ? "s" : ""}{" "}
            &middot; {unread.length} unread
          </p>
        </div>
        <CreateBookmarkDialog />
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">
            <Bookmark className="size-3.5" />
            All
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
              No bookmarks yet. Add your first one!
            </p>
          ) : (
            <div className="space-y-2">
              {bookmarks.map((bookmark) => (
                <BookmarkCard key={bookmark.id} bookmark={bookmark} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="unread">
          {unread.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              All caught up! No unread bookmarks.
            </p>
          ) : (
            <div className="space-y-2">
              {unread.map((bookmark) => (
                <BookmarkCard key={bookmark.id} bookmark={bookmark} />
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
