"use client";

import { useCallback, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ChevronRight,
  ChevronDown,
  Plus,
  Trash2,
  ArrowRight,
  ArrowLeft,
  GripVertical,
  Star,
  Link2,
  ArrowUpRight,
  MoreHorizontal,
  Archive,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { IdeaMiniEditor } from "@/components/ideas/idea-mini-editor";
import { PromoteIdeaDialog } from "@/components/ideas/promote-idea-dialog";
import type { IdeaNode, IdeaNodeConnection, IdeaCategory } from "@/types/database";

// --- Category config ---
const CATEGORY_CONFIG: Record<
  IdeaCategory,
  { label: string; borderColor: string; bgColor: string; textColor: string }
> = {
  thought: {
    label: "Thought",
    borderColor: "border-blue-400",
    bgColor: "bg-blue-50 dark:bg-blue-950/30",
    textColor: "text-blue-700 dark:text-blue-300",
  },
  question: {
    label: "Question",
    borderColor: "border-amber-400",
    bgColor: "bg-amber-50 dark:bg-amber-950/30",
    textColor: "text-amber-700 dark:text-amber-300",
  },
  evidence: {
    label: "Evidence",
    borderColor: "border-green-400",
    bgColor: "bg-green-50 dark:bg-green-950/30",
    textColor: "text-green-700 dark:text-green-300",
  },
  action: {
    label: "Action",
    borderColor: "border-rose-400",
    bgColor: "bg-rose-50 dark:bg-rose-950/30",
    textColor: "text-rose-700 dark:text-rose-300",
  },
};

const COLOR_OPTIONS = [
  { value: null, label: "Default", swatchClass: "bg-muted", borderClass: "" },
  { value: "blue", label: "Blue", swatchClass: "bg-blue-400", borderClass: "border-l-blue-400" },
  { value: "green", label: "Green", swatchClass: "bg-green-400", borderClass: "border-l-green-400" },
  { value: "amber", label: "Amber", swatchClass: "bg-amber-400", borderClass: "border-l-amber-400" },
  { value: "rose", label: "Rose", swatchClass: "bg-rose-400", borderClass: "border-l-rose-400" },
  { value: "purple", label: "Purple", swatchClass: "bg-purple-400", borderClass: "border-l-purple-400" },
  { value: "cyan", label: "Cyan", swatchClass: "bg-cyan-400", borderClass: "border-l-cyan-400" },
];

function getColorBorderClass(color: string | null): string {
  if (!color) return "";
  const opt = COLOR_OPTIONS.find((o) => o.value === color);
  return opt?.borderClass ?? "";
}

// --- Tree helpers ---
interface TreeNode extends IdeaNode {
  children: TreeNode[];
  collapsed: boolean;
}

function buildTree(nodes: IdeaNode[]): TreeNode[] {
  const map = new Map<string, TreeNode>();
  const roots: TreeNode[] = [];

  for (const node of nodes) {
    map.set(node.id, { ...node, children: [], collapsed: false });
  }

  for (const node of nodes) {
    const treeNode = map.get(node.id)!;
    if (node.parent_id && map.has(node.parent_id)) {
      map.get(node.parent_id)!.children.push(treeNode);
    } else {
      roots.push(treeNode);
    }
  }

  return roots;
}

function flattenTree(roots: TreeNode[]): TreeNode[] {
  const result: TreeNode[] = [];
  function walk(nodes: TreeNode[]) {
    for (const node of nodes) {
      result.push(node);
      if (!node.collapsed) {
        walk(node.children);
      }
    }
  }
  walk(roots);
  return result;
}

function getDepth(nodeId: string, nodeMap: Map<string, TreeNode>): number {
  let depth = 0;
  let current = nodeMap.get(nodeId);
  while (current?.parent_id && nodeMap.has(current.parent_id)) {
    depth++;
    current = nodeMap.get(current.parent_id);
  }
  return depth;
}

// --- Connection SVG ---
function ConnectionLines({
  connections,
  nodeElements,
  containerRef,
}: {
  connections: IdeaNodeConnection[];
  nodeElements: Map<string, HTMLDivElement>;
  containerRef: React.RefObject<HTMLDivElement | null>;
}) {
  if (connections.length === 0 || !containerRef.current) return null;

  const containerRect = containerRef.current.getBoundingClientRect();
  const lines: { x1: number; y1: number; x2: number; y2: number; id: string }[] = [];

  for (const conn of connections) {
    const fromEl = nodeElements.get(conn.from_node_id);
    const toEl = nodeElements.get(conn.to_node_id);
    if (!fromEl || !toEl) continue;

    const fromRect = fromEl.getBoundingClientRect();
    const toRect = toEl.getBoundingClientRect();

    lines.push({
      id: conn.id,
      x1: fromRect.right - containerRect.left,
      y1: fromRect.top + fromRect.height / 2 - containerRect.top,
      x2: toRect.left - containerRect.left,
      y2: toRect.top + toRect.height / 2 - containerRect.top,
    });
  }

  return (
    <svg
      className="pointer-events-none absolute inset-0 z-0"
      style={{ width: "100%", height: "100%" }}
    >
      <defs>
        <marker
          id="arrowhead"
          markerWidth="8"
          markerHeight="6"
          refX="7"
          refY="3"
          orient="auto"
        >
          <polygon
            points="0 0, 8 3, 0 6"
            className="fill-muted-foreground/40"
          />
        </marker>
      </defs>
      {lines.map((line) => (
        <line
          key={line.id}
          x1={line.x1}
          y1={line.y1}
          x2={line.x2}
          y2={line.y2}
          className="stroke-muted-foreground/40"
          strokeWidth={1.5}
          strokeDasharray="4 3"
          markerEnd="url(#arrowhead)"
        />
      ))}
    </svg>
  );
}

// --- Main component ---
interface IdeaBoardViewProps {
  boardId: string;
  initialNodes: IdeaNode[];
  initialConnections: IdeaNodeConnection[];
}

export function IdeaBoardView({
  boardId,
  initialNodes,
  initialConnections,
}: IdeaBoardViewProps) {
  const [nodes, setNodes] = useState<IdeaNode[]>(initialNodes);
  const [connections, setConnections] = useState<IdeaNodeConnection[]>(initialConnections);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editRichContent, setEditRichContent] = useState<Record<string, unknown> | null>(null);
  const [connectingFromId, setConnectingFromId] = useState<string | null>(null);
  const [promoteNode, setPromoteNode] = useState<IdeaNode | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const supabase = createClient();
  const containerRef = useRef<HTMLDivElement>(null);
  const nodeElementsRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const [, forceRender] = useState(0);

  // Filter out archived unless toggled
  const visibleNodes = showArchived ? nodes : nodes.filter((n) => !n.is_archived);

  const tree = buildTree(visibleNodes);
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());

  const nodeMap = new Map<string, TreeNode>();
  function populateMap(roots: TreeNode[]) {
    for (const node of roots) {
      node.collapsed = collapsedIds.has(node.id);
      nodeMap.set(node.id, node);
      populateMap(node.children);
    }
  }
  populateMap(tree);
  const flat = flattenTree(tree);

  // Sort: starred first within each level
  // (We do this at display time for simplicity)

  const toggleCollapse = useCallback((id: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const startEditing = useCallback((node: IdeaNode) => {
    setEditingId(node.id);
    setEditTitle(node.title);
    setEditRichContent(node.rich_content ?? null);
  }, []);

  const saveEdit = useCallback(async () => {
    if (!editingId) return;

    const plainText = editRichContent
      ? extractPlainText(editRichContent)
      : null;

    await supabase
      .from("idea_nodes")
      .update({
        title: editTitle,
        content: plainText,
        rich_content: editRichContent,
      })
      .eq("id", editingId);

    setNodes((prev) =>
      prev.map((n) =>
        n.id === editingId
          ? { ...n, title: editTitle, content: plainText, rich_content: editRichContent }
          : n
      )
    );
    setEditingId(null);
  }, [editingId, editTitle, editRichContent, supabase]);

  const toggleStar = useCallback(
    async (nodeId: string) => {
      const node = nodes.find((n) => n.id === nodeId);
      if (!node) return;
      const newStarred = !node.is_starred;

      await supabase
        .from("idea_nodes")
        .update({ is_starred: newStarred })
        .eq("id", nodeId);

      setNodes((prev) =>
        prev.map((n) =>
          n.id === nodeId ? { ...n, is_starred: newStarred } : n
        )
      );
    },
    [nodes, supabase]
  );

  const setCategory = useCallback(
    async (nodeId: string, category: IdeaCategory | null) => {
      await supabase
        .from("idea_nodes")
        .update({ category })
        .eq("id", nodeId);

      setNodes((prev) =>
        prev.map((n) => (n.id === nodeId ? { ...n, category } : n))
      );
    },
    [supabase]
  );

  const setColor = useCallback(
    async (nodeId: string, color: string | null) => {
      await supabase
        .from("idea_nodes")
        .update({ color })
        .eq("id", nodeId);

      setNodes((prev) =>
        prev.map((n) => (n.id === nodeId ? { ...n, color } : n))
      );
    },
    [supabase]
  );

  const handleConnectionClick = useCallback(
    async (nodeId: string) => {
      if (!connectingFromId) {
        setConnectingFromId(nodeId);
        return;
      }

      if (connectingFromId === nodeId) {
        setConnectingFromId(null);
        return;
      }

      // Check if connection already exists
      const exists = connections.some(
        (c) =>
          (c.from_node_id === connectingFromId && c.to_node_id === nodeId) ||
          (c.from_node_id === nodeId && c.to_node_id === connectingFromId)
      );

      if (exists) {
        // Remove the connection
        const conn = connections.find(
          (c) =>
            (c.from_node_id === connectingFromId && c.to_node_id === nodeId) ||
            (c.from_node_id === nodeId && c.to_node_id === connectingFromId)
        );
        if (conn) {
          await supabase.from("idea_node_connections").delete().eq("id", conn.id);
          setConnections((prev) => prev.filter((c) => c.id !== conn.id));
        }
        setConnectingFromId(null);
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("idea_node_connections")
        .insert({
          user_id: user.id,
          idea_board_id: boardId,
          from_node_id: connectingFromId,
          to_node_id: nodeId,
        })
        .select()
        .single();

      if (data) {
        setConnections((prev) => [...prev, data as IdeaNodeConnection]);
      }

      setConnectingFromId(null);
      // Force re-render for SVG lines
      forceRender((n) => n + 1);
    },
    [connectingFromId, connections, boardId, supabase]
  );

  const addChild = useCallback(
    async (parentId: string) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("idea_nodes")
        .insert({
          user_id: user.id,
          title: "New idea",
          parent_id: parentId,
          idea_board_id: boardId,
          position_x: 0,
          position_y: 0,
          is_starred: false,
          is_archived: false,
        })
        .select()
        .single();

      if (data) {
        setNodes((prev) => [...prev, data as IdeaNode]);
        setCollapsedIds((prev) => {
          const next = new Set(prev);
          next.delete(parentId);
          return next;
        });
      }
    },
    [boardId, supabase]
  );

  const addSibling = useCallback(
    async (siblingId: string) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const sibling = nodes.find((n) => n.id === siblingId);
      const { data } = await supabase
        .from("idea_nodes")
        .insert({
          user_id: user.id,
          title: "New idea",
          parent_id: sibling?.parent_id ?? null,
          idea_board_id: boardId,
          position_x: 0,
          position_y: 0,
          is_starred: false,
          is_archived: false,
        })
        .select()
        .single();

      if (data) {
        setNodes((prev) => [...prev, data as IdeaNode]);
      }
    },
    [boardId, nodes, supabase]
  );

  const deleteNode = useCallback(
    async (nodeId: string) => {
      const toRemove = new Set<string>();
      function collectDescendants(id: string) {
        toRemove.add(id);
        for (const n of nodes) {
          if (n.parent_id === id) collectDescendants(n.id);
        }
      }
      collectDescendants(nodeId);

      await supabase.from("idea_nodes").delete().in("id", Array.from(toRemove));
      setNodes((prev) => prev.filter((n) => !toRemove.has(n.id)));
      // Also remove related connections
      setConnections((prev) =>
        prev.filter(
          (c) => !toRemove.has(c.from_node_id) && !toRemove.has(c.to_node_id)
        )
      );
    },
    [nodes, supabase]
  );

  const archiveNode = useCallback(
    async (nodeId: string) => {
      await supabase
        .from("idea_nodes")
        .update({ is_archived: true })
        .eq("id", nodeId);

      setNodes((prev) =>
        prev.map((n) => (n.id === nodeId ? { ...n, is_archived: true } : n))
      );
    },
    [supabase]
  );

  const indent = useCallback(
    async (nodeId: string) => {
      const node = nodes.find((n) => n.id === nodeId);
      if (!node) return;

      const siblings = nodes.filter(
        (n) => n.parent_id === node.parent_id && n.id !== nodeId
      );
      if (siblings.length === 0) return;

      const newParent = siblings[siblings.length - 1];
      await supabase
        .from("idea_nodes")
        .update({ parent_id: newParent.id })
        .eq("id", nodeId);

      setNodes((prev) =>
        prev.map((n) =>
          n.id === nodeId ? { ...n, parent_id: newParent.id } : n
        )
      );
    },
    [nodes, supabase]
  );

  const outdent = useCallback(
    async (nodeId: string) => {
      const node = nodes.find((n) => n.id === nodeId);
      if (!node?.parent_id) return;

      const parent = nodes.find((n) => n.id === node.parent_id);
      if (!parent) return;

      await supabase
        .from("idea_nodes")
        .update({ parent_id: parent.parent_id })
        .eq("id", nodeId);

      setNodes((prev) =>
        prev.map((n) =>
          n.id === nodeId ? { ...n, parent_id: parent.parent_id } : n
        )
      );
    },
    [nodes, supabase]
  );

  const addRootNode = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("idea_nodes")
      .insert({
        user_id: user.id,
        title: "New idea",
        parent_id: null,
        idea_board_id: boardId,
        position_x: 0,
        position_y: 0,
        is_starred: false,
        is_archived: false,
      })
      .select()
      .single();

    if (data) {
      setNodes((prev) => [...prev, data as IdeaNode]);
    }
  }, [boardId, supabase]);

  const handlePromoted = useCallback(
    (nodeId: string, target: "note" | "todo" | "project", targetId: string) => {
      setNodes((prev) =>
        prev.map((n) =>
          n.id === nodeId
            ? { ...n, promoted_to: target, promoted_id: targetId, is_archived: true }
            : n
        )
      );
    },
    []
  );

  const archivedCount = nodes.filter((n) => n.is_archived).length;

  // Helper to register node DOM elements
  const registerNodeRef = useCallback(
    (id: string, el: HTMLDivElement | null) => {
      if (el) {
        nodeElementsRef.current.set(id, el);
      } else {
        nodeElementsRef.current.delete(id);
      }
    },
    []
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {connectingFromId && (
            <div className="flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-1.5 text-sm text-primary">
              <Link2 className="size-3.5" />
              Click another node to connect, or click the same node to cancel
              <Button
                variant="ghost"
                size="xs"
                onClick={() => setConnectingFromId(null)}
              >
                Cancel
              </Button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {archivedCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowArchived(!showArchived)}
              className="text-muted-foreground"
            >
              <Archive className="size-3.5" />
              {showArchived ? "Hide" : "Show"} archived ({archivedCount})
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={addRootNode}>
            <Plus className="size-4" />
            Add Idea
          </Button>
        </div>
      </div>

      {flat.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          No ideas yet. Click &quot;Add Idea&quot; to get started.
        </div>
      ) : (
        <div className="relative flex flex-col gap-0.5" ref={containerRef}>
          <ConnectionLines
            connections={connections}
            nodeElements={nodeElementsRef.current}
            containerRef={containerRef}
          />
          {flat.map((node) => {
            const depth = getDepth(node.id, nodeMap);
            const hasChildren = node.children.length > 0;
            const isEditing = editingId === node.id;
            const isConnecting = connectingFromId === node.id;
            const catConfig = node.category
              ? CATEGORY_CONFIG[node.category]
              : null;

            return (
              <div
                key={node.id}
                ref={(el) => registerNodeRef(node.id, el)}
                className={cn(
                  "group relative z-10 flex items-start gap-1 rounded-md border-l-2 px-2 py-1.5 transition-colors hover:bg-muted/50",
                  node.is_starred && "bg-amber-50/50 dark:bg-amber-950/10",
                  node.is_archived && "opacity-50",
                  isConnecting &&
                    "ring-2 ring-primary ring-offset-1 bg-primary/5",
                  catConfig
                    ? catConfig.borderColor
                    : node.color
                      ? getColorBorderClass(node.color)
                      : "border-l-transparent"
                )}
                style={{ paddingLeft: `${depth * 24 + 8}px` }}
              >
                {/* Collapse toggle */}
                <button
                  className="mt-1 flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-muted"
                  onClick={() => hasChildren && toggleCollapse(node.id)}
                >
                  {hasChildren ? (
                    node.collapsed ? (
                      <ChevronRight className="size-3.5" />
                    ) : (
                      <ChevronDown className="size-3.5" />
                    )
                  ) : (
                    <GripVertical className="size-3 opacity-0 group-hover:opacity-50" />
                  )}
                </button>

                {/* Star button */}
                <button
                  className={cn(
                    "mt-1 flex size-5 shrink-0 items-center justify-center rounded transition-colors",
                    node.is_starred
                      ? "text-amber-500"
                      : "text-muted-foreground/30 hover:text-amber-400 opacity-0 group-hover:opacity-100"
                  )}
                  onClick={() => toggleStar(node.id)}
                  title={node.is_starred ? "Unstar" : "Star"}
                >
                  <Star
                    className={cn(
                      "size-3.5",
                      node.is_starred && "fill-amber-500"
                    )}
                  />
                </button>

                {/* Content area */}
                <div className="flex-1 min-w-0">
                  {isEditing ? (
                    <div className="flex flex-col gap-2">
                      <Input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="h-7 text-sm"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Escape") setEditingId(null);
                        }}
                      />
                      <IdeaMiniEditor
                        content={editRichContent}
                        onChange={setEditRichContent}
                      />

                      {/* Category selector */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs text-muted-foreground">
                          Category:
                        </span>
                        {(
                          Object.entries(CATEGORY_CONFIG) as [
                            IdeaCategory,
                            (typeof CATEGORY_CONFIG)[IdeaCategory],
                          ][]
                        ).map(([key, config]) => (
                          <button
                            key={key}
                            onClick={() =>
                              setCategory(
                                node.id,
                                node.category === key ? null : key
                              )
                            }
                            className={cn(
                              "rounded-full border px-2 py-0.5 text-xs transition-colors",
                              node.category === key
                                ? `${config.bgColor} ${config.textColor} ${config.borderColor}`
                                : "border-border text-muted-foreground hover:bg-muted"
                            )}
                          >
                            {config.label}
                          </button>
                        ))}
                      </div>

                      {/* Color selector */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-muted-foreground">
                          Color:
                        </span>
                        {COLOR_OPTIONS.map((opt) => (
                          <button
                            key={opt.value ?? "default"}
                            onClick={() => setColor(node.id, opt.value)}
                            className={cn(
                              "size-5 rounded-full border-2 transition-transform hover:scale-110",
                              opt.swatchClass,
                              node.color === opt.value
                                ? "border-foreground scale-110"
                                : "border-transparent"
                            )}
                            title={opt.label}
                          />
                        ))}
                      </div>

                      <div className="flex gap-2">
                        <Button size="xs" onClick={saveEdit}>
                          Save
                        </Button>
                        <Button
                          size="xs"
                          variant="ghost"
                          onClick={() => setEditingId(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="cursor-pointer"
                      onClick={() => startEditing(node)}
                    >
                      <div className="flex items-center gap-1.5">
                        <p
                          className={cn(
                            "text-sm font-medium leading-snug",
                            node.is_starred && "text-amber-900 dark:text-amber-100"
                          )}
                        >
                          {node.title}
                        </p>
                        {catConfig && (
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px] h-4 px-1.5",
                              catConfig.bgColor,
                              catConfig.textColor,
                              catConfig.borderColor
                            )}
                          >
                            {catConfig.label}
                          </Badge>
                        )}
                        {node.promoted_to && (
                          <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                            Promoted to {node.promoted_to}
                          </Badge>
                        )}
                      </div>
                      {node.content && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {node.content}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                {!isEditing && (
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    {/* Connect button */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "size-6",
                        isConnecting && "bg-primary/10 text-primary"
                      )}
                      onClick={() => handleConnectionClick(node.id)}
                      title="Connect to another idea"
                    >
                      <Link2 className="size-3" />
                    </Button>

                    {/* More menu */}
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-6"
                          />
                        }
                      >
                        <MoreHorizontal className="size-3" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => addChild(node.id)}
                        >
                          <Plus className="size-3.5" />
                          Add child
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => addSibling(node.id)}
                        >
                          <Plus className="size-3.5 text-muted-foreground" />
                          Add sibling
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => indent(node.id)}
                        >
                          <ArrowRight className="size-3.5" />
                          Indent
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => outdent(node.id)}
                        >
                          <ArrowLeft className="size-3.5" />
                          Outdent
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setPromoteNode(node)}
                        >
                          <ArrowUpRight className="size-3.5" />
                          Promote to...
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => archiveNode(node.id)}
                        >
                          <Archive className="size-3.5" />
                          Archive
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => deleteNode(node.id)}
                        >
                          <Trash2 className="size-3.5" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Promote dialog */}
      {promoteNode && (
        <PromoteIdeaDialog
          node={promoteNode}
          open={!!promoteNode}
          onOpenChange={(open) => {
            if (!open) setPromoteNode(null);
          }}
          onPromoted={handlePromoted}
        />
      )}
    </div>
  );
}

// Helper to extract plain text from TipTap JSON
function extractPlainText(json: Record<string, unknown>): string | null {
  const texts: string[] = [];

  function walk(node: Record<string, unknown>) {
    if (node.text && typeof node.text === "string") {
      texts.push(node.text);
    }
    if (Array.isArray(node.content)) {
      for (const child of node.content) {
        walk(child as Record<string, unknown>);
      }
    }
  }

  walk(json);
  const result = texts.join(" ").trim();
  return result || null;
}
