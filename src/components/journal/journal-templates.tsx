"use client";

import { Card, CardContent } from "@/components/ui/card";
import {
  PenLine,
  Heart,
  CalendarCheck,
  Target,
  Sun,
  Moon,
} from "lucide-react";

function makeTiptapDoc(sections: string[]): Record<string, unknown> {
  return {
    type: "doc",
    content: sections.flatMap((section, i) => {
      const nodes: Record<string, unknown>[] = [
        {
          type: "heading",
          attrs: { level: 3 },
          content: [{ type: "text", text: section }],
        },
        {
          type: "paragraph",
          content: [],
        },
      ];
      // Add extra spacing between sections except after the last one
      if (i < sections.length - 1) {
        nodes.push({ type: "paragraph", content: [] });
      }
      return nodes;
    }),
  };
}

interface Template {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  content: Record<string, unknown> | null;
}

const TEMPLATES: Template[] = [
  {
    id: "free-write",
    name: "Free Write",
    description: "Start with a blank page",
    icon: <PenLine className="size-5" />,
    content: null,
  },
  {
    id: "gratitude",
    name: "Gratitude Log",
    description: "Reflect on what you're thankful for",
    icon: <Heart className="size-5" />,
    content: makeTiptapDoc([
      "3 things I'm grateful for:",
      "Why:",
      "How I'll pay it forward:",
    ]),
  },
  {
    id: "weekly-review",
    name: "Weekly Review",
    description: "Review your week and plan ahead",
    icon: <CalendarCheck className="size-5" />,
    content: makeTiptapDoc([
      "Wins this week:",
      "Challenges:",
      "Lessons learned:",
      "Goals for next week:",
    ]),
  },
  {
    id: "monthly-goals",
    name: "Monthly Goals",
    description: "Set and track monthly objectives",
    icon: <Target className="size-5" />,
    content: makeTiptapDoc([
      "Last month reflection:",
      "This month's goals:",
      "Key milestones:",
      "Habits to build/break:",
    ]),
  },
  {
    id: "morning-pages",
    name: "Morning Pages",
    description: "Start your day with intention",
    icon: <Sun className="size-5" />,
    content: makeTiptapDoc([
      "How I'm feeling:",
      "What I'm looking forward to:",
      "Today's intention:",
      "Top 3 priorities:",
    ]),
  },
  {
    id: "evening-reflection",
    name: "Evening Reflection",
    description: "Wind down and review your day",
    icon: <Moon className="size-5" />,
    content: makeTiptapDoc([
      "Best part of today:",
      "What I learned:",
      "What I'm grateful for:",
      "Tomorrow I will:",
    ]),
  },
];

interface JournalTemplatesProps {
  onSelect: (template: Record<string, unknown> | null) => void;
}

export function JournalTemplates({ onSelect }: JournalTemplatesProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-muted-foreground">
        Start with a template
      </label>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {TEMPLATES.map((template) => (
          <Card
            key={template.id}
            className="w-36 shrink-0 cursor-pointer transition-all hover:ring-2 hover:ring-primary/50"
            onClick={() => onSelect(template.content)}
          >
            <CardContent className="flex flex-col items-center gap-2 p-3 text-center">
              <div className="flex size-9 items-center justify-center rounded-lg bg-muted">
                {template.icon}
              </div>
              <div>
                <p className="text-xs font-medium">{template.name}</p>
                <p className="mt-0.5 text-[10px] leading-tight text-muted-foreground">
                  {template.description}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
