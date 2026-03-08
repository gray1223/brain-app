import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { EisenhowerMatrix } from "@/components/matrix/eisenhower-matrix";
import type { Todo } from "@/types/database";

export default async function MatrixPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: todos } = await supabase
    .from("todos")
    .select("*")
    .eq("completed", false)
    .order("order_index", { ascending: true })
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Eisenhower Matrix
        </h1>
        <p className="text-sm text-muted-foreground">
          Prioritize by urgency and importance
        </p>
      </div>

      <EisenhowerMatrix todos={(todos as Todo[]) || []} />
    </div>
  );
}
