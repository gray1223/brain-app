"use client";

import { useMemo } from "react";
import { format, addDays, isSameDay, isToday, isTomorrow } from "date-fns";
import { Card } from "@/components/ui/card";
import type { CalendarEvent } from "@/types/database";
import type { Todo } from "@/types/database";

interface AgendaViewProps {
  events: CalendarEvent[];
  todos: Todo[];
  onEventClick: (event: CalendarEvent) => void;
  loading: boolean;
}

export function AgendaView({
  events,
  todos,
  onEventClick,
  loading,
}: AgendaViewProps) {
  const today = useMemo(() => new Date(), []);

  // Generate next 30 days
  const days = useMemo(
    () => Array.from({ length: 30 }, (_, i) => addDays(today, i)),
    [today]
  );

  const getEventsForDay = (date: Date) =>
    events
      .filter((event) => isSameDay(new Date(event.start_time), date))
      .sort(
        (a, b) =>
          new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
      );

  const getTodosForDay = (date: Date) =>
    todos.filter(
      (todo) => todo.due_date && isSameDay(new Date(todo.due_date), date)
    );

  const daysWithContent = days.filter(
    (day) => getEventsForDay(day).length > 0 || getTodosForDay(day).length > 0
  );

  const formatDayLabel = (date: Date) => {
    if (isToday(date)) return "Today";
    if (isTomorrow(date)) return "Tomorrow";
    return format(date, "EEEE");
  };

  return (
    <div className={`flex flex-col gap-3 ${loading ? "opacity-60" : ""}`}>
      {daysWithContent.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">
            No events or todos in the next 30 days.
          </p>
        </Card>
      ) : (
        daysWithContent.map((day) => {
          const dayEvents = getEventsForDay(day);
          const dayTodos = getTodosForDay(day);

          return (
            <div key={day.toISOString()} className="flex gap-4">
              {/* Date column */}
              <div className="w-20 shrink-0 pt-3 text-right">
                <div
                  className={`text-sm font-medium ${
                    isToday(day) ? "text-primary" : ""
                  }`}
                >
                  {formatDayLabel(day)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {format(day, "MMM d")}
                </div>
              </div>

              {/* Events column */}
              <Card className="flex-1 p-3">
                <div className="flex flex-col gap-2">
                  {dayEvents.map((event) => (
                    <button
                      key={event.id}
                      onClick={() => onEventClick(event)}
                      className="flex items-start gap-3 rounded-lg p-2 text-left transition-colors hover:bg-muted/50"
                    >
                      <div
                        className="mt-1 size-3 shrink-0 rounded-full"
                        style={{
                          backgroundColor:
                            event.color || "var(--color-primary)",
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {event.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {event.all_day
                            ? "All day"
                            : `${format(new Date(event.start_time), "h:mm a")} - ${format(new Date(event.end_time), "h:mm a")}`}
                        </p>
                        {event.description && (
                          <p className="mt-0.5 text-xs text-muted-foreground truncate">
                            {event.description}
                          </p>
                        )}
                      </div>
                    </button>
                  ))}

                  {dayTodos.map((todo) => (
                    <div
                      key={todo.id}
                      className="flex items-center gap-3 rounded-lg p-2"
                    >
                      <span
                        className={`size-3.5 shrink-0 rounded border-2 ${
                          todo.completed
                            ? "bg-primary border-primary"
                            : "border-muted-foreground/40"
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm ${
                            todo.completed
                              ? "line-through text-muted-foreground"
                              : ""
                          }`}
                        >
                          {todo.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Todo
                          {todo.priority !== "medium" &&
                            ` \u00b7 ${todo.priority}`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          );
        })
      )}
    </div>
  );
}
