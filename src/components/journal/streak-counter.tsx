"use client";

import { Flame } from "lucide-react";
import {
  parseISO,
  differenceInCalendarDays,
  startOfToday,
  isEqual,
  subDays,
} from "date-fns";

interface StreakCounterProps {
  entries: string[]; // array of YYYY-MM-DD date strings
}

function calculateStreak(dates: string[]): number {
  if (dates.length === 0) return 0;

  const sorted = dates
    .map((d) => parseISO(d))
    .sort((a, b) => b.getTime() - a.getTime());

  const today = startOfToday();
  const mostRecent = sorted[0];

  // Streak must include today or yesterday to be active
  const daysSinceLast = differenceInCalendarDays(today, mostRecent);
  if (daysSinceLast > 1) return 0;

  let streak = 1;
  for (let i = 1; i < sorted.length; i++) {
    const diff = differenceInCalendarDays(sorted[i - 1], sorted[i]);
    if (diff === 1) {
      streak++;
    } else if (diff === 0) {
      // duplicate date, skip
      continue;
    } else {
      break;
    }
  }

  return streak;
}

export function StreakCounter({ entries }: StreakCounterProps) {
  const streak = calculateStreak(entries);

  return (
    <div className="flex items-center gap-1.5">
      <Flame
        className={`size-5 ${
          streak > 0
            ? "text-orange-500 fill-orange-500"
            : "text-muted-foreground"
        }`}
      />
      <span className="text-sm font-semibold tabular-nums">{streak}</span>
      <span className="text-sm text-muted-foreground">
        day{streak !== 1 ? "s" : ""} streak
      </span>
    </div>
  );
}
