import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { TodoItem } from "@/components/todos/todo-item";
import { CreateTodoDialog } from "@/components/todos/create-todo-dialog";
import { CreateListDialog } from "@/components/todos/create-list-dialog";
import {
  CheckSquare,
  CalendarDays,
  CalendarClock,
  CheckCircle2,
} from "lucide-react";
import { isToday, isFuture, isPast, parseISO } from "date-fns";
import type { Todo, TodoList } from "@/types/database";

export default async function TodosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const [{ data: todoLists }, { data: todos }] = await Promise.all([
    supabase
      .from("todo_lists")
      .select("*")
      .order("created_at", { ascending: true }),
    supabase
      .from("todos")
      .select("*")
      .order("order_index", { ascending: true })
      .order("created_at", { ascending: false }),
  ]);

  const allTodos = (todos as Todo[]) || [];
  const lists = (todoLists as TodoList[]) || [];

  const incompleteTodos = allTodos.filter((t) => !t.completed);
  const completedTodos = allTodos.filter((t) => t.completed);

  const todayTodos = incompleteTodos.filter(
    (t) => t.due_date && isToday(parseISO(t.due_date))
  );

  const upcomingTodos = incompleteTodos.filter(
    (t) => t.due_date && isFuture(parseISO(t.due_date)) && !isToday(parseISO(t.due_date))
  );

  function groupByList(items: Todo[]) {
    const groups: Record<string, { list: TodoList | null; todos: Todo[] }> = {};

    const unassigned: Todo[] = [];

    for (const todo of items) {
      if (todo.list_id) {
        if (!groups[todo.list_id]) {
          const list = lists.find((l) => l.id === todo.list_id) || null;
          groups[todo.list_id] = { list, todos: [] };
        }
        groups[todo.list_id].todos.push(todo);
      } else {
        unassigned.push(todo);
      }
    }

    return { groups, unassigned };
  }

  function renderTodoGroup(items: Todo[]) {
    const { groups, unassigned } = groupByList(items);

    if (items.length === 0) {
      return (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No todos to show.
        </p>
      );
    }

    return (
      <div className="space-y-6">
        {Object.values(groups).map(({ list, todos: groupTodos }) => (
          <div key={list?.id ?? "unknown"}>
            <div className="mb-2 flex items-center gap-2">
              {list?.color && (
                <span
                  className="inline-block size-2.5 rounded-full"
                  style={{ backgroundColor: list.color }}
                />
              )}
              <h3 className="text-sm font-medium">{list?.name ?? "List"}</h3>
              <Badge variant="secondary">{groupTodos.length}</Badge>
            </div>
            <div className="space-y-1">
              {groupTodos.map((todo) => (
                <TodoItem key={todo.id} todo={todo} />
              ))}
            </div>
          </div>
        ))}
        {unassigned.length > 0 && (
          <div>
            <div className="mb-2 flex items-center gap-2">
              <h3 className="text-sm font-medium text-muted-foreground">
                No list
              </h3>
              <Badge variant="secondary">{unassigned.length}</Badge>
            </div>
            <div className="space-y-1">
              {unassigned.map((todo) => (
                <TodoItem key={todo.id} todo={todo} />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Todos</h1>
          <p className="text-sm text-muted-foreground">
            {incompleteTodos.length} remaining &middot;{" "}
            {completedTodos.length} completed
          </p>
        </div>
        <div className="flex items-center gap-2">
          <CreateListDialog />
          <CreateTodoDialog lists={lists} />
        </div>
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">
            <CheckSquare className="size-3.5" />
            All
          </TabsTrigger>
          <TabsTrigger value="today">
            <CalendarDays className="size-3.5" />
            Today
          </TabsTrigger>
          <TabsTrigger value="upcoming">
            <CalendarClock className="size-3.5" />
            Upcoming
          </TabsTrigger>
          <TabsTrigger value="completed">
            <CheckCircle2 className="size-3.5" />
            Completed
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          {renderTodoGroup(incompleteTodos)}
        </TabsContent>

        <TabsContent value="today">
          {renderTodoGroup(todayTodos)}
        </TabsContent>

        <TabsContent value="upcoming">
          {renderTodoGroup(upcomingTodos)}
        </TabsContent>

        <TabsContent value="completed">
          {renderTodoGroup(completedTodos)}
        </TabsContent>
      </Tabs>
    </div>
  );
}
