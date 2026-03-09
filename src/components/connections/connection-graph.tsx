"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export type EntityType = "note" | "idea" | "flashcard_deck";

export interface GraphNodeInput {
  id: string;
  title: string;
  type: EntityType;
  tags?: string[];
}

interface GraphNode {
  id: string;
  title: string;
  type: EntityType;
  tags: string[];
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
      // Diamond shape
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
      // Rounded rectangle
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
      // Circle for notes
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

export function ConnectionGraph({ nodes, edges }: ConnectionGraphProps) {
  const router = useRouter();
  const svgRef = useRef<SVGSVGElement>(null);
  const animationRef = useRef<number>(0);
  const draggingRef = useRef<string | null>(null);
  const dragStartPosRef = useRef({ x: 0, y: 0 });
  const didDragRef = useRef(false);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  // Search filter state
  const [searchQuery, setSearchQuery] = useState("");

  // Zoom/pan state
  const [transform, setTransform] = useState({ scale: 1, translateX: 0, translateY: 0 });
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0, tx: 0, ty: 0 });

  // Build combined edges: explicit + tag-based
  const allEdges = useRef<GraphEdge[]>([]);

  useEffect(() => {
    const tagEdges = buildTagEdges(nodes);
    // Deduplicate: don't add tag edge if explicit edge already exists
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
  }, [nodes, edges]);

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
      x: dimensions.width / 2 + (Math.random() - 0.5) * 300,
      y: dimensions.height / 2 + (Math.random() - 0.5) * 300,
      vx: 0,
      vy: 0,
      connectionCount: counts[n.id] ?? 0,
    }));
  }, [nodes, edges, dimensions]);

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

      // Center gravity
      for (const node of gNodes) {
        node.vx += (cx - node.x) * CENTER_GRAVITY;
        node.vy += (cy - node.y) * CENTER_GRAVITY;
      }

      // Repulsion between all pairs
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

      // Attraction along edges
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

      // Apply velocity with damping
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

      if (totalMovement > MIN_VELOCITY * gNodes.length || draggingRef.current) {
        animationRef.current = requestAnimationFrame(simulate);
      }
      // Stop animation when simulation settles to save CPU
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
      // Handle node dragging
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

        // Convert screen coords to SVG coords accounting for transform
        node.x = (e.clientX - svgRect.left - transform.translateX) / transform.scale;
        node.y = (e.clientY - svgRect.top - transform.translateY) / transform.scale;
        return;
      }

      // Handle panning
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

  const handleNodeClick = useCallback(
    (node: GraphNode) => {
      if (didDragRef.current) return;
      switch (node.type) {
        case "note":
          router.push(`/notes/${node.id}`);
          break;
        case "idea":
          router.push(`/ideas`);
          break;
        case "flashcard_deck":
          router.push(`/flashcards/${node.id}`);
          break;
      }
    },
    [router]
  );

  // Pan start (on SVG background)
  const handleSvgMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Only start pan if clicking on the SVG background (not a node)
      const tag = (e.target as SVGElement).tagName.toLowerCase();
      // Only pan when clicking on SVG background or the invisible background rect
      if (tag === "svg" || ((e.target as SVGElement).getAttribute("fill") === "transparent" && tag === "rect")) {
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

  // Zoom with mouse wheel
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const scaleChange = e.deltaY > 0 ? 0.9 : 1.1;
      setTransform((prev) => {
        const newScale = Math.min(3, Math.max(0.2, prev.scale * scaleChange));
        // Zoom toward mouse position
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
    },
    []
  );

  const gNodes = graphNodesRef.current;
  const nodeMap = new Map(gNodes.map((n) => [n.id, n]));
  const lowerQuery = searchQuery.toLowerCase().trim();

  const isNodeMatch = (node: GraphNode) => {
    if (!lowerQuery) return true;
    return node.title.toLowerCase().includes(lowerQuery);
  };

  // Determine which entity types are present for the legend
  const presentTypes = new Set(nodes.map((n) => n.type));

  return (
    <div className="flex flex-col gap-3">
      {/* Search and legend bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <input
          type="text"
          placeholder="Search nodes by title..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring sm:w-64"
        />
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

      {/* Graph */}
      <div
        className="w-full rounded-lg border bg-background"
        style={{ minHeight: 500 }}
      >
        <svg
          ref={svgRef}
          width={dimensions.width}
          height={dimensions.height}
          className="cursor-grab active:cursor-grabbing"
          onMouseDown={handleSvgMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
        >
          {/* Invisible background rect for pan detection */}
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
                      edge.dashed ? "hsl(35, 60%, 60%)" : "hsl(215, 20%, 70%)"
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
                  {/* Highlight ring for search matches */}
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
    </div>
  );
}
