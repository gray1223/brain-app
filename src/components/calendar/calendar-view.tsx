"use client";

import { useState, useCallback } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isToday,
} from "date-fns";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { CalendarEvent } from "@/types/database";

interface CalendarViewProps {
  initialEvents: CalendarEvent[];
  initialMonth: number;
  initialYear: number;
}

export function CalendarView({
  initialEvents,
  initialMonth,
  initialYear,
}: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(
    new Date(initialYear, initialMonth, 1)
  );
  const [events, setEvents] = useState<CalendarEvent[]>(initialEvents);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchEvents = useCallback(async (date: Date) => {
    setLoading(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const start = startOfMonth(date).toISOString();
    const end = endOfMonth(date).toISOString();

    const { data } = await supabase
      .from("calendar_events")
      .select("*")
      .eq("user_id", user.id)
      .gte("start_time", start)
      .lte("start_time", end)
      .order("start_time", { ascending: true });

    if (data) setEvents(data);
    setLoading(false);
  }, []);

  const goToPrevMonth = () => {
    const prev = subMonths(currentDate, 1);
    setCurrentDate(prev);
    fetchEvents(prev);
  };

  const goToNextMonth = () => {
    const next = addMonths(currentDate, 1);
    setCurrentDate(next);
    fetchEvents(next);
  };

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);

  const days: Date[] = [];
  let day = calendarStart;
  while (day <= calendarEnd) {
    days.push(day);
    day = addDays(day, 1);
  }

  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  const getEventsForDay = (date: Date) =>
    events.filter((event) => isSameDay(new Date(event.start_time), date));

  const selectedDayEvents = selectedDay ? getEventsForDay(selectedDay) : [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">
          {format(currentDate, "MMMM yyyy")}
        </h2>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon-sm" onClick={goToPrevMonth}>
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const now = new Date();
              setCurrentDate(new Date(now.getFullYear(), now.getMonth(), 1));
              fetchEvents(now);
            }}
          >
            Today
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={goToNextMonth}>
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      <Card className={`overflow-hidden ${loading ? "opacity-60" : ""}`}>
        <div className="grid grid-cols-7 border-b">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div
              key={d}
              className="p-2 text-center text-xs font-medium text-muted-foreground"
            >
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {weeks.map((week, wi) =>
            week.map((d, di) => {
              const dayEvents = getEventsForDay(d);
              const isSelected = selectedDay && isSameDay(d, selectedDay);
              return (
                <button
                  key={`${wi}-${di}`}
                  onClick={() => setSelectedDay(d)}
                  className={`min-h-24 border-b border-r p-1.5 text-left transition-colors hover:bg-muted/50 ${
                    !isSameMonth(d, currentDate) ? "text-muted-foreground/40" : ""
                  } ${isSelected ? "bg-muted" : ""} ${
                    isToday(d) ? "bg-primary/5" : ""
                  }`}
                >
                  <span
                    className={`inline-flex size-6 items-center justify-center rounded-full text-xs ${
                      isToday(d)
                        ? "bg-primary text-primary-foreground font-medium"
                        : ""
                    }`}
                  >
                    {format(d, "d")}
                  </span>
                  <div className="mt-1 flex flex-col gap-0.5">
                    {dayEvents.slice(0, 3).map((event) => (
                      <div
                        key={event.id}
                        className="truncate rounded px-1 py-0.5 text-[10px] leading-tight"
                        style={{
                          backgroundColor: event.color
                            ? `${event.color}20`
                            : "var(--color-primary-foreground)",
                          color: event.color || undefined,
                        }}
                      >
                        {event.title}
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <span className="text-[10px] text-muted-foreground">
                        +{dayEvents.length - 3} more
                      </span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </Card>

      {selectedDay && (
        <Card className="p-4">
          <h3 className="mb-3 font-medium">
            {format(selectedDay, "EEEE, MMMM d, yyyy")}
          </h3>
          {selectedDayEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No events on this day.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {selectedDayEvents.map((event) => (
                <div
                  key={event.id}
                  className="flex items-start gap-3 rounded-lg border p-3"
                >
                  <div
                    className="mt-0.5 size-3 shrink-0 rounded-full"
                    style={{
                      backgroundColor: event.color || "var(--color-primary)",
                    }}
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{event.title}</p>
                    {event.description && (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {event.description}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {event.all_day
                        ? "All day"
                        : `${format(new Date(event.start_time), "h:mm a")} - ${format(new Date(event.end_time), "h:mm a")}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
