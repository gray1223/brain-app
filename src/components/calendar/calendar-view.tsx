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
  addWeeks,
  subWeeks,
  isSameMonth,
  isSameDay,
  isToday,
} from "date-fns";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { EditEventDialog } from "@/components/calendar/edit-event-dialog";
import { WeekView } from "@/components/calendar/week-view";
import { AgendaView } from "@/components/calendar/agenda-view";
import type { CalendarEvent, Todo } from "@/types/database";

type ViewMode = "month" | "week" | "agenda";

interface CalendarViewProps {
  initialEvents: CalendarEvent[];
  initialTodos: Todo[];
  initialMonth: number;
  initialYear: number;
}

export function CalendarView({
  initialEvents,
  initialTodos,
  initialMonth,
  initialYear,
}: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(
    new Date(initialYear, initialMonth, 1)
  );
  const [events, setEvents] = useState<CalendarEvent[]>(initialEvents);
  const [todos, setTodos] = useState<Todo[]>(initialTodos);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);

  const fetchData = useCallback(async (date: Date, view: ViewMode) => {
    setLoading(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    let start: string;
    let end: string;

    if (view === "agenda") {
      start = new Date().toISOString();
      end = addDays(new Date(), 30).toISOString();
    } else if (view === "week") {
      start = startOfWeek(date).toISOString();
      end = endOfWeek(date).toISOString();
    } else {
      start = startOfMonth(date).toISOString();
      end = endOfMonth(date).toISOString();
    }

    const [eventsResult, todosResult] = await Promise.all([
      supabase
        .from("calendar_events")
        .select("*")
        .eq("user_id", user.id)
        .gte("start_time", start)
        .lte("start_time", end)
        .order("start_time", { ascending: true }),
      supabase
        .from("todos")
        .select("*")
        .eq("user_id", user.id)
        .not("due_date", "is", null)
        .gte("due_date", start.split("T")[0])
        .lte("due_date", end.split("T")[0])
        .is("deleted_at", null)
        .order("due_date", { ascending: true }),
    ]);

    if (eventsResult.data) setEvents(eventsResult.data);
    if (todosResult.data) setTodos(todosResult.data);
    setLoading(false);
  }, []);

  const handleViewChange = (view: ViewMode) => {
    setViewMode(view);
    fetchData(currentDate, view);
  };

  const goToPrev = () => {
    const prev =
      viewMode === "week"
        ? subWeeks(currentDate, 1)
        : subMonths(currentDate, 1);
    setCurrentDate(prev);
    fetchData(prev, viewMode);
  };

  const goToNext = () => {
    const next =
      viewMode === "week"
        ? addWeeks(currentDate, 1)
        : addMonths(currentDate, 1);
    setCurrentDate(next);
    fetchData(next, viewMode);
  };

  const goToToday = () => {
    const now = new Date();
    setCurrentDate(new Date(now.getFullYear(), now.getMonth(), 1));
    fetchData(now, viewMode);
  };

  const handleEventClick = (event: CalendarEvent) => {
    setEditingEvent(event);
  };

  const handleEventUpdated = () => {
    fetchData(currentDate, viewMode);
  };

  // Month view calculations
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

  const getTodosForDay = (date: Date) =>
    todos.filter(
      (todo) => todo.due_date && isSameDay(new Date(todo.due_date), date)
    );

  const selectedDayEvents = selectedDay ? getEventsForDay(selectedDay) : [];
  const selectedDayTodos = selectedDay ? getTodosForDay(selectedDay) : [];

  const getHeaderLabel = () => {
    if (viewMode === "week") {
      const ws = startOfWeek(currentDate);
      const we = endOfWeek(currentDate);
      if (ws.getMonth() === we.getMonth()) {
        return `${format(ws, "MMM d")} - ${format(we, "d, yyyy")}`;
      }
      return `${format(ws, "MMM d")} - ${format(we, "MMM d, yyyy")}`;
    }
    return format(currentDate, "MMMM yyyy");
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">{getHeaderLabel()}</h2>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center rounded-lg bg-muted p-0.5">
            {(["month", "week", "agenda"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => handleViewChange(mode)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  viewMode === mode
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>

          {/* Navigation (hidden in agenda view) */}
          {viewMode !== "agenda" && (
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={goToPrev}>
                <ChevronLeft className="size-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={goToToday}>
                Today
              </Button>
              <Button variant="ghost" size="icon" onClick={goToNext}>
                <ChevronRight className="size-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Month View */}
      {viewMode === "month" && (
        <>
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
                  const dayTodos = getTodosForDay(d);
                  const isSelected = selectedDay && isSameDay(d, selectedDay);
                  return (
                    <button
                      key={`${wi}-${di}`}
                      onClick={() => setSelectedDay(d)}
                      className={`min-h-24 border-b border-r p-1.5 text-left transition-colors hover:bg-muted/50 ${
                        !isSameMonth(d, currentDate)
                          ? "text-muted-foreground/40"
                          : ""
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
                        {dayEvents.slice(0, 2).map((event) => (
                          <div
                            key={event.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEventClick(event);
                            }}
                            className="truncate rounded px-1 py-0.5 text-[10px] leading-tight cursor-pointer hover:opacity-80"
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
                        {dayTodos.slice(0, 2).map((todo) => (
                          <div
                            key={todo.id}
                            className="flex items-center gap-1 truncate rounded bg-muted px-1 py-0.5 text-[10px] leading-tight text-muted-foreground"
                          >
                            <span
                              className={`size-2 shrink-0 rounded-sm border ${
                                todo.completed
                                  ? "bg-primary border-primary"
                                  : "border-muted-foreground/40"
                              }`}
                            />
                            <span
                              className={
                                todo.completed ? "line-through" : ""
                              }
                            >
                              {todo.title}
                            </span>
                          </div>
                        ))}
                        {dayEvents.length + dayTodos.length > 4 && (
                          <span className="text-[10px] text-muted-foreground">
                            +{dayEvents.length + dayTodos.length - 4} more
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
              {selectedDayEvents.length === 0 &&
              selectedDayTodos.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No events or todos on this day.
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {selectedDayEvents.map((event) => (
                    <button
                      key={event.id}
                      onClick={() => handleEventClick(event)}
                      className="flex items-start gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-muted/50"
                    >
                      <div
                        className="mt-0.5 size-3 shrink-0 rounded-full"
                        style={{
                          backgroundColor:
                            event.color || "var(--color-primary)",
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
                    </button>
                  ))}

                  {selectedDayTodos.length > 0 && (
                    <>
                      {selectedDayEvents.length > 0 && (
                        <div className="my-1 border-t" />
                      )}
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Todos
                      </p>
                      {selectedDayTodos.map((todo) => (
                        <div
                          key={todo.id}
                          className="flex items-center gap-3 rounded-lg border p-3"
                        >
                          <span
                            className={`size-3.5 shrink-0 rounded border-2 ${
                              todo.completed
                                ? "bg-primary border-primary"
                                : "border-muted-foreground/40"
                            }`}
                          />
                          <div className="flex-1">
                            <p
                              className={`text-sm ${
                                todo.completed
                                  ? "line-through text-muted-foreground"
                                  : ""
                              }`}
                            >
                              {todo.title}
                            </p>
                            {todo.description && (
                              <p className="mt-0.5 text-xs text-muted-foreground">
                                {todo.description}
                              </p>
                            )}
                          </div>
                          {todo.priority !== "medium" && (
                            <span
                              className={`text-[10px] font-medium uppercase ${
                                todo.priority === "urgent"
                                  ? "text-red-500"
                                  : todo.priority === "high"
                                    ? "text-orange-500"
                                    : "text-muted-foreground"
                              }`}
                            >
                              {todo.priority}
                            </span>
                          )}
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}
            </Card>
          )}
        </>
      )}

      {/* Week View */}
      {viewMode === "week" && (
        <WeekView
          currentDate={currentDate}
          events={events}
          todos={todos}
          onEventClick={handleEventClick}
          loading={loading}
        />
      )}

      {/* Agenda View */}
      {viewMode === "agenda" && (
        <AgendaView
          events={events}
          todos={todos}
          onEventClick={handleEventClick}
          loading={loading}
        />
      )}

      {/* Edit Event Dialog */}
      {editingEvent && (
        <EditEventDialog
          event={editingEvent}
          open={!!editingEvent}
          onOpenChange={(open) => {
            if (!open) setEditingEvent(null);
          }}
          onEventUpdated={handleEventUpdated}
        />
      )}
    </div>
  );
}
