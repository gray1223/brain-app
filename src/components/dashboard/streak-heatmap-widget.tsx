"use client";

import { useMemo, useState, useEffect } from "react";
import { format, subDays, startOfWeek, addDays, getDay } from "date-fns";
import { WidgetCard } from "@/components/life/widget-card";
import { Flame } from "lucide-react";

interface StreakHeatmapWidgetProps {
  activityMap: Record<string, number>;
  currentStreak: number;
}

function getColor(count: number, maxCount: number, isDark: boolean): string {
  if (count === 0) return isDark ? "oklch(0.25 0 0)" : "oklch(0.93 0 0)";
  const intensity = count / maxCount;
  if (intensity <= 0.25) return "#9be9a8";
  if (intensity <= 0.5) return "#40c463";
  if (intensity <= 0.75) return "#30a14e";
  return "#216e39";
}

export function StreakHeatmapWidget({ activityMap, currentStreak }: StreakHeatmapWidgetProps) {
  const [hoveredDay, setHoveredDay] = useState<string | null>(null);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const html = document.documentElement;
    setIsDark(html.classList.contains("dark"));
    const obs = new MutationObserver(() => {
      setIsDark(html.classList.contains("dark"));
    });
    obs.observe(html, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  const today = new Date();
  const todayStr = format(today, "yyyy-MM-dd");

  const { weeks, maxCount } = useMemo(() => {
    const endDate = today;
    const rawStart = subDays(endDate, 90);
    const start = startOfWeek(rawStart, { weekStartsOn: 0 });

    const allDays: { dateStr: string; count: number; dayOfWeek: number }[] = [];
    let current = start;
    while (current <= endDate) {
      const dateStr = format(current, "yyyy-MM-dd");
      allDays.push({
        dateStr,
        count: activityMap[dateStr] ?? 0,
        dayOfWeek: getDay(current),
      });
      current = addDays(current, 1);
    }

    const weeks: typeof allDays[] = [];
    let currentWeek: typeof allDays = [];
    for (const day of allDays) {
      if (day.dayOfWeek === 0 && currentWeek.length > 0) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
      currentWeek.push(day);
    }
    if (currentWeek.length > 0) weeks.push(currentWeek);

    const maxCount = Math.max(...allDays.map((d) => d.count), 1);
    return { weeks, maxCount };
  }, [activityMap]);

  const tooltipInfo = useMemo(() => {
    if (!hoveredDay) return null;
    const count = activityMap[hoveredDay] ?? 0;
    const date = new Date(hoveredDay + "T00:00:00");
    return `${count} ${count === 1 ? "activity" : "activities"} on ${format(date, "MMM d")}`;
  }, [hoveredDay, activityMap]);

  const cellSize = 10;
  const cellGap = 2;
  const svgWidth = weeks.length * (cellSize + cellGap);
  const svgHeight = 7 * (cellSize + cellGap);

  return (
    <WidgetCard title="Activity" icon={Flame} href="/insights">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Flame
            className={`size-5 ${currentStreak > 0 ? "text-orange-500" : "text-muted-foreground"}`}
          />
          <span className="text-lg font-bold tabular-nums">{currentStreak}</span>
          <span className="text-xs text-muted-foreground">day streak</span>
        </div>

        <div className="w-full overflow-x-auto">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full"
            preserveAspectRatio="xMaxYMid meet"
          >
            {weeks.map((week, wi) =>
              week.map((day) => {
                const x = wi * (cellSize + cellGap);
                const y = day.dayOfWeek * (cellSize + cellGap);
                if (day.dateStr > todayStr) return null;
                return (
                  <rect
                    key={day.dateStr}
                    x={x}
                    y={y}
                    width={cellSize}
                    height={cellSize}
                    rx={2}
                    fill={getColor(day.count, maxCount, isDark)}
                    opacity={hoveredDay === day.dateStr ? 1 : 0.9}
                    onMouseEnter={() => setHoveredDay(day.dateStr)}
                    onMouseLeave={() => setHoveredDay(null)}
                  >
                    <title>
                      {day.count} {day.count === 1 ? "activity" : "activities"} on{" "}
                      {format(new Date(day.dateStr + "T00:00:00"), "MMM d")}
                    </title>
                  </rect>
                );
              })
            )}
          </svg>
        </div>

        {tooltipInfo && (
          <p className="text-xs text-muted-foreground">{tooltipInfo}</p>
        )}
      </div>
    </WidgetCard>
  );
}
