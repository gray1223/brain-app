import { createClient } from "@/lib/supabase/server";
import { ConnectionGraph } from "@/components/connections/connection-graph";
import type { GraphNodeInput } from "@/components/connections/connection-graph";
import { Network } from "lucide-react";

export default async function ConnectionsPage() {
  const supabase = await createClient();

  // Fetch notes, ideas, and flashcard decks in parallel
  const [
    { data: notes },
    { data: connections },
    { data: ideas },
    { data: flashcardDecks },
  ] = await Promise.all([
    supabase
      .from("notes")
      .select("id, title, tags")
      .eq("is_archived", false)
      .order("created_at", { ascending: false }),
    supabase
      .from("note_connections")
      .select("id, note_a_id, note_b_id, label"),
    supabase
      .from("idea_nodes")
      .select("id, title")
      .order("created_at", { ascending: false }),
    supabase
      .from("flashcard_decks")
      .select("id, name, description")
      .order("created_at", { ascending: false }),
  ]);

  const noteNodes: GraphNodeInput[] = (notes ?? []).map((n) => ({
    id: n.id,
    title: n.title,
    type: "note" as const,
    tags: n.tags ?? [],
  }));

  const ideaNodes: GraphNodeInput[] = (ideas ?? []).map((n) => ({
    id: n.id,
    title: n.title,
    type: "idea" as const,
  }));

  const deckNodes: GraphNodeInput[] = (flashcardDecks ?? []).map((d) => ({
    id: d.id,
    title: d.name,
    type: "flashcard_deck" as const,
  }));

  const nodeList = [...noteNodes, ...ideaNodes, ...deckNodes];

  const edgeList = (connections ?? []).map((c) => ({
    source: c.note_a_id,
    target: c.note_b_id,
    label: c.label ?? undefined,
  }));

  const totalEntities = nodeList.length;
  const totalConnections = edgeList.length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Network className="size-6" />
            Knowledge Graph
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {totalEntities} entities &middot; {totalConnections} connections
            &middot; {noteNodes.length} notes, {ideaNodes.length} ideas,{" "}
            {deckNodes.length} decks
          </p>
        </div>
      </div>

      {totalEntities === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <Network className="size-10 text-muted-foreground mb-4" />
          <h3 className="font-medium">No entities yet</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Create some notes, ideas, or flashcard decks to see your knowledge
            graph.
          </p>
        </div>
      ) : (
        <ConnectionGraph nodes={nodeList} edges={edgeList} />
      )}
    </div>
  );
}
