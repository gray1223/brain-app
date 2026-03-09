"use client";

import { useMemo } from "react";
import {
  format,
  startOfWeek,
  addDays,
  isSameDay,
  isToday,
  getHours,
  getMinutes,
  differenceInMinutes,
} from "date-fns";
import { Card } from "@/components/ui/card";
import type { CalendarEvent } from "@/types/database";
import type { Todo } from "@/types/database";

interface WeekViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  todos: Todo[];
  onEventClick: (event: CalendarEvent) => void;
  loading: boolean;
}

const HOUR_START = 6;
const HOUR_END = 23;
const HOUR_HEIGHT = 48; // px per hour

export function WeekView({
  currentDate,
  events,
  todos,
  onEventClick,
  loading,
}: WeekViewProps) {
  const weekStart = startOfWeek(currentDate);
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  const hours = useMemo(
    () => Array.from({ length: HOUR_END - HOUR_START + 1 }, (_, i) => HOUR_START + i),
    []
  );

  const getEventsForDay = (date: Date) =>
    events.filter((event) => isSameDay(new Date(event.start_time), date));

  const getAllDayEventsForDay = (date: Date) =>
    events.filter(
      (event) => event.all_day && isSameDay(new Date(event.start_time), date)
    );

  const getTimedEventsForDay = (date: Date) =>
    events.filter(
      (event) => !event.all_day && isSameDay(new Date(event.start_time), date)
    );

  const getTodosForDay = (date: Date) =>
    todos.filter(
      (todo) => todo.due_date && isSameDay(new Date(todo.due_date), date)
    );

  const getEventPosition = (event: CalendarEvent) => {
    const start = new Date(event.start_time);
    const end = new Date(event.end_time);
    const startHour = getHours(start) + getMinutes(start) / 60;
    const duration = differenceInMinutes(end, start) / 60;
    const top = (startHour - HOUR_START) * HOUR_HEIGHT;
    const height = Math.max(duration * HOUR_HEIGHT, 20);
    return { top, height };
  };

  return (
    <Card className={`overflow-hidden ${loading ? "opacity-60" : ""}`}>
      {/* Header row with day names */}
      <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b">
        <div className="border-r p-2" />
        {weekDays.map((day) => (
          <div
            key={day.toISOString()}
            className={`border-r p-2 text-center last:border-r-0 ${
              isToday(day) ? "bg-primary/5" : ""
            }`}
          >
            <div className="text-xs font-medium text-muted-foreground">
              {format(day, "EEE")}
            </div>
            <div
              className={`mt-0.5 inline-flex size-7 items-center justify-center rounded-full text-sm ${
                isToday(day)
                  ? "bg-primary text-primary-foreground font-medium"
                  : ""
              }`}
            >
              {format(day, "d")}
            </div>
          </div>
        ))}
      </div>

      {/* All-day events row */}
      {weekDays.some((day) => getAllDayEventsForDay(day).length > 0 || getTodosForDay(day).length > 0) && (
        <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b">
          <div className="border-r p-1 text-[10px] text-muted-foreground flex items-center justify-center">
            All day
          </div>
          {weekDays.map((day) => {
            const allDayEvents = getAllDayEventsForDay(day);
            const dayTodos = getTodosForDay(day);
            return (
              <div
                key={day.toISOString()}
                className="border-r p-1 last:border-r-0 min-h-[28px]"
              >
                {allDayEvents.map((event) => (
                  <button
                    key={event.id}
                    onClick={() => onEventClick(event)}
                    className="mb-0.5 w-full truncate rounded px-1 py-0.5 text-left text-[10px] leading-tight hover:opacity-80"
                    style={{
                      backgroundColor: event.color
                        ? `${event.color}20`
                        : "var(--color-primary-foreground)",
                      color: event.color || undefined,
                    }}
                  >
                    {event.title}
                  </button>
                ))}
                {dayTodos.map((todo) => (
                  <div
                    key={todo.id}
                    className="mb-0.5 flex items-center gap-1 truncate rounded bg-muted px-1 py-0.5 text-[10px] leading-tight text-muted-foreground"
                  >
                    <span className={`size-2.5 shrink-0 rounded-sm border ${todo.completed ? "bg-primary border-primary" : "border-muted-foreground/40"}`} />
                    <span className={todo.completed ? "line-through" : ""}>{todo.title}</span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {/* Time grid */}
      <div className="relative grid grid-cols-[60px_repeat(7,1fr)] overflow-y-auto max-h-[600px]">
        {/* Hour labels */}
        <div className="border-r">
          {hours.map((hour) => (
            <div
              key={hour}
              className="relative border-b text-right pr-2"
              style={{ height: `${HOUR_HEIGHT}px` }}
            >
              <span className="absolute -top-2 right-2 text-[10px] text-muted-foreground">
                {format(new Date(2000, 0, 1, hour), "h a")}
              </span>
            </div>
          ))}
        </div>

        {/* Day columns */}
        {weekDays.map((day) => {
          const timedEvents = getTimedEventsForDay(day);
          return (
            <div
              key={day.toISOString()}
              className={`relative border-r last:border-r-0 ${
                isToday(day) ? "bg-primary/[0.02]" : ""
              }`}
            >
              {/* Hour grid lines */}
              {hours.map((hour) => (
                <div
                  key={hour}
                  className="border-b"
                  style={{ height: `${HOUR_HEIGHT}px` }}
                />
              ))}

              {/* Events positioned absolutely */}
              {timedEvents.map((event) => {
                const { top, height } = getEventPosition(event);
                return (
                  <button
                    key={event.id}
                    onClick={() => onEventClick(event)}
                    className="absolute inset-x-0.5 overflow-hidden rounded px-1 py-0.5 text-left text-[10px] leading-tight hover:opacity-80 transition-opacity"
                    style={{
                      top: `${top}px`,
                      height: `${height}px`,
                      backgroundColor: event.color
                        ? `${event.color}25`
                        : "var(--color-primary-foreground)",
                      color: event.color || undefined,
                      borderLeft: `2px solid ${event.color || "var(--color-primary)"}`,
                    }}
                  >
                    <div className="font-medium truncate">{event.title}</div>
                    <div className="truncate opacity-75">
                      {format(new Date(event.start_time), "h:mm a")}
                    </div>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
