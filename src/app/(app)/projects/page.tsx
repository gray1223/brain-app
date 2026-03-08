import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreateProjectDialog } from "@/components/projects/create-project-dialog";
import { FolderKanban } from "lucide-react";
import Link from "next/link";
import type { Project } from "@/types/database";

const STATUS_VARIANT: Record<Project["status"], "default" | "secondary" | "outline" | "destructive"> = {
  planning: "outline",
  active: "default",
  paused: "secondary",
  completed: "default",
  archived: "secondary",
};

const STATUS_LABEL: Record<Project["status"], string> = {
  planning: "Planning",
  active: "Active",
  paused: "Paused",
  completed: "Completed",
  archived: "Archived",
};

export default async function ProjectsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: projects } = await supabase
    .from("projects")
    .select("*, project_tasks(count)")
    .eq("user_id", user!.id)
    .order("updated_at", { ascending: false });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FolderKanban className="size-6 text-primary" />
          <h1 className="text-2xl font-semibold">Projects</h1>
        </div>
        <CreateProjectDialog />
      </div>

      {(!projects || projects.length === 0) ? (
        <Card className="flex flex-col items-center justify-center p-12 text-center">
          <FolderKanban className="mb-3 size-12 text-muted-foreground/40" />
          <p className="text-muted-foreground">No projects yet.</p>
          <p className="text-sm text-muted-foreground">
            Create your first project to get started.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project: any) => {
            const taskCount = project.project_tasks?.[0]?.count ?? 0;
            return (
              <Link key={project.id} href={`/projects/${project.id}`}>
                <Card className="flex flex-col gap-3 p-4 transition-colors hover:bg-muted/50">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {project.color && (
                        <div
                          className="size-3 shrink-0 rounded-full"
                          style={{ backgroundColor: project.color }}
                        />
                      )}
                      <h3 className="font-medium leading-tight">
                        {project.name}
                      </h3>
                    </div>
                    <Badge variant={STATUS_VARIANT[project.status as Project["status"]]}>
                      {STATUS_LABEL[project.status as Project["status"]]}
                    </Badge>
                  </div>
                  {project.description && (
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {project.description}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {taskCount} {taskCount === 1 ? "task" : "tasks"}
                  </p>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
