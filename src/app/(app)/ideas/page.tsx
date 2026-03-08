import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateBoardDialog } from "@/components/ideas/create-board-dialog";
import { Lightbulb } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";

export default async function IdeasPage() {
  const supabase = await createClient();

  const { data: boards } = await supabase
    .from("idea_boards")
    .select("*")
    .order("updated_at", { ascending: false });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Lightbulb className="size-6" />
            Idea Boards
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Brainstorm and organize your ideas
          </p>
        </div>
        <CreateBoardDialog />
      </div>

      {(!boards || boards.length === 0) ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <Lightbulb className="size-10 text-muted-foreground mb-4" />
          <h3 className="font-medium">No idea boards yet</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Create your first board to start brainstorming.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {boards.map((board) => (
            <Link key={board.id} href={`/ideas/${board.id}`}>
              <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
                <CardHeader>
                  <CardTitle className="text-base">{board.name}</CardTitle>
                  {board.description && (
                    <CardDescription className="line-clamp-2">
                      {board.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    Updated {format(new Date(board.updated_at), "MMM d, yyyy")}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
