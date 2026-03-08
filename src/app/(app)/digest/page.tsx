"use client";

import { useEffect, useState, useCallback } from "react";
import { format, subDays } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CheckSquare,
  StickyNote,
  BookOpen,
  Smile,
  RefreshCw,
  Loader2,
  Sparkles,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface DigestData {
  digest: string;
  stats: {
    todosCompleted: number;
    notesCreated: number;
    journalEntries: number;
    avgMood: number | null;
  };
}

export default function DigestPage() {
  const [data, setData] = useState<DigestData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [weekOffset] = useState(0);

  const now = new Date();
  const weekStart = subDays(now, 7 + weekOffset * 7);
  const weekEnd = subDays(now, weekOffset * 7);

  const fetchDigest = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/digest");
      if (!response.ok) throw new Error("Failed to fetch digest");
      const result = await response.json();
      setData(result);
    } catch {
      setError("Failed to generate your weekly digest. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDigest();
  }, [fetchDigest]);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Weekly Digest</h1>
          <p className="text-sm text-muted-foreground">
            {format(weekStart, "MMM d")} - {format(weekEnd, "MMM d, yyyy")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" disabled>
            <ChevronLeft />
          </Button>
          <Button variant="outline" size="icon" disabled>
            <ChevronRight />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchDigest}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="animate-spin" data-icon="inline-start" />
            ) : (
              <RefreshCw data-icon="inline-start" />
            )}
            Generate New Digest
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="flex flex-col items-center gap-2 p-4">
                  <Skeleton className="size-8 rounded-full" />
                  <Skeleton className="h-6 w-12" />
                  <Skeleton className="h-4 w-20" />
                </CardContent>
              </Card>
            ))}
          </div>
          <Card>
            <CardContent className="p-6">
              <Skeleton className="mb-3 h-5 w-40" />
              <Skeleton className="mb-2 h-4 w-full" />
              <Skeleton className="mb-2 h-4 w-full" />
              <Skeleton className="mb-2 h-4 w-3/4" />
              <Skeleton className="h-4 w-5/6" />
            </CardContent>
          </Card>
        </div>
      ) : error ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 p-8">
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchDigest}>
              <RefreshCw data-icon="inline-start" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      ) : data ? (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard
              icon={CheckSquare}
              value={data.stats.todosCompleted}
              label="Todos Completed"
            />
            <StatCard
              icon={StickyNote}
              value={data.stats.notesCreated}
              label="Notes Created"
            />
            <StatCard
              icon={BookOpen}
              value={data.stats.journalEntries}
              label="Journal Entries"
            />
            <StatCard
              icon={Smile}
              value={
                data.stats.avgMood !== null
                  ? `${data.stats.avgMood}/10`
                  : "--"
              }
              label="Avg Mood"
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="size-4" />
                Your Week in Review
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                {data.digest}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}

function StatCard({
  icon: Icon,
  value,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  value: number | string;
  label: string;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-1.5 p-4">
        <div className="flex size-10 items-center justify-center rounded-full bg-primary/10">
          <Icon className="size-5 text-primary" />
        </div>
        <span className="text-2xl font-bold">{value}</span>
        <span className="text-center text-xs text-muted-foreground">
          {label}
        </span>
      </CardContent>
    </Card>
  );
}
