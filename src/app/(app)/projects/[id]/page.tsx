import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { KanbanBoard } from "@/components/projects/kanban-board";
import { ArrowLeft, FolderKanban } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .eq("user_id", user!.id)
    .single();

  if (!project) {
    notFound();
  }

  const { data: tasks } = await supabase
    .from("project_tasks")
    .select("*")
    .eq("project_id", id)
    .eq("user_id", user!.id)
    .order("order_index", { ascending: true });

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-hidden">
      <div className="flex items-center gap-3">
        <Link href="/projects">
          <Button variant="ghost" size="icon-sm">
            <ArrowLeft className="size-4" />
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          {project.color && (
            <div
              className="size-4 rounded-full"
              style={{ backgroundColor: project.color }}
            />
          )}
          <FolderKanban className="size-5 text-muted-foreground" />
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold">{project.name}</h1>
          {project.description && (
            <p className="truncate text-sm text-muted-foreground">
              {project.description}
            </p>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-x-auto">
        <KanbanBoard projectId={project.id} initialTasks={tasks ?? []} />
      </div>
    </div>
  );
}
