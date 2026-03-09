import { createClient } from "@/lib/supabase/server";
import { CalendarView } from "@/components/calendar/calendar-view";
import { CreateEventDialog } from "@/components/calendar/create-event-dialog";
import { SyncButton } from "@/components/calendar/sync-button";
import { CalendarDays } from "lucide-react";

export default async function CalendarPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  const startOfMonth = new Date(year, month, 1).toISOString();
  const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59).toISOString();

  const [eventsResult, todosResult] = await Promise.all([
    supabase
      .from("calendar_events")
      .select("*")
      .eq("user_id", user!.id)
      .gte("start_time", startOfMonth)
      .lte("start_time", endOfMonth)
      .order("start_time", { ascending: true }),
    supabase
      .from("todos")
      .select("*")
      .eq("user_id", user!.id)
      .not("due_date", "is", null)
      .gte("due_date", startOfMonth.split("T")[0])
      .lte("due_date", endOfMonth.split("T")[0])
      .is("deleted_at", null)
      .order("due_date", { ascending: true }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CalendarDays className="size-6 text-primary" />
          <h1 className="text-2xl font-semibold">Calendar</h1>
        </div>
        <div className="flex items-center gap-2">
          <SyncButton />
          <CreateEventDialog />
        </div>
      </div>

      <CalendarView
        initialEvents={eventsResult.data ?? []}
        initialTodos={todosResult.data ?? []}
        initialMonth={month}
        initialYear={year}
      />
    </div>
  );
}
