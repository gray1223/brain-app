"use client";

import { useCallback, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  StickyNote,
  CheckSquare,
  BookOpen,
  FolderKanban,
  Plane,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

interface SearchResult {
  id: string;
  type: "note" | "todo" | "journal" | "project" | "travel";
  title: string;
  subtitle?: string;
  href: string;
}

const typeConfig = {
  note: { icon: StickyNote, label: "Notes", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
  todo: { icon: CheckSquare, label: "To-Dos", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
  journal: { icon: BookOpen, label: "Journal", color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200" },
  project: { icon: FolderKanban, label: "Projects", color: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200" },
  travel: { icon: Plane, label: "Travel", color: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200" },
};

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const supabase = createClient();

  const handleSearch = useCallback(async () => {
    const q = query.trim();
    if (!q) return;

    setLoading(true);
    setSearched(true);
    const pattern = `%${q}%`;
    const allResults: SearchResult[] = [];

    // Search notes by title and tags
    const { data: notes } = await supabase
      .from("notes")
      .select("id, title, tags")
      .eq("is_archived", false)
      .or(`title.ilike.${pattern},tags.cs.{${q}}`);

    if (notes) {
      for (const note of notes) {
        allResults.push({
          id: note.id,
          type: "note",
          title: note.title,
          subtitle: note.tags?.length ? note.tags.join(", ") : undefined,
          href: `/notes/${note.id}`,
        });
      }
    }

    // Search todos by title
    const { data: todos } = await supabase
      .from("todos")
      .select("id, title, completed")
      .ilike("title", pattern);

    if (todos) {
      for (const todo of todos) {
        allResults.push({
          id: todo.id,
          type: "todo",
          title: todo.title,
          subtitle: todo.completed ? "Completed" : "Pending",
          href: "/todos",
        });
      }
    }

    // Search journal entries by tags
    const { data: journals } = await supabase
      .from("journal_entries")
      .select("id, date, tags")
      .contains("tags", [q]);

    if (journals) {
      for (const entry of journals) {
        allResults.push({
          id: entry.id,
          type: "journal",
          title: format(new Date(entry.date), "MMMM d, yyyy"),
          subtitle: entry.tags?.join(", "),
          href: `/journal/${entry.date}`,
        });
      }
    }

    // Search projects by name
    const { data: projects } = await supabase
      .from("projects")
      .select("id, name, status")
      .ilike("name", pattern);

    if (projects) {
      for (const project of projects) {
        allResults.push({
          id: project.id,
          type: "project",
          title: project.name,
          subtitle: project.status,
          href: `/projects/${project.id}`,
        });
      }
    }

    // Search travel plans by name and destination
    const { data: plans } = await supabase
      .from("travel_plans")
      .select("id, name, destination")
      .or(`name.ilike.${pattern},destination.ilike.${pattern}`);

    if (plans) {
      for (const plan of plans) {
        allResults.push({
          id: plan.id,
          type: "travel",
          title: plan.name,
          subtitle: plan.destination ?? undefined,
          href: `/travel/${plan.id}`,
        });
      }
    }

    setResults(allResults);
    setLoading(false);
  }, [query, supabase]);

  // Group results by type
  const grouped = results.reduce<Record<string, SearchResult[]>>(
    (acc, result) => {
      if (!acc[result.type]) acc[result.type] = [];
      acc[result.type].push(result);
      return acc;
    },
    {}
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Search className="size-6" />
          Search
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Search across all your notes, todos, journal, projects, and travel plans.
        </p>
      </div>

      <div className="flex gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search everything..."
          className="max-w-lg"
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSearch();
          }}
          autoFocus
        />
        <Button onClick={handleSearch} disabled={loading || !query.trim()}>
          {loading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Search className="size-4" />
          )}
          Search
        </Button>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Searching...
        </div>
      )}

      {searched && !loading && results.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <Search className="size-10 text-muted-foreground mb-4" />
          <h3 className="font-medium">No results found</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Try a different search term.
          </p>
        </div>
      )}

      {!loading &&
        Object.entries(grouped).map(([type, items]) => {
          const config = typeConfig[type as keyof typeof typeConfig];
          const Icon = config.icon;

          return (
            <div key={type} className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Icon className="size-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold">{config.label}</h2>
                <Badge variant="secondary" className="text-xs">
                  {items.length}
                </Badge>
              </div>
              <div className="flex flex-col gap-1">
                {items.map((item) => (
                  <Link
                    key={item.id}
                    href={item.href}
                    className="flex items-center justify-between rounded-md border px-3 py-2 hover:bg-muted/50 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {item.title}
                      </p>
                      {item.subtitle && (
                        <p className="text-xs text-muted-foreground truncate">
                          {item.subtitle}
                        </p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
    </div>
  );
}
