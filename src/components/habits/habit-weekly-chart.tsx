"use client";

import { useMemo } from "react";
import { format, subWeeks, startOfWeek, endOfWeek, isWithinInterval, parseISO } from "date-fns";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";

interface WeeklyChartProps {
  completions: { date: string; count: number }[];
  color: string;
  targetCount: number;
  weeks?: number;
}

export function HabitWeeklyChart({
  completions,
  color,
  targetCount,
  weeks = 8,
}: WeeklyChartProps) {
  const weekData = useMemo(() => {
    const today = new Date();
    const result: { label: string; count: number; total: number }[] = [];

    for (let i = weeks - 1; i >= 0; i--) {
      const weekStart = startOfWeek(subWeeks(today, i), { weekStartsOn: 1 });
      const weekEnd = endOfWeek(subWeeks(today, i), { weekStartsOn: 1 });
      const label = format(weekStart, "MMM d");

      let completedDays = 0;
      let totalDays = i === 0 ? today.getDay() || 7 : 7; // current week = days so far

      for (const c of completions) {
        const d = parseISO(c.date);
        if (isWithinInterval(d, { start: weekStart, end: weekEnd }) && c.count >= targetCount) {
          completedDays++;
        }
      }

      result.push({ label, count: completedDays, total: totalDays });
    }
    return result;
  }, [completions, targetCount, weeks]);

  const maxCount = Math.max(...weekData.map((w) => w.total), 1);
  const barMaxHeight = 48;

  return (
    <TooltipProvider>
      <div className="flex items-end gap-1.5" style={{ height: barMaxHeight + 20 }}>
        {weekData.map((week, i) => {
          const barHeight = Math.max((week.count / maxCount) * barMaxHeight, 2);
          return (
            <Tooltip key={i}>
              <TooltipTrigger
                render={
                  <div className="flex flex-col items-center gap-1 flex-1">
                    <div
                      className="w-full rounded-sm min-w-[14px] transition-all"
                      style={{
                        height: barHeight,
                        backgroundColor: week.count > 0 ? color : "var(--muted)",
                        opacity: week.count > 0 ? 0.4 + (week.count / week.total) * 0.6 : 1,
                      }}
                    />
                    <span className="text-[9px] text-muted-foreground leading-none whitespace-nowrap">
                      {week.label}
                    </span>
                  </div>
                }
              />
              <TooltipContent>
                <span>
                  {week.label}: {week.count}/{week.total} days
                </span>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
