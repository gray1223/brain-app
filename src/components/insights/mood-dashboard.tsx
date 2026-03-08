"use client";

import { useMemo } from "react";
import { format, subDays, getDay, startOfMonth, subMonths } from "date-fns";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface JournalEntry {
  date: string;
  mood: number | null;
  tags: string[];
}

interface MoodDashboardProps {
  journalEntries: JournalEntry[];
}

const MOOD_EMOJI: Record<number, string> = {
  1: "\u{1F629}",
  2: "\u{1F614}",
  3: "\u{1F610}",
  4: "\u{1F60A}",
  5: "\u{1F604}",
};

const MOOD_LABELS: Record<number, string> = {
  1: "Rough",
  2: "Low",
  3: "Okay",
  4: "Good",
  5: "Great",
};

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function moodColor(mood: number): string {
  const colors: Record<number, string> = {
    1: "#ef4444",
    2: "#f97316",
    3: "#eab308",
    4: "#22c55e",
    5: "#16a34a",
  };
  return colors[mood] ?? "#94a3b8";
}

export function MoodDashboard({ journalEntries }: MoodDashboardProps) {
  const now = new Date();

  // Last 30 days data for line chart
  const last30Days = useMemo(() => {
    const days: { date: Date; dateStr: string; mood: number | null }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = subDays(now, i);
      const dateStr = format(d, "yyyy-MM-dd");
      const entry = journalEntries.find((e) => e.date === dateStr);
      days.push({
        date: d,
        dateStr,
        mood: entry?.mood ?? null,
      });
    }
    return days;
  }, [journalEntries]);

  // Filter to only days with mood data for the line chart
  const moodPoints = last30Days.filter((d) => d.mood !== null) as {
    date: Date;
    dateStr: string;
    mood: number;
  }[];

  // Mood by day of week
  const moodByDayOfWeek = useMemo(() => {
    const buckets: { total: number; count: number }[] = Array.from(
      { length: 7 },
      () => ({ total: 0, count: 0 })
    );
    for (const entry of journalEntries) {
      if (entry.mood != null) {
        const day = getDay(new Date(entry.date + "T00:00:00"));
        buckets[day].total += entry.mood;
        buckets[day].count += 1;
      }
    }
    return buckets.map((b, i) => ({
      day: DAY_LABELS[i],
      avg: b.count > 0 ? b.total / b.count : 0,
      count: b.count,
    }));
  }, [journalEntries]);

  // Mood distribution
  const moodDistribution = useMemo(() => {
    const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const entry of journalEntries) {
      if (entry.mood != null && entry.mood >= 1 && entry.mood <= 5) {
        counts[entry.mood]++;
      }
    }
    const maxCount = Math.max(...Object.values(counts), 1);
    return [1, 2, 3, 4, 5].map((level) => ({
      level,
      count: counts[level],
      pct: (counts[level] / maxCount) * 100,
    }));
  }, [journalEntries]);

  // Current month vs last month average
  const { currentAvg, lastAvg } = useMemo(() => {
    const thisMonthStart = format(startOfMonth(now), "yyyy-MM-dd");
    const lastMonthStart = format(startOfMonth(subMonths(now, 1)), "yyyy-MM-dd");

    let curTotal = 0,
      curCount = 0,
      prevTotal = 0,
      prevCount = 0;
    for (const entry of journalEntries) {
      if (entry.mood == null) continue;
      if (entry.date >= thisMonthStart) {
        curTotal += entry.mood;
        curCount++;
      } else if (entry.date >= lastMonthStart && entry.date < thisMonthStart) {
        prevTotal += entry.mood;
        prevCount++;
      }
    }
    return {
      currentAvg: curCount > 0 ? curTotal / curCount : null,
      lastAvg: prevCount > 0 ? prevTotal / prevCount : null,
    };
  }, [journalEntries]);

  // SVG dimensions for line chart
  const lineW = 600;
  const lineH = 200;
  const linePadX = 40;
  const linePadY = 20;
  const chartW = lineW - linePadX * 2;
  const chartH = lineH - linePadY * 2;

  // Build polyline points for mood over time
  const polylinePoints = moodPoints
    .map((p) => {
      const dayIndex = last30Days.findIndex((d) => d.dateStr === p.dateStr);
      const x = linePadX + (dayIndex / 29) * chartW;
      const y = linePadY + chartH - ((p.mood - 1) / 4) * chartH;
      return `${x},${y}`;
    })
    .join(" ");

  // Bar chart dimensions
  const barW = 400;
  const barH = 180;
  const barPadX = 40;
  const barPadY = 20;
  const bChartW = barW - barPadX * 2;
  const bChartH = barH - barPadY * 2;
  const barWidth = bChartW / 7 - 8;
  const maxDayAvg = Math.max(...moodByDayOfWeek.map((d) => d.avg), 1);

  const diff =
    currentAvg != null && lastAvg != null ? currentAvg - lastAvg : null;

  return (
    <div className="space-y-6">
      {/* Current Average */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardDescription>This Month&apos;s Average</CardDescription>
            <CardTitle className="text-3xl">
              {currentAvg != null ? currentAvg.toFixed(1) : "--"}
              <span className="ml-1 text-lg">/ 5</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {diff != null ? (
              <div className="flex items-center gap-1 text-sm">
                {diff > 0.05 ? (
                  <TrendingUp className="size-4 text-green-500" />
                ) : diff < -0.05 ? (
                  <TrendingDown className="size-4 text-red-500" />
                ) : (
                  <Minus className="size-4 text-muted-foreground" />
                )}
                <span
                  className={
                    diff > 0.05
                      ? "text-green-500"
                      : diff < -0.05
                        ? "text-red-500"
                        : "text-muted-foreground"
                  }
                >
                  {diff > 0 ? "+" : ""}
                  {diff.toFixed(2)} vs last month
                </span>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Not enough data to compare
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Last Month&apos;s Average</CardDescription>
            <CardTitle className="text-3xl">
              {lastAvg != null ? lastAvg.toFixed(1) : "--"}
              <span className="ml-1 text-lg">/ 5</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {lastAvg != null
                ? MOOD_LABELS[Math.round(lastAvg)] ?? ""
                : "No entries"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Entries with Mood</CardDescription>
            <CardTitle className="text-3xl">
              {journalEntries.filter((e) => e.mood != null).length}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              out of {journalEntries.length} total entries
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Most Frequent Mood</CardDescription>
            <CardTitle className="text-3xl">
              {(() => {
                const best = moodDistribution.reduce(
                  (a, b) => (b.count > a.count ? b : a),
                  moodDistribution[0]
                );
                return best.count > 0
                  ? `${MOOD_EMOJI[best.level]} ${MOOD_LABELS[best.level]}`
                  : "--";
              })()}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {(() => {
                const best = moodDistribution.reduce(
                  (a, b) => (b.count > a.count ? b : a),
                  moodDistribution[0]
                );
                return best.count > 0 ? `${best.count} entries` : "No data";
              })()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Mood Over Time */}
      <Card>
        <CardHeader>
          <CardTitle>Mood Over Time</CardTitle>
          <CardDescription>Last 30 days</CardDescription>
        </CardHeader>
        <CardContent>
          {moodPoints.length > 0 ? (
            <div className="w-full overflow-x-auto">
              <svg
                viewBox={`0 0 ${lineW} ${lineH + 30}`}
                className="w-full min-w-[400px]"
                preserveAspectRatio="xMidYMid meet"
              >
                {/* Grid lines */}
                {[1, 2, 3, 4, 5].map((level) => {
                  const y =
                    linePadY + chartH - ((level - 1) / 4) * chartH;
                  return (
                    <g key={level}>
                      <line
                        x1={linePadX}
                        y1={y}
                        x2={linePadX + chartW}
                        y2={y}
                        stroke="currentColor"
                        strokeOpacity={0.1}
                      />
                      <text
                        x={linePadX - 8}
                        y={y + 4}
                        textAnchor="end"
                        className="fill-muted-foreground"
                        fontSize={11}
                      >
                        {level}
                      </text>
                    </g>
                  );
                })}

                {/* Gradient definition */}
                <defs>
                  <linearGradient
                    id="moodGradient"
                    x1="0"
                    y1="1"
                    x2="0"
                    y2="0"
                  >
                    <stop offset="0%" stopColor="#ef4444" />
                    <stop offset="25%" stopColor="#f97316" />
                    <stop offset="50%" stopColor="#eab308" />
                    <stop offset="75%" stopColor="#22c55e" />
                    <stop offset="100%" stopColor="#16a34a" />
                  </linearGradient>
                  <linearGradient
                    id="moodAreaGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="#22c55e" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>

                {/* Area fill */}
                {moodPoints.length > 1 && (
                  <path
                    d={(() => {
                      const pts = moodPoints.map((p) => {
                        const dayIndex = last30Days.findIndex(
                          (d) => d.dateStr === p.dateStr
                        );
                        const x = linePadX + (dayIndex / 29) * chartW;
                        const y =
                          linePadY + chartH - ((p.mood - 1) / 4) * chartH;
                        return { x, y };
                      });
                      const first = pts[0];
                      const last = pts[pts.length - 1];
                      let d = `M${first.x},${first.y}`;
                      for (let i = 1; i < pts.length; i++) {
                        d += ` L${pts[i].x},${pts[i].y}`;
                      }
                      d += ` L${last.x},${linePadY + chartH} L${first.x},${linePadY + chartH} Z`;
                      return d;
                    })()}
                    fill="url(#moodAreaGradient)"
                  />
                )}

                {/* Line */}
                {moodPoints.length > 1 && (
                  <polyline
                    points={polylinePoints}
                    fill="none"
                    stroke="url(#moodGradient)"
                    strokeWidth={2.5}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                )}

                {/* Data points */}
                {moodPoints.map((p) => {
                  const dayIndex = last30Days.findIndex(
                    (d) => d.dateStr === p.dateStr
                  );
                  const x = linePadX + (dayIndex / 29) * chartW;
                  const y =
                    linePadY + chartH - ((p.mood - 1) / 4) * chartH;
                  return (
                    <circle
                      key={p.dateStr}
                      cx={x}
                      cy={y}
                      r={3.5}
                      fill={moodColor(p.mood)}
                      stroke="white"
                      strokeWidth={1.5}
                    >
                      <title>
                        {format(p.date, "MMM d")}: {MOOD_LABELS[p.mood]} (
                        {p.mood}/5)
                      </title>
                    </circle>
                  );
                })}

                {/* X-axis date labels (every 5 days) */}
                {last30Days
                  .filter((_, i) => i % 5 === 0 || i === 29)
                  .map((d, i) => {
                    const dayIndex = last30Days.indexOf(d);
                    const x = linePadX + (dayIndex / 29) * chartW;
                    return (
                      <text
                        key={d.dateStr}
                        x={x}
                        y={lineH + 16}
                        textAnchor="middle"
                        className="fill-muted-foreground"
                        fontSize={10}
                      >
                        {format(d.date, "MMM d")}
                      </text>
                    );
                  })}
              </svg>
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No mood data in the last 30 days. Start journaling to see your
              mood trends!
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Mood by Day of Week */}
        <Card>
          <CardHeader>
            <CardTitle>Mood by Day of Week</CardTitle>
            <CardDescription>Average mood per weekday</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="w-full overflow-x-auto">
              <svg
                viewBox={`0 0 ${barW} ${barH + 30}`}
                className="w-full min-w-[300px]"
                preserveAspectRatio="xMidYMid meet"
              >
                {/* Grid lines */}
                {[1, 2, 3, 4, 5].map((level) => {
                  const y =
                    barPadY + bChartH - ((level - 1) / 4) * bChartH;
                  return (
                    <g key={level}>
                      <line
                        x1={barPadX}
                        y1={y}
                        x2={barPadX + bChartW}
                        y2={y}
                        stroke="currentColor"
                        strokeOpacity={0.07}
                      />
                      <text
                        x={barPadX - 8}
                        y={y + 4}
                        textAnchor="end"
                        className="fill-muted-foreground"
                        fontSize={10}
                      >
                        {level}
                      </text>
                    </g>
                  );
                })}

                {/* Reorder to Mon-Sun */}
                {[1, 2, 3, 4, 5, 6, 0].map((dayIdx, i) => {
                  const d = moodByDayOfWeek[dayIdx];
                  if (d.count === 0) return null;
                  const barX =
                    barPadX + (i / 7) * bChartW + (bChartW / 7 - barWidth) / 2;
                  const barHeight = (d.avg / 5) * bChartH;
                  const barY = barPadY + bChartH - barHeight;
                  const color = moodColor(Math.round(d.avg));
                  return (
                    <g key={dayIdx}>
                      <rect
                        x={barX}
                        y={barY}
                        width={barWidth}
                        height={barHeight}
                        rx={3}
                        fill={color}
                        opacity={0.8}
                      >
                        <title>
                          {d.day}: avg {d.avg.toFixed(1)} ({d.count} entries)
                        </title>
                      </rect>
                      <text
                        x={barX + barWidth / 2}
                        y={barY - 5}
                        textAnchor="middle"
                        className="fill-muted-foreground"
                        fontSize={9}
                      >
                        {d.avg.toFixed(1)}
                      </text>
                    </g>
                  );
                })}

                {/* Day labels */}
                {[1, 2, 3, 4, 5, 6, 0].map((dayIdx, i) => {
                  const d = moodByDayOfWeek[dayIdx];
                  const x = barPadX + (i / 7) * bChartW + bChartW / 7 / 2;
                  return (
                    <text
                      key={dayIdx}
                      x={x}
                      y={barH + 16}
                      textAnchor="middle"
                      className="fill-muted-foreground"
                      fontSize={11}
                    >
                      {d.day}
                    </text>
                  );
                })}
              </svg>
            </div>
          </CardContent>
        </Card>

        {/* Mood Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Mood Distribution</CardTitle>
            <CardDescription>How often you feel each way</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[5, 4, 3, 2, 1].map((level) => {
                const item = moodDistribution.find((d) => d.level === level)!;
                return (
                  <div key={level} className="flex items-center gap-3">
                    <span className="w-6 text-center text-lg">
                      {MOOD_EMOJI[level]}
                    </span>
                    <span className="w-12 text-sm text-muted-foreground">
                      {MOOD_LABELS[level]}
                    </span>
                    <div className="flex-1">
                      <div className="h-6 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${item.pct}%`,
                            backgroundColor: moodColor(level),
                            minWidth: item.count > 0 ? "8px" : "0px",
                          }}
                        />
                      </div>
                    </div>
                    <span className="w-8 text-right text-sm font-medium tabular-nums">
                      {item.count}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
