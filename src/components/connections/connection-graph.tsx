"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { toast } from "sonner";
import {
  Link2,
  MousePointer2,
  X,
  ExternalLink,
  Sparkles,
  Loader2,
  Tag,
} from "lucide-react";
import Link from "next/link";

export type EntityType = "note" | "idea" | "flashcard_deck";

export interface GraphNodeInput {
  id: string;
  title: string;
  type: EntityType;
  tags?: string[];
  contentSnippet?: string;
}

interface GraphNode {
  id: string;
  title: string;
  type: EntityType;
  tags: string[];
  contentSnippet: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  connectionCount: number;
}

interface GraphEdge {
  source: string;
  target: string;
  label?: string;
  dashed?: boolean;
}

interface ConnectionGraphProps {
  nodes: GraphNodeInput[];
  edges: { source: string; target: string; label?: string }[];
}

interface ConnectionSuggestion {
  noteA: string;
  noteB: string;
  titleA: string;
  titleB: string;
  reason: string;
  label: string;
}

const CONNECTION_LABELS = [
  "relates to",
  "supports",
  "contradicts",
  "inspired by",
];

const NODE_RADIUS_BASE = 22;
const REPULSION = 3000;
const ATTRACTION = 0.005;
const CENTER_GRAVITY = 0.01;
const DAMPING = 0.9;
const MIN_VELOCITY = 0.01;

const NODE_COLORS: Record<EntityType, string> = {
  note: "hsl(210, 70%, 55%)",
  idea: "hsl(45, 85%, 55%)",
  flashcard_deck: "hsl(270, 60%, 55%)",
};

const NODE_LABELS: Record<EntityType, string> = {
  note: "Notes",
  idea: "Ideas",
  flashcard_deck: "Flashcard Decks",
};

function getNodeRadius(type: EntityType): number {
  switch (type) {
    case "note":
      return NODE_RADIUS_BASE;
    case "idea":
      return NODE_RADIUS_BASE - 4;
    case "flashcard_deck":
      return NODE_RADIUS_BASE + 2;
  }
}

function buildTagEdges(nodes: GraphNodeInput[]): GraphEdge[] {
  const tagMap = new Map<string, string[]>();
  for (const node of nodes) {
    if (node.tags) {
      for (const tag of node.tags) {
        const existing = tagMap.get(tag);
        if (existing) {
          existing.push(node.id);
        } else {
          tagMap.set(tag, [node.id]);
        }
      }
    }
  }

  const edges: GraphEdge[] = [];
  const seen = new Set<string>();
  for (const [tag, ids] of tagMap) {
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const key = [ids[i], ids[j]].sort().join(":");
        if (!seen.has(key)) {
          seen.add(key);
          edges.push({
            source: ids[i],
            target: ids[j],
            label: tag,
            dashed: true,
          });
        }
      }
    }
  }
  return edges;
}

function renderNodeShape(
  type: EntityType,
  radius: number,
  color: string,
  opacity: number
) {
  switch (type) {
    case "idea":
      return (
        <polygon
          points={`0,${-radius} ${radius},0 0,${radius} ${-radius},0`}
          fill={color}
          stroke="white"
          strokeWidth={2}
          opacity={opacity}
        />
      );
    case "flashcard_deck":
      return (
        <rect
          x={-radius}
          y={-radius * 0.75}
          width={radius * 2}
          height={radius * 1.5}
          rx={6}
          fill={color}
          stroke="white"
          strokeWidth={2}
          opacity={opacity}
        />
      );
    default:
      return (
        <circle
          r={radius}
          fill={color}
          stroke="white"
          strokeWidth={2}
          opacity={opacity}
        />
      );
  }
}

function getEntityLink(type: EntityType, id: string) {
  switch (type) {
    case "note":
      return `/notes/${id}`;
    case "idea":
      return `/ideas`;
    case "flashcard_deck":
      return `/flashcards/${id}`;
  }
}

export function ConnectionGraph({ nodes, edges }: ConnectionGraphProps) {
  const supabase = createClient();
  const svgRef = useRef<SVGSVGElement>(null);
  const animationRef = useRef<number>(0);
  const draggingRef = useRef<string | null>(null);
  const dragStartPosRef = useRef({ x: 0, y: 0 });
  const didDragRef = useRef(false);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  // Search filter state
  const [searchQuery, setSearchQuery] = useState("");

  // Zoom/pan state
  const [transform, setTransform] = useState({
    scale: 1,
    translateX: 0,
    translateY: 0,
  });
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0, tx: 0, ty: 0 });

  // Connect mode state
  const [connectMode, setConnectMode] = useState(false);
  const [connectFirst, setConnectFirst] = useState<string | null>(null);
  const [connectSecond, setConnectSecond] = useState<string | null>(null);
  const [showLabelDialog, setShowLabelDialog] = useState(false);
  const [connectionLabel, setConnectionLabel] = useState("");
  const [customLabel, setCustomLabel] = useState("");
  const [connectLoading, setConnectLoading] = useState(false);

  // Preview sidebar state
  const [previewNode, setPreviewNode] = useState<GraphNode | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // Suggested connections state
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<ConnectionSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Build combined edges: explicit + tag-based
  const allEdges = useRef<GraphEdge[]>([]);
  const [edgesVersion, setEdgesVersion] = useState(0);

  useEffect(() => {
    const tagEdges = buildTagEdges(nodes);
    const explicitSet = new Set(
      edges.map((e) => [e.source, e.target].sort().join(":"))
    );
    const filteredTagEdges = tagEdges.filter(
      (te) => !explicitSet.has([te.source, te.target].sort().join(":"))
    );
    allEdges.current = [
      ...edges.map((e) => ({ ...e, dashed: false })),
      ...filteredTagEdges,
    ];
  }, [nodes, edges, edgesVersion]);

  // Initialize graph nodes with random positions
  const graphNodesRef = useRef<GraphNode[]>([]);
  const [, forceRender] = useState(0);

  useEffect(() => {
    const combinedEdges = allEdges.current;
    const counts: Record<string, number> = {};
    for (const node of nodes) counts[node.id] = 0;
    for (const edge of combinedEdges) {
      counts[edge.source] = (counts[edge.source] ?? 0) + 1;
      counts[edge.target] = (counts[edge.target] ?? 0) + 1;
    }

    graphNodesRef.current = nodes.map((n) => ({
      id: n.id,
      title: n.title,
      type: n.type,
      tags: n.tags ?? [],
      contentSnippet: n.contentSnippet ?? "",
      x: dimensions.width / 2 + (Math.random() - 0.5) * 300,
      y: dimensions.height / 2 + (Math.random() - 0.5) * 300,
      vx: 0,
      vy: 0,
      connectionCount: counts[n.id] ?? 0,
    }));
  }, [nodes, edges, dimensions, edgesVersion]);

  // Resize observer
  useEffect(() => {
    const container = svgRef.current?.parentElement;
    if (!container) return;

    const obs = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setDimensions({
          width: entry.contentRect.width,
          height: Math.max(entry.contentRect.height, 500),
        });
      }
    });
    obs.observe(container);
    return () => obs.disconnect();
  }, []);

  // Force simulation
  useEffect(() => {
    let running = true;

    function simulate() {
      if (!running) return;

      const gNodes = graphNodesRef.current;
      const gEdges = allEdges.current;
      const cx = dimensions.width / 2;
      const cy = dimensions.height / 2;

      for (const node of gNodes) {
        node.vx += (cx - node.x) * CENTER_GRAVITY;
        node.vy += (cy - node.y) * CENTER_GRAVITY;
      }

      for (let i = 0; i < gNodes.length; i++) {
        for (let j = i + 1; j < gNodes.length; j++) {
          const a = gNodes[i];
          const b = gNodes[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const distSq = dx * dx + dy * dy + 1;
          const force = REPULSION / distSq;
          const fx = dx * force;
          const fy = dy * force;
          a.vx -= fx;
          a.vy -= fy;
          b.vx += fx;
          b.vy += fy;
        }
      }

      const nodeMap = new Map(gNodes.map((n) => [n.id, n]));
      for (const edge of gEdges) {
        const a = nodeMap.get(edge.source);
        const b = nodeMap.get(edge.target);
        if (!a || !b) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const strength = edge.dashed ? ATTRACTION * 0.5 : ATTRACTION;
        const fx = dx * strength;
        const fy = dy * strength;
        a.vx += fx;
        a.vy += fy;
        b.vx -= fx;
        b.vy -= fy;
      }

      let totalMovement = 0;
      for (const node of gNodes) {
        if (draggingRef.current === node.id) {
          node.vx = 0;
          node.vy = 0;
          continue;
        }
        node.vx *= DAMPING;
        node.vy *= DAMPING;
        node.x += node.vx;
        node.y += node.vy;

        node.x = Math.max(
          NODE_RADIUS_BASE,
          Math.min(dimensions.width - NODE_RADIUS_BASE, node.x)
        );
        node.y = Math.max(
          NODE_RADIUS_BASE,
          Math.min(dimensions.height - NODE_RADIUS_BASE, node.y)
        );

        totalMovement += Math.abs(node.vx) + Math.abs(node.vy);
      }

      forceRender((v) => v + 1);

      if (
        totalMovement > MIN_VELOCITY * gNodes.length ||
        draggingRef.current
      ) {
        animationRef.current = requestAnimationFrame(simulate);
      }
    }

    animationRef.current = requestAnimationFrame(simulate);
    return () => {
      running = false;
      cancelAnimationFrame(animationRef.current);
    };
  }, [dimensions]);

  // Node drag handlers
  const handleMouseDown = useCallback(
    (nodeId: string, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const node = graphNodesRef.current.find((n) => n.id === nodeId);
      if (!node) return;
      draggingRef.current = nodeId;
      dragStartPosRef.current = { x: e.clientX, y: e.clientY };
      didDragRef.current = false;
    },
    []
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (draggingRef.current) {
        const node = graphNodesRef.current.find(
          (n) => n.id === draggingRef.current
        );
        if (!node) return;

        const svgRect = svgRef.current?.getBoundingClientRect();
        if (!svgRect) return;

        const dx = e.clientX - dragStartPosRef.current.x;
        const dy = e.clientY - dragStartPosRef.current.y;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
          didDragRef.current = true;
        }

        node.x =
          (e.clientX - svgRect.left - transform.translateX) / transform.scale;
        node.y =
          (e.clientY - svgRect.top - transform.translateY) / transform.scale;
        return;
      }

      if (isPanningRef.current) {
        const dx = e.clientX - panStartRef.current.x;
        const dy = e.clientY - panStartRef.current.y;
        setTransform((prev) => ({
          ...prev,
          translateX: panStartRef.current.tx + dx,
          translateY: panStartRef.current.ty + dy,
        }));
      }
    },
    [transform.scale, transform.translateX, transform.translateY]
  );

  const handleMouseUp = useCallback(() => {
    draggingRef.current = null;
    isPanningRef.current = false;
  }, []);

  // Connect mode: clicking a node either selects it as first or second
  const handleNodeClick = useCallback(
    (node: GraphNode) => {
      if (didDragRef.current) return;

      if (connectMode) {
        if (!connectFirst) {
          setConnectFirst(node.id);
          toast.info(`Selected "${node.title}". Now click the second node.`);
        } else if (node.id !== connectFirst) {
          setConnectSecond(node.id);
          setShowLabelDialog(true);
        }
        return;
      }

      // Preview mode: show sidebar
      setPreviewNode(node);
      setShowPreview(true);
    },
    [connectMode, connectFirst]
  );

  // Create connection
  async function createConnection() {
    if (!connectFirst || !connectSecond) return;
    setConnectLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setConnectLoading(false);
      return;
    }

    const label = connectionLabel === "__custom__" ? customLabel : connectionLabel;

    const { error } = await supabase.from("note_connections").insert({
      user_id: user.id,
      note_a_id: connectFirst,
      note_b_id: connectSecond,
      label: label || null,
    });

    if (error) {
      toast.error("Failed to create connection");
    } else {
      toast.success("Connection created");
      // Add edge locally
      allEdges.current.push({
        source: connectFirst,
        target: connectSecond,
        label: label || undefined,
        dashed: false,
      });
      setEdgesVersion((v) => v + 1);
    }

    setConnectLoading(false);
    setShowLabelDialog(false);
    setConnectFirst(null);
    setConnectSecond(null);
    setConnectionLabel("");
    setCustomLabel("");
  }

  // AI suggest connections
  async function handleSuggestConnections() {
    setSuggestionsLoading(true);
    setShowSuggestions(true);
    try {
      const res = await fetch("/api/suggest-connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setSuggestions(data.suggestions ?? []);
    } catch {
      toast.error("Failed to get suggestions");
    } finally {
      setSuggestionsLoading(false);
    }
  }

  // Accept a suggested connection
  async function acceptSuggestion(suggestion: ConnectionSuggestion) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("note_connections").insert({
      user_id: user.id,
      note_a_id: suggestion.noteA,
      note_b_id: suggestion.noteB,
      label: suggestion.label || null,
    });

    if (error) {
      toast.error("Failed to create connection");
    } else {
      toast.success("Connection created");
      allEdges.current.push({
        source: suggestion.noteA,
        target: suggestion.noteB,
        label: suggestion.label || undefined,
        dashed: false,
      });
      setEdgesVersion((v) => v + 1);
      setSuggestions((prev) =>
        prev.filter(
          (s) => !(s.noteA === suggestion.noteA && s.noteB === suggestion.noteB)
        )
      );
    }
  }

  // Pan start
  const handleSvgMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const tag = (e.target as SVGElement).tagName.toLowerCase();
      if (
        tag === "svg" ||
        ((e.target as SVGElement).getAttribute("fill") === "transparent" &&
          tag === "rect")
      ) {
        isPanningRef.current = true;
        panStartRef.current = {
          x: e.clientX,
          y: e.clientY,
          tx: transform.translateX,
          ty: transform.translateY,
        };
      }
    },
    [transform.translateX, transform.translateY]
  );

  // Zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const scaleChange = e.deltaY > 0 ? 0.9 : 1.1;
    setTransform((prev) => {
      const newScale = Math.min(3, Math.max(0.2, prev.scale * scaleChange));
      const svgRect = svgRef.current?.getBoundingClientRect();
      if (!svgRect) return { ...prev, scale: newScale };
      const mouseX = e.clientX - svgRect.left;
      const mouseY = e.clientY - svgRect.top;
      const ratio = newScale / prev.scale;
      return {
        scale: newScale,
        translateX: mouseX - (mouseX - prev.translateX) * ratio,
        translateY: mouseY - (mouseY - prev.translateY) * ratio,
      };
    });
  }, []);

  const gNodes = graphNodesRef.current;
  const nodeMap = new Map(gNodes.map((n) => [n.id, n]));
  const lowerQuery = searchQuery.toLowerCase().trim();

  const isNodeMatch = (node: GraphNode) => {
    if (!lowerQuery) return true;
    return node.title.toLowerCase().includes(lowerQuery);
  };

  const presentTypes = new Set(nodes.map((n) => n.type));

  const firstNodeTitle = connectFirst
    ? graphNodesRef.current.find((n) => n.id === connectFirst)?.title ??
      "Unknown"
    : "";
  const secondNodeTitle = connectSecond
    ? graphNodesRef.current.find((n) => n.id === connectSecond)?.title ??
      "Unknown"
    : "";

  return (
    <div className="flex flex-col gap-3">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <input
          type="text"
          placeholder="Search nodes by title..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring sm:w-64"
        />

        {/* Connect mode toggle */}
        <div className="flex items-center gap-2">
          <Button
            variant={connectMode ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setConnectMode(!connectMode);
              setConnectFirst(null);
              setConnectSecond(null);
            }}
          >
            {connectMode ? (
              <MousePointer2 className="size-3.5" />
            ) : (
              <Link2 className="size-3.5" />
            )}
            <span className="ml-1">
              {connectMode ? "Exit Connect" : "Connect"}
            </span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleSuggestConnections}
            disabled={suggestionsLoading}
          >
            {suggestionsLoading ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Sparkles className="size-3.5" />
            )}
            <span className="ml-1">Suggest</span>
          </Button>
        </div>

        {/* Connect mode status */}
        {connectMode && (
          <div className="flex items-center gap-2 text-xs">
            <Badge variant="secondary">
              {connectFirst
                ? `1: ${firstNodeTitle}`
                : "Click first node"}
            </Badge>
            {connectFirst && (
              <Button
                variant="ghost"
                size="xs"
                onClick={() => {
                  setConnectFirst(null);
                  setConnectSecond(null);
                }}
              >
                <X className="size-3" />
              </Button>
            )}
          </div>
        )}

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground sm:ml-auto sm:gap-4">
          {(["note", "idea", "flashcard_deck"] as EntityType[])
            .filter((t) => presentTypes.has(t))
            .map((type) => (
              <div key={type} className="flex items-center gap-1.5">
                <span
                  className="inline-block w-3 h-3 rounded-sm"
                  style={{ backgroundColor: NODE_COLORS[type] }}
                />
                <span>{NODE_LABELS[type]}</span>
              </div>
            ))}
          <div className="flex items-center gap-1.5">
            <svg width={24} height={8}>
              <line
                x1={0}
                y1={4}
                x2={24}
                y2={4}
                stroke="hsl(215, 20%, 70%)"
                strokeWidth={1.5}
              />
            </svg>
            <span>Explicit</span>
          </div>
          <div className="flex items-center gap-1.5">
            <svg width={24} height={8}>
              <line
                x1={0}
                y1={4}
                x2={24}
                y2={4}
                stroke="hsl(35, 60%, 60%)"
                strokeWidth={1.5}
                strokeDasharray="4 3"
              />
            </svg>
            <span>Shared tag</span>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        {/* Graph */}
        <div
          className="w-full rounded-lg border bg-background flex-1"
          style={{ minHeight: 500 }}
        >
          <svg
            ref={svgRef}
            width={dimensions.width}
            height={dimensions.height}
            className={
              connectMode
                ? "cursor-crosshair"
                : "cursor-grab active:cursor-grabbing"
            }
            onMouseDown={handleSvgMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
          >
            <rect
              width={dimensions.width}
              height={dimensions.height}
              fill="transparent"
            />
            <g
              transform={`translate(${transform.translateX},${transform.translateY}) scale(${transform.scale})`}
            >
              {/* Edges */}
              {allEdges.current.map((edge, i) => {
                const a = nodeMap.get(edge.source);
                const b = nodeMap.get(edge.target);
                if (!a || !b) return null;
                const edgeOpacity =
                  lowerQuery && (!isNodeMatch(a) || !isNodeMatch(b))
                    ? 0.05
                    : 0.6;
                return (
                  <g key={`edge-${i}`}>
                    <line
                      x1={a.x}
                      y1={a.y}
                      x2={b.x}
                      y2={b.y}
                      stroke={
                        edge.dashed
                          ? "hsl(35, 60%, 60%)"
                          : "hsl(215, 20%, 70%)"
                      }
                      strokeWidth={1.5}
                      strokeOpacity={edgeOpacity}
                      strokeDasharray={edge.dashed ? "6 4" : undefined}
                    />
                    {edge.label && !edge.dashed && (
                      <text
                        x={(a.x + b.x) / 2}
                        y={(a.y + b.y) / 2 - 6}
                        fontSize={10}
                        fill="hsl(215, 15%, 55%)"
                        textAnchor="middle"
                        opacity={edgeOpacity}
                      >
                        {edge.label}
                      </text>
                    )}
                  </g>
                );
              })}

              {/* Nodes */}
              {gNodes.map((node) => {
                const radius = getNodeRadius(node.type);
                const color = NODE_COLORS[node.type];
                const match = isNodeMatch(node);
                const nodeOpacity = lowerQuery && !match ? 0.1 : 0.9;
                const isConnectSelected =
                  connectMode && connectFirst === node.id;

                return (
                  <g
                    key={node.id}
                    transform={`translate(${node.x},${node.y})`}
                    onMouseDown={(e) => handleMouseDown(node.id, e)}
                    onClick={() => handleNodeClick(node)}
                    className="cursor-pointer"
                    opacity={nodeOpacity}
                  >
                    {renderNodeShape(node.type, radius, color, 1)}
                    {/* Connect mode selected ring */}
                    {isConnectSelected && (
                      <circle
                        r={radius + 5}
                        fill="none"
                        stroke="hsl(140, 70%, 50%)"
                        strokeWidth={3}
                        strokeDasharray="4 2"
                      />
                    )}
                    {/* Search match highlight */}
                    {lowerQuery && match && (
                      <circle
                        r={radius + 4}
                        fill="none"
                        stroke="hsl(45, 100%, 60%)"
                        strokeWidth={2}
                      />
                    )}
                    <text
                      y={radius + 14}
                      fontSize={11}
                      fill="currentColor"
                      textAnchor="middle"
                      className="pointer-events-none select-none"
                    >
                      {node.title.length > 16
                        ? node.title.slice(0, 15) + "\u2026"
                        : node.title}
                    </text>
                    <text
                      fontSize={10}
                      fill="white"
                      textAnchor="middle"
                      dominantBaseline="central"
                      className="pointer-events-none select-none font-medium"
                    >
                      {node.connectionCount}
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>
        </div>

        {/* Suggested connections panel */}
        {showSuggestions && (
          <div className="w-80 shrink-0 rounded-lg border bg-background p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium flex items-center gap-1.5">
                <Sparkles className="size-3.5" />
                Suggested Connections
              </h3>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => setShowSuggestions(false)}
              >
                <X className="size-3.5" />
              </Button>
            </div>

            {suggestionsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              </div>
            ) : suggestions.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">
                No new connections suggested. Try adding more notes with content.
              </p>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {suggestions.map((s, i) => (
                  <div
                    key={`${s.noteA}-${s.noteB}-${i}`}
                    className="rounded-md border p-3 text-xs space-y-2"
                  >
                    <div className="flex items-center gap-1 text-foreground font-medium">
                      <span className="truncate">{s.titleA}</span>
                      <span className="text-muted-foreground shrink-0">
                        &harr;
                      </span>
                      <span className="truncate">{s.titleB}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Badge variant="outline" className="text-[10px]">
                        {s.label}
                      </Badge>
                      <span className="text-muted-foreground">{s.reason}</span>
                    </div>
                    <Button
                      variant="outline"
                      size="xs"
                      className="w-full"
                      onClick={() => acceptSuggestion(s)}
                    >
                      <Link2 className="size-3" />
                      <span className="ml-1">Connect</span>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Connection label dialog */}
      <Dialog
        open={showLabelDialog}
        onOpenChange={(open) => {
          if (!open) {
            setShowLabelDialog(false);
            setConnectFirst(null);
            setConnectSecond(null);
            setConnectionLabel("");
            setCustomLabel("");
          }
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Create Connection</DialogTitle>
            <DialogDescription>
              Connect &quot;{firstNodeTitle}&quot; and &quot;{secondNodeTitle}
              &quot;. Choose an optional label.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="flex flex-wrap gap-2">
              {CONNECTION_LABELS.map((label) => (
                <Button
                  key={label}
                  variant={connectionLabel === label ? "default" : "outline"}
                  size="xs"
                  onClick={() => {
                    setConnectionLabel(
                      connectionLabel === label ? "" : label
                    );
                  }}
                >
                  {label}
                </Button>
              ))}
              <Button
                variant={
                  connectionLabel === "__custom__" ? "default" : "outline"
                }
                size="xs"
                onClick={() =>
                  setConnectionLabel(
                    connectionLabel === "__custom__" ? "" : "__custom__"
                  )
                }
              >
                Custom...
              </Button>
            </div>
            {connectionLabel === "__custom__" && (
              <input
                type="text"
                placeholder="Enter custom label..."
                value={customLabel}
                onChange={(e) => setCustomLabel(e.target.value)}
                className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                autoFocus
              />
            )}
          </div>
          <DialogFooter>
            <DialogClose
              render={<Button variant="outline" size="sm" />}
            >
              Cancel
            </DialogClose>
            <Button
              size="sm"
              onClick={createConnection}
              disabled={connectLoading}
            >
              {connectLoading ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Link2 className="size-3.5" />
              )}
              <span className="ml-1">Connect</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Node preview sidebar */}
      <Sheet
        open={showPreview}
        onOpenChange={(open) => {
          if (!open) {
            setShowPreview(false);
            setPreviewNode(null);
          }
        }}
      >
        <SheetContent side="right">
          {previewNode && (
            <>
              <SheetHeader>
                <SheetTitle>{previewNode.title}</SheetTitle>
                <SheetDescription>
                  {previewNode.type === "note"
                    ? "Note"
                    : previewNode.type === "idea"
                      ? "Idea"
                      : "Flashcard Deck"}
                  {" \u00B7 "}
                  {previewNode.connectionCount} connection
                  {previewNode.connectionCount !== 1 ? "s" : ""}
                </SheetDescription>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto px-4 space-y-4">
                {/* Content snippet */}
                {previewNode.contentSnippet && (
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground mb-1">
                      Content
                    </h4>
                    <p className="text-sm text-foreground/80">
                      {previewNode.contentSnippet}
                    </p>
                  </div>
                )}

                {/* Tags */}
                {previewNode.tags.length > 0 && (
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
                      <Tag className="size-3" />
                      Tags
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {previewNode.tags.map((tag) => (
                        <Badge key={tag} variant="secondary">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Connected nodes */}
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground mb-1.5">
                    Connected to
                  </h4>
                  <div className="space-y-1">
                    {allEdges.current
                      .filter(
                        (e) =>
                          e.source === previewNode.id ||
                          e.target === previewNode.id
                      )
                      .map((edge, i) => {
                        const otherId =
                          edge.source === previewNode.id
                            ? edge.target
                            : edge.source;
                        const other = nodeMap.get(otherId);
                        if (!other) return null;
                        return (
                          <div
                            key={i}
                            className="flex items-center gap-2 text-xs rounded-md border p-2"
                          >
                            <span
                              className="inline-block w-2 h-2 rounded-sm shrink-0"
                              style={{
                                backgroundColor: NODE_COLORS[other.type],
                              }}
                            />
                            <span className="truncate">{other.title}</span>
                            {edge.label && (
                              <Badge variant="outline" className="text-[10px] shrink-0">
                                {edge.label}
                              </Badge>
                            )}
                          </div>
                        );
                      })}
                    {allEdges.current.filter(
                      (e) =>
                        e.source === previewNode.id ||
                        e.target === previewNode.id
                    ).length === 0 && (
                      <p className="text-xs text-muted-foreground">
                        No connections yet.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Open link */}
              <div className="p-4 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  render={
                    <Link href={getEntityLink(previewNode.type, previewNode.id)} />
                  }
                >
                  <ExternalLink className="size-3.5" />
                  <span className="ml-1">Open</span>
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
