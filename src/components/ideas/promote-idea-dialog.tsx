"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FileText, CheckSquare, FolderKanban } from "lucide-react";
import type { IdeaNode } from "@/types/database";

type PromoteTarget = "note" | "todo" | "project";

interface PromoteIdeaDialogProps {
  node: IdeaNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPromoted: (nodeId: string, target: PromoteTarget, targetId: string) => void;
}

const targetConfig: Record<
  PromoteTarget,
  { label: string; icon: React.ReactNode; description: string }
> = {
  note: {
    label: "Note",
    icon: <FileText className="size-5" />,
    description: "Create a new note with this idea's content",
  },
  todo: {
    label: "Todo",
    icon: <CheckSquare className="size-5" />,
    description: "Create a new todo item from this idea",
  },
  project: {
    label: "Project",
    icon: <FolderKanban className="size-5" />,
    description: "Start a new project based on this idea",
  },
};

export function PromoteIdeaDialog({
  node,
  open,
  onOpenChange,
  onPromoted,
}: PromoteIdeaDialogProps) {
  const [target, setTarget] = useState<PromoteTarget | null>(null);
  const [title, setTitle] = useState(node.title);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const handlePromote = async () => {
    if (!target) return;
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    let targetId: string | null = null;

    if (target === "note") {
      const { data } = await supabase
        .from("notes")
        .insert({
          user_id: user.id,
          title: title.trim(),
          content: node.rich_content ?? null,
          tags: [],
          is_archived: false,
          is_pinned: false,
        })
        .select("id")
        .single();
      targetId = data?.id ?? null;
    } else if (target === "todo") {
      const { data } = await supabase
        .from("todos")
        .insert({
          user_id: user.id,
          title: title.trim(),
          description: node.content,
          priority: "medium",
          completed: false,
          order_index: 0,
          is_pinned: false,
        })
        .select("id")
        .single();
      targetId = data?.id ?? null;
    } else if (target === "project") {
      const { data } = await supabase
        .from("projects")
        .insert({
          user_id: user.id,
          name: title.trim(),
          description: node.content,
          status: "planning",
          is_pinned: false,
        })
        .select("id")
        .single();
      targetId = data?.id ?? null;
    }

    if (targetId) {
      await supabase
        .from("idea_nodes")
        .update({
          promoted_to: target,
          promoted_id: targetId,
          is_archived: true,
        })
        .eq("id", node.id);

      onPromoted(node.id, target, targetId);
    }

    setLoading(false);
    setTarget(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Promote Idea</DialogTitle>
          <DialogDescription>
            Convert this idea into a note, todo, or project.
          </DialogDescription>
        </DialogHeader>

        {!target ? (
          <div className="grid grid-cols-3 gap-3 py-2">
            {(Object.entries(targetConfig) as [PromoteTarget, typeof targetConfig.note][]).map(
              ([key, config]) => (
                <button
                  key={key}
                  onClick={() => {
                    setTarget(key);
                    setTitle(node.title);
                  }}
                  className="flex flex-col items-center gap-2 rounded-lg border border-border p-4 text-center transition-colors hover:bg-muted hover:border-primary/50"
                >
                  {config.icon}
                  <span className="text-sm font-medium">{config.label}</span>
                </button>
              )
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-4 py-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {targetConfig[target].icon}
              <span>{targetConfig[target].description}</span>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="promote-title">Title</Label>
              <Input
                id="promote-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handlePromote();
                }}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          {target ? (
            <>
              <Button
                variant="outline"
                onClick={() => setTarget(null)}
                disabled={loading}
              >
                Back
              </Button>
              <Button
                onClick={handlePromote}
                disabled={!title.trim() || loading}
              >
                {loading
                  ? "Creating..."
                  : `Create ${targetConfig[target].label}`}
              </Button>
            </>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
