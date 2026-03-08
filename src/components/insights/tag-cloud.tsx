"use client";

import { useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tag, Hash } from "lucide-react";

interface TagItem {
  name: string;
  count: number;
}

interface TagCloudProps {
  tags: TagItem[];
}

const PALETTE = [
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#a855f7", // purple
  "#d946ef", // fuchsia
  "#ec4899", // pink
  "#f43f5e", // rose
  "#ef4444", // red
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#14b8a6", // teal
  "#06b6d4", // cyan
  "#3b82f6", // blue
  "#0ea5e9", // sky
];

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

function getTagColor(name: string): string {
  return PALETTE[hashString(name) % PALETTE.length];
}

export function TagCloud({ tags }: TagCloudProps) {
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Take top 50 by count
  const topTags = useMemo(() => {
    return [...tags].sort((a, b) => b.count - a.count).slice(0, 50);
  }, [tags]);

  const maxCount = useMemo(
    () => Math.max(...topTags.map((t) => t.count), 1),
    [topTags]
  );
  const minCount = useMemo(
    () => Math.min(...topTags.map((t) => t.count), 1),
    [topTags]
  );

  // Font size range: 14px to 42px
  const minFontSize = 14;
  const maxFontSize = 42;

  function getFontSize(count: number): number {
    if (maxCount === minCount) return (minFontSize + maxFontSize) / 2;
    const ratio = (count - minCount) / (maxCount - minCount);
    return minFontSize + ratio * (maxFontSize - minFontSize);
  }

  function getOpacity(count: number): number {
    if (maxCount === minCount) return 0.9;
    const ratio = (count - minCount) / (maxCount - minCount);
    return 0.5 + ratio * 0.5;
  }

  if (topTags.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="size-5" />
            Tag Cloud
          </CardTitle>
          <CardDescription>
            No tags found yet. Add tags to your notes and journal entries!
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Unique Tags</CardDescription>
            <CardTitle className="flex items-center gap-2 text-3xl">
              <Hash className="size-5 text-muted-foreground" />
              {tags.length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Most Used Tag</CardDescription>
            <CardTitle className="text-xl">
              {topTags[0]?.name ?? "--"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {topTags[0]?.count ?? 0} uses
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Total Tag Uses</CardDescription>
            <CardTitle className="text-3xl">
              {tags.reduce((sum, t) => sum + t.count, 0)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Cloud */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="size-5" />
            Tag Cloud
          </CardTitle>
          <CardDescription>
            {selectedTag
              ? `Selected: "${selectedTag}"`
              : "Click a tag to highlight it"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center justify-center gap-3 py-4">
            {topTags.map((tag) => {
              const color = getTagColor(tag.name);
              const fontSize = getFontSize(tag.count);
              const opacity = getOpacity(tag.count);
              const isSelected = selectedTag === tag.name;
              const isDimmed = selectedTag != null && !isSelected;

              return (
                <button
                  key={tag.name}
                  onClick={() =>
                    setSelectedTag(
                      selectedTag === tag.name ? null : tag.name
                    )
                  }
                  className="cursor-pointer rounded-lg px-2 py-1 transition-all hover:scale-110"
                  style={{
                    fontSize: `${fontSize}px`,
                    lineHeight: 1.2,
                    color,
                    opacity: isDimmed ? 0.2 : opacity,
                    fontWeight: isSelected ? 700 : 500,
                    textShadow: isSelected
                      ? `0 0 12px ${color}40`
                      : "none",
                    border: isSelected
                      ? `2px solid ${color}`
                      : "2px solid transparent",
                  }}
                >
                  {tag.name}
                </button>
              );
            })}
          </div>

          {/* Selected tag detail */}
          {selectedTag && (
            <div className="mt-4 flex items-center justify-center gap-2 border-t pt-4">
              <Badge variant="secondary">
                {selectedTag}
              </Badge>
              <span className="text-sm text-muted-foreground">
                used{" "}
                {topTags.find((t) => t.name === selectedTag)?.count ?? 0}{" "}
                {(topTags.find((t) => t.name === selectedTag)?.count ?? 0) === 1
                  ? "time"
                  : "times"}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top tags list */}
      <Card>
        <CardHeader>
          <CardTitle>Top Tags</CardTitle>
          <CardDescription>Most frequently used tags</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {topTags.slice(0, 10).map((tag, i) => (
              <div key={tag.name} className="flex items-center gap-3">
                <span className="w-6 text-right text-sm font-medium text-muted-foreground">
                  {i + 1}.
                </span>
                <div
                  className="size-3 rounded-full"
                  style={{ backgroundColor: getTagColor(tag.name) }}
                />
                <span className="flex-1 text-sm font-medium">{tag.name}</span>
                <div className="flex-1">
                  <div className="h-4 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(tag.count / maxCount) * 100}%`,
                        backgroundColor: getTagColor(tag.name),
                        minWidth: "4px",
                      }}
                    />
                  </div>
                </div>
                <span className="w-10 text-right text-sm tabular-nums text-muted-foreground">
                  {tag.count}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
