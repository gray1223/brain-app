"use client";

import { useRouter } from "next/navigation";
import { parseISO, format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";

interface JournalCalendarWrapperProps {
  entryDates: string[];
}

export function JournalCalendarWrapper({
  entryDates,
}: JournalCalendarWrapperProps) {
  const router = useRouter();
  const highlightedDays = entryDates.map((d) => parseISO(d));

  return (
    <div className="flex justify-center rounded-lg border p-4">
      <Calendar
        mode="single"
        modifiers={{ hasEntry: highlightedDays }}
        modifiersClassNames={{
          hasEntry:
            "bg-primary/20 text-primary font-semibold dark:bg-primary/30",
        }}
        onSelect={(date: Date | undefined) => {
          if (date) {
            router.push(`/journal/${format(date, "yyyy-MM-dd")}`);
          }
        }}
      />
    </div>
  );
}
