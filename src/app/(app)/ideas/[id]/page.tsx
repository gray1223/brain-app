import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { IdeaBoardView } from "@/components/ideas/idea-board-view";
import { ChevronLeft, Lightbulb } from "lucide-react";
import Link from "next/link";

interface IdeaBoardPageProps {
  params: Promise<{ id: string }>;
}

export default async function IdeaBoardPage({ params }: IdeaBoardPageProps) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: board } = await supabase
    .from("idea_boards")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!board) {
    notFound();
  }

  const { data: nodes } = await supabase
    .from("idea_nodes")
    .select("*")
    .eq("idea_board_id", id)
    .order("created_at", { ascending: true });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link
          href="/ideas"
          className="inline-flex size-8 items-center justify-center rounded-lg text-sm font-medium hover:bg-muted"
        >
          <ChevronLeft className="size-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Lightbulb className="size-5" />
            {board.name}
          </h1>
          {board.description && (
            <p className="text-sm text-muted-foreground mt-0.5">
              {board.description}
            </p>
          )}
        </div>
      </div>

      <IdeaBoardView boardId={id} initialNodes={nodes ?? []} />
    </div>
  );
}
