"use client";

import { useMemo, useState } from "react";
import { format, subDays, startOfDay } from "date-fns";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";

interface HeatmapProps {
  completions: { date: string; count: number }[];
  color: string;
  targetCount: number;
  days?: number;
}

function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return { r: 59, g: 130, b: 246 };
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
}

function getSquareColor(count: number, target: number, color: string) {
  if (count === 0) return "var(--muted)";
  const ratio = Math.min(count / target, 1);
  const { r, g, b } = hexToRgb(color);
  const opacity = 0.2 + ratio * 0.8;
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

export function HabitHeatmap({
  completions,
  color,
  targetCount,
  days = 90,
}: HeatmapProps) {
  const today = startOfDay(new Date());

  const completionMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of completions) {
      map.set(c.date, c.count);
    }
    return map;
  }, [completions]);

  const squares = useMemo(() => {
    const result = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = subDays(today, i);
      const dateStr = format(date, "yyyy-MM-dd");
      const count = completionMap.get(dateStr) || 0;
      result.push({ date, dateStr, count });
    }
    return result;
  }, [completionMap, days, today]);

  // Arrange into columns of 7 (weeks)
  const weeks = useMemo(() => {
    const result: (typeof squares)[] = [];
    for (let i = 0; i < squares.length; i += 7) {
      result.push(squares.slice(i, i + 7));
    }
    return result;
  }, [squares]);

  return (
    <TooltipProvider>
      <div className="flex gap-[3px]">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-[3px]">
            {week.map((sq) => (
              <Tooltip key={sq.dateStr}>
                <TooltipTrigger
                  render={
                    <div
                      className="size-[10px] rounded-[2px] transition-colors"
                      style={{
                        backgroundColor: getSquareColor(
                          sq.count,
                          targetCount,
                          color
                        ),
                      }}
                    />
                  }
                />
                <TooltipContent>
                  <span>
                    {format(sq.date, "MMM d, yyyy")} &mdash;{" "}
                    {sq.count === 0
                      ? "No completions"
                      : `${sq.count}/${targetCount}`}
                  </span>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        ))}
      </div>
    </TooltipProvider>
  );
}
