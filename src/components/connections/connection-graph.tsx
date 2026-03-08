"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface GraphNode {
  id: string;
  title: string;
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
}

interface ConnectionGraphProps {
  nodes: { id: string; title: string }[];
  edges: { source: string; target: string; label?: string }[];
}

const NODE_RADIUS = 24;
const REPULSION = 3000;
const ATTRACTION = 0.005;
const CENTER_GRAVITY = 0.01;
const DAMPING = 0.9;
const MIN_VELOCITY = 0.01;

function getNodeColor(count: number): string {
  if (count === 0) return "hsl(215, 20%, 65%)";
  if (count === 1) return "hsl(200, 60%, 55%)";
  if (count === 2) return "hsl(170, 60%, 45%)";
  if (count <= 4) return "hsl(140, 60%, 45%)";
  return "hsl(45, 80%, 50%)";
}

export function ConnectionGraph({ nodes, edges }: ConnectionGraphProps) {
  const router = useRouter();
  const svgRef = useRef<SVGSVGElement>(null);
  const animationRef = useRef<number>(0);
  const draggingRef = useRef<string | null>(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  const connectionCountMap = useRef<Record<string, number>>({});

  // Build connection counts
  useEffect(() => {
    const counts: Record<string, number> = {};
    for (const node of nodes) {
      counts[node.id] = 0;
    }
    for (const edge of edges) {
      counts[edge.source] = (counts[edge.source] ?? 0) + 1;
      counts[edge.target] = (counts[edge.target] ?? 0) + 1;
    }
    connectionCountMap.current = counts;
  }, [nodes, edges]);

  // Initialize graph nodes with random positions
  const graphNodesRef = useRef<GraphNode[]>([]);
  const graphEdgesRef = useRef<GraphEdge[]>(edges);

  const [, forceRender] = useState(0);

  useEffect(() => {
    const counts: Record<string, number> = {};
    for (const node of nodes) counts[node.id] = 0;
    for (const edge of edges) {
      counts[edge.source] = (counts[edge.source] ?? 0) + 1;
      counts[edge.target] = (counts[edge.target] ?? 0) + 1;
    }

    graphNodesRef.current = nodes.map((n) => ({
      id: n.id,
      title: n.title,
      x: dimensions.width / 2 + (Math.random() - 0.5) * 300,
      y: dimensions.height / 2 + (Math.random() - 0.5) * 300,
      vx: 0,
      vy: 0,
      connectionCount: counts[n.id] ?? 0,
    }));
    graphEdgesRef.current = edges;
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
      const gEdges = graphEdgesRef.current;
      const cx = dimensions.width / 2;
      const cy = dimensions.height / 2;

      // Reset forces
      for (const node of gNodes) {
        // Center gravity
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
        const fx = dx * ATTRACTION;
        const fy = dy * ATTRACTION;
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

        // Clamp to bounds
        node.x = Math.max(NODE_RADIUS, Math.min(dimensions.width - NODE_RADIUS, node.x));
        node.y = Math.max(NODE_RADIUS, Math.min(dimensions.height - NODE_RADIUS, node.y));

        totalMovement += Math.abs(node.vx) + Math.abs(node.vy);
      }

      forceRender((v) => v + 1);

      if (totalMovement > MIN_VELOCITY * gNodes.length || draggingRef.current) {
        animationRef.current = requestAnimationFrame(simulate);
      } else {
        // Still keep a slow tick alive to respond to drags
        animationRef.current = requestAnimationFrame(simulate);
      }
    }

    animationRef.current = requestAnimationFrame(simulate);
    return () => {
      running = false;
      cancelAnimationFrame(animationRef.current);
    };
  }, [dimensions]);

  const handleMouseDown = useCallback(
    (nodeId: string, e: React.MouseEvent) => {
      e.preventDefault();
      const node = graphNodesRef.current.find((n) => n.id === nodeId);
      if (!node) return;
      draggingRef.current = nodeId;
      dragOffsetRef.current = {
        x: e.clientX - node.x,
        y: e.clientY - node.y,
      };
    },
    []
  );

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!draggingRef.current) return;
    const node = graphNodesRef.current.find(
      (n) => n.id === draggingRef.current
    );
    if (!node) return;

    const svgRect = svgRef.current?.getBoundingClientRect();
    if (!svgRect) return;

    node.x = e.clientX - svgRect.left;
    node.y = e.clientY - svgRect.top;
  }, []);

  const handleMouseUp = useCallback(() => {
    draggingRef.current = null;
  }, []);

  const handleNodeClick = useCallback(
    (nodeId: string) => {
      if (!draggingRef.current) {
        router.push(`/notes/${nodeId}`);
      }
    },
    [router]
  );

  const gNodes = graphNodesRef.current;
  const nodeMap = new Map(gNodes.map((n) => [n.id, n]));

  return (
    <div className="w-full rounded-lg border bg-background" style={{ minHeight: 500 }}>
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        className="cursor-grab active:cursor-grabbing"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Edges */}
        {graphEdgesRef.current.map((edge, i) => {
          const a = nodeMap.get(edge.source);
          const b = nodeMap.get(edge.target);
          if (!a || !b) return null;
          return (
            <g key={`edge-${i}`}>
              <line
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke="hsl(215, 20%, 70%)"
                strokeWidth={1.5}
                strokeOpacity={0.6}
              />
              {edge.label && (
                <text
                  x={(a.x + b.x) / 2}
                  y={(a.y + b.y) / 2 - 6}
                  fontSize={10}
                  fill="hsl(215, 15%, 55%)"
                  textAnchor="middle"
                >
                  {edge.label}
                </text>
              )}
            </g>
          );
        })}

        {/* Nodes */}
        {gNodes.map((node) => (
          <g
            key={node.id}
            transform={`translate(${node.x},${node.y})`}
            onMouseDown={(e) => handleMouseDown(node.id, e)}
            onClick={() => handleNodeClick(node.id)}
            className="cursor-pointer"
          >
            <circle
              r={NODE_RADIUS}
              fill={getNodeColor(node.connectionCount)}
              stroke="white"
              strokeWidth={2}
              opacity={0.9}
            />
            <text
              y={NODE_RADIUS + 14}
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
        ))}
      </svg>
    </div>
  );
}
