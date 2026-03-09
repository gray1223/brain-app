"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FolderOpen, X } from "lucide-react";

interface CollectionFilterProps {
  collections: string[];
  activeCollection: string | null;
  collectionCounts: Record<string, number>;
}

export function CollectionFilter({
  collections,
  activeCollection,
  collectionCounts,
}: CollectionFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function setCollection(collection: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (collection) {
      params.set("collection", collection);
    } else {
      params.delete("collection");
    }
    router.push(`/bookmarks?${params.toString()}`);
  }

  if (collections.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium text-muted-foreground">
        Collections:
      </span>
      {activeCollection && (
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => setCollection(null)}
          title="Clear filter"
        >
          <X className="size-3.5" />
        </Button>
      )}
      {collections.map((c) => (
        <button
          key={c}
          onClick={() =>
            setCollection(activeCollection === c ? null : c)
          }
          className="inline-flex items-center"
        >
          <Badge
            variant={activeCollection === c ? "default" : "outline"}
            className="cursor-pointer text-xs transition-colors hover:bg-accent"
          >
            <FolderOpen className="size-3" />
            {c}
            <span className="ml-1 text-[10px] opacity-70">
              {collectionCounts[c] ?? 0}
            </span>
          </Badge>
        </button>
      ))}
    </div>
  );
}
