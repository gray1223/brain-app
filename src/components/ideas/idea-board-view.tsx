"use client";

import { useCallback, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  ChevronRight,
  ChevronDown,
  Plus,
  Trash2,
  ArrowRight,
  ArrowLeft,
  GripVertical,
} from "lucide-react";
import type { IdeaNode } from "@/types/database";

interface TreeNode extends IdeaNode {
  children: TreeNode[];
  collapsed: boolean;
}

interface IdeaBoardViewProps {
  boardId: string;
  initialNodes: IdeaNode[];
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

export function IdeaBoardView({ boardId, initialNodes }: IdeaBoardViewProps) {
  const [nodes, setNodes] = useState<IdeaNode[]>(initialNodes);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const supabase = createClient();

  const tree = buildTree(nodes);
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

  const toggleCollapse = useCallback((id: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const startEditing = useCallback(
    (node: IdeaNode) => {
      setEditingId(node.id);
      setEditTitle(node.title);
      setEditContent(node.content ?? "");
    },
    []
  );

  const saveEdit = useCallback(async () => {
    if (!editingId) return;
    await supabase
      .from("idea_nodes")
      .update({ title: editTitle, content: editContent || null })
      .eq("id", editingId);

    setNodes((prev) =>
      prev.map((n) =>
        n.id === editingId
          ? { ...n, title: editTitle, content: editContent || null }
          : n
      )
    );
    setEditingId(null);
  }, [editingId, editTitle, editContent, supabase]);

  const addChild = useCallback(
    async (parentId: string) => {
      const { data } = await supabase
        .from("idea_nodes")
        .insert({
          title: "New idea",
          parent_id: parentId,
          idea_board_id: boardId,
          position_x: 0,
          position_y: 0,
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
      const sibling = nodes.find((n) => n.id === siblingId);
      const { data } = await supabase
        .from("idea_nodes")
        .insert({
          title: "New idea",
          parent_id: sibling?.parent_id ?? null,
          idea_board_id: boardId,
          position_x: 0,
          position_y: 0,
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
      // Also remove children
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
    },
    [nodes, supabase]
  );

  const indent = useCallback(
    async (nodeId: string) => {
      // Make it a child of the previous sibling
      const node = nodes.find((n) => n.id === nodeId);
      if (!node) return;

      const siblings = nodes.filter((n) => n.parent_id === node.parent_id && n.id !== nodeId);
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
    const { data } = await supabase
      .from("idea_nodes")
      .insert({
        title: "New idea",
        parent_id: null,
        idea_board_id: boardId,
        position_x: 0,
        position_y: 0,
      })
      .select()
      .single();

    if (data) {
      setNodes((prev) => [...prev, data as IdeaNode]);
    }
  }, [boardId, supabase]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={addRootNode}>
          <Plus className="size-4" />
          Add Idea
        </Button>
      </div>

      {flat.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          No ideas yet. Click &quot;Add Idea&quot; to get started.
        </div>
      ) : (
        <div className="flex flex-col gap-0.5">
          {flat.map((node) => {
            const depth = getDepth(node.id, nodeMap);
            const hasChildren = node.children.length > 0;
            const isEditing = editingId === node.id;

            return (
              <div
                key={node.id}
                className="group flex items-start gap-1 rounded-md px-2 py-1.5 hover:bg-muted/50"
                style={{ paddingLeft: `${depth * 24 + 8}px` }}
              >
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

                <div className="flex-1 min-w-0">
                  {isEditing ? (
                    <div className="flex flex-col gap-2">
                      <Input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="h-7 text-sm"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveEdit();
                          if (e.key === "Escape") setEditingId(null);
                        }}
                      />
                      <Textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        placeholder="Add details..."
                        className="text-sm min-h-[60px]"
                      />
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
                      <p className="text-sm font-medium leading-snug">
                        {node.title}
                      </p>
                      {node.content && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {node.content}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {!isEditing && (
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-6"
                      onClick={() => addChild(node.id)}
                      title="Add child"
                    >
                      <Plus className="size-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-6"
                      onClick={() => addSibling(node.id)}
                      title="Add sibling"
                    >
                      <Plus className="size-3 text-muted-foreground" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-6"
                      onClick={() => indent(node.id)}
                      title="Indent"
                    >
                      <ArrowRight className="size-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-6"
                      onClick={() => outdent(node.id)}
                      title="Outdent"
                    >
                      <ArrowLeft className="size-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-6 text-destructive"
                      onClick={() => deleteNode(node.id)}
                      title="Delete"
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
