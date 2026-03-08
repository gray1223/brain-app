"use client";

import { useMemo, useState } from "react";
import { format, subDays, getDay, startOfWeek, addDays } from "date-fns";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Flame, Calendar, TrendingUp, Award } from "lucide-react";

interface Activity {
  date: string;
  type: string;
  count: number;
}

interface ActivityHeatmapProps {
  activities: Activity[];
}

const DAY_LABELS = ["Mon", "", "Wed", "", "Fri", "", ""];

function getColor(count: number, maxCount: number): string {
  if (count === 0) return "var(--color-muted)";
  const intensity = count / maxCount;
  if (intensity <= 0.25) return "#9be9a8";
  if (intensity <= 0.5) return "#40c463";
  if (intensity <= 0.75) return "#30a14e";
  return "#216e39";
}

export function ActivityHeatmap({ activities }: ActivityHeatmapProps) {
  const [hoveredDay, setHoveredDay] = useState<string | null>(null);

  const today = new Date();

  // Build a map of date -> total count
  const activityMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const a of activities) {
      map[a.date] = (map[a.date] ?? 0) + a.count;
    }
    return map;
  }, [activities]);

  // Build the grid of days (last 365 days aligned to weeks)
  const { weeks, months, maxCount } = useMemo(() => {
    // End at today, start 364 days ago (365 days total)
    const endDate = today;
    // Go back to the start of the week containing the start date
    const rawStart = subDays(endDate, 364);
    const start = startOfWeek(rawStart, { weekStartsOn: 0 }); // Sunday start

    const allDays: {
      date: Date;
      dateStr: string;
      count: number;
      dayOfWeek: number;
    }[] = [];

    let current = start;
    while (current <= endDate) {
      const dateStr = format(current, "yyyy-MM-dd");
      allDays.push({
        date: new Date(current),
        dateStr,
        count: activityMap[dateStr] ?? 0,
        dayOfWeek: getDay(current),
      });
      current = addDays(current, 1);
    }

    // Group into weeks (columns)
    const weeks: typeof allDays[] = [];
    let currentWeek: typeof allDays = [];
    for (const day of allDays) {
      if (day.dayOfWeek === 0 && currentWeek.length > 0) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
      currentWeek.push(day);
    }
    if (currentWeek.length > 0) {
      weeks.push(currentWeek);
    }

    // Month labels
    const months: { label: string; weekIndex: number }[] = [];
    let lastMonth = -1;
    for (let w = 0; w < weeks.length; w++) {
      const firstDay = weeks[w][0];
      const month = firstDay.date.getMonth();
      if (month !== lastMonth) {
        months.push({
          label: format(firstDay.date, "MMM"),
          weekIndex: w,
        });
        lastMonth = month;
      }
    }

    const maxCount = Math.max(
      ...allDays.map((d) => d.count),
      1
    );

    return { weeks, months, maxCount };
  }, [activityMap]);

  // Stats
  const stats = useMemo(() => {
    const allDates = Object.keys(activityMap).sort();
    const totalActivities = Object.values(activityMap).reduce(
      (a, b) => a + b,
      0
    );

    // Most active day
    let mostActiveDate = "";
    let mostActiveCount = 0;
    for (const [date, count] of Object.entries(activityMap)) {
      if (count > mostActiveCount) {
        mostActiveCount = count;
        mostActiveDate = date;
      }
    }

    // Current streak (consecutive days up to today with activity)
    let currentStreak = 0;
    let d = today;
    while (true) {
      const dateStr = format(d, "yyyy-MM-dd");
      if ((activityMap[dateStr] ?? 0) > 0) {
        currentStreak++;
        d = subDays(d, 1);
      } else {
        break;
      }
    }

    // Longest streak
    let longestStreak = 0;
    let streak = 0;
    // Check all days in last 365
    for (let i = 364; i >= 0; i--) {
      const dateStr = format(subDays(today, i), "yyyy-MM-dd");
      if ((activityMap[dateStr] ?? 0) > 0) {
        streak++;
        longestStreak = Math.max(longestStreak, streak);
      } else {
        streak = 0;
      }
    }

    return {
      totalActivities,
      mostActiveDate,
      mostActiveCount,
      currentStreak,
      longestStreak,
    };
  }, [activityMap]);

  const cellSize = 13;
  const cellGap = 3;
  const labelWidth = 32;
  const headerHeight = 20;
  const svgWidth = labelWidth + weeks.length * (cellSize + cellGap);
  const svgHeight = headerHeight + 7 * (cellSize + cellGap);

  // Tooltip info
  const tooltipInfo = useMemo(() => {
    if (!hoveredDay) return null;
    const count = activityMap[hoveredDay] ?? 0;
    const date = new Date(hoveredDay + "T00:00:00");
    return {
      text: `${count} ${count === 1 ? "activity" : "activities"} on ${format(date, "EEE, MMM d")}`,
    };
  }, [hoveredDay, activityMap]);

  // Legend levels
  const legendLevels = [0, 0.25, 0.5, 0.75, 1].map((intensity) => {
    if (intensity === 0) return { color: "var(--color-muted)", label: "0" };
    return {
      color: getColor(Math.ceil(intensity * maxCount), maxCount),
      label: "",
    };
  });

  return (
    <div className="space-y-6">
      {/* Summary stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardDescription>Total Activities</CardDescription>
            <CardTitle className="flex items-center gap-2 text-3xl">
              <TrendingUp className="size-5 text-muted-foreground" />
              {stats.totalActivities}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Most Active Day</CardDescription>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Award className="size-5 text-muted-foreground" />
              {stats.mostActiveDate
                ? format(
                    new Date(stats.mostActiveDate + "T00:00:00"),
                    "MMM d, yyyy"
                  )
                : "--"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {stats.mostActiveCount} activities
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Current Streak</CardDescription>
            <CardTitle className="flex items-center gap-2 text-3xl">
              <Flame className="size-5 text-orange-500" />
              {stats.currentStreak}
              <span className="text-base font-normal text-muted-foreground">
                days
              </span>
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Longest Streak</CardDescription>
            <CardTitle className="flex items-center gap-2 text-3xl">
              <Calendar className="size-5 text-muted-foreground" />
              {stats.longestStreak}
              <span className="text-base font-normal text-muted-foreground">
                days
              </span>
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Heatmap */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Heatmap</CardTitle>
          <CardDescription>
            Your activity over the last year
            {tooltipInfo && (
              <span className="ml-2 font-medium text-foreground">
                &mdash; {tooltipInfo.text}
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="w-full overflow-x-auto">
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight + 10}`}
              className="w-full min-w-[700px]"
              preserveAspectRatio="xMidYMid meet"
            >
              {/* Month labels */}
              {months.map((m) => (
                <text
                  key={`${m.label}-${m.weekIndex}`}
                  x={labelWidth + m.weekIndex * (cellSize + cellGap)}
                  y={12}
                  className="fill-muted-foreground"
                  fontSize={10}
                >
                  {m.label}
                </text>
              ))}

              {/* Day-of-week labels */}
              {DAY_LABELS.map((label, i) => {
                if (!label) return null;
                // Map display index to actual dayOfWeek (0=Sun, 1=Mon...)
                const dayOfWeek = (i + 1) % 7; // Mon=1, Wed=3, Fri=5
                return (
                  <text
                    key={label}
                    x={0}
                    y={headerHeight + dayOfWeek * (cellSize + cellGap) + cellSize - 2}
                    className="fill-muted-foreground"
                    fontSize={10}
                  >
                    {label}
                  </text>
                );
              })}

              {/* Day cells */}
              {weeks.map((week, wi) =>
                week.map((day) => {
                  const x = labelWidth + wi * (cellSize + cellGap);
                  const y =
                    headerHeight + day.dayOfWeek * (cellSize + cellGap);
                  const todayStr = format(today, "yyyy-MM-dd");
                  const isFuture = day.dateStr > todayStr;

                  if (isFuture) return null;

                  return (
                    <rect
                      key={day.dateStr}
                      x={x}
                      y={y}
                      width={cellSize}
                      height={cellSize}
                      rx={2}
                      fill={getColor(day.count, maxCount)}
                      stroke={
                        hoveredDay === day.dateStr
                          ? "currentColor"
                          : "transparent"
                      }
                      strokeWidth={1}
                      opacity={hoveredDay === day.dateStr ? 1 : 0.9}
                      className="cursor-pointer"
                      onMouseEnter={() => setHoveredDay(day.dateStr)}
                      onMouseLeave={() => setHoveredDay(null)}
                    >
                      <title>
                        {day.count}{" "}
                        {day.count === 1 ? "activity" : "activities"} on{" "}
                        {format(day.date, "EEE, MMM d")}
                      </title>
                    </rect>
                  );
                })
              )}
            </svg>
          </div>

          {/* Legend */}
          <div className="mt-4 flex items-center justify-end gap-1.5 text-xs text-muted-foreground">
            <span>Less</span>
            {legendLevels.map((l, i) => (
              <div
                key={i}
                className="size-3 rounded-sm"
                style={{ backgroundColor: l.color }}
              />
            ))}
            <span>More</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
