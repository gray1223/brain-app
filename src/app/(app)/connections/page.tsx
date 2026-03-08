import { createClient } from "@/lib/supabase/server";
import { ConnectionGraph } from "@/components/connections/connection-graph";
import { Network } from "lucide-react";

export default async function ConnectionsPage() {
  const supabase = await createClient();

  const { data: notes } = await supabase
    .from("notes")
    .select("id, title")
    .eq("is_archived", false)
    .order("created_at", { ascending: false });

  const { data: connections } = await supabase
    .from("note_connections")
    .select("id, note_a_id, note_b_id, label");

  const nodeList = (notes ?? []).map((n) => ({ id: n.id, title: n.title }));
  const edgeList = (connections ?? []).map((c) => ({
    source: c.note_a_id,
    target: c.note_b_id,
    label: c.label ?? undefined,
  }));

  const totalNotes = nodeList.length;
  const totalConnections = edgeList.length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Network className="size-6" />
            Connections Graph
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {totalNotes} notes &middot; {totalConnections} connections
          </p>
        </div>
      </div>

      {totalNotes === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <Network className="size-10 text-muted-foreground mb-4" />
          <h3 className="font-medium">No notes yet</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Create some notes and connections to see your knowledge graph.
          </p>
        </div>
      ) : (
        <ConnectionGraph nodes={nodeList} edges={edgeList} />
      )}
    </div>
  );
}
