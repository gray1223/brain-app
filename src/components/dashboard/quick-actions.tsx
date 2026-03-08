"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Plus, StickyNote, CheckCircle2, BookOpen } from "lucide-react";

export function QuickActions() {
  const router = useRouter();

  const actions = [
    {
      label: "New Note",
      icon: StickyNote,
      href: "/notes/new",
    },
    {
      label: "New Todo",
      icon: CheckCircle2,
      href: "/todos?new=true",
    },
    {
      label: "Write Journal",
      icon: BookOpen,
      href: `/journal/${new Date().toISOString().split("T")[0]}`,
    },
  ];

  return (
    <div className="flex flex-col gap-2">
      {actions.map((action) => (
        <Button
          key={action.label}
          variant="outline"
          className="justify-start gap-2"
          onClick={() => router.push(action.href)}
        >
          <Plus className="size-4" />
          <action.icon className="size-4" />
          {action.label}
        </Button>
      ))}
    </div>
  );
}
