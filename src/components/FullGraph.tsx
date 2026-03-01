import { useRef, useCallback, useEffect, useState, useMemo } from 'react';
import ForceGraph3D from 'react-force-graph-3d';
import type { ForceGraphMethods } from 'react-force-graph-3d';
import * as THREE from 'three';
import { buildNodeObject } from './GraphNodeFactory';
import type { GraphData, GraphNode } from '../lib/types';

// ─── Constants ────────────────────────────────────────────────────────────────

const BG_DARK  = '#0a0a0a';
const BG_LIGHT = '#f5f5f5';
const STORAGE_KEY = 'galaxybrain-theme';

// ─── Component ────────────────────────────────────────────────────────────────

export default function FullGraph() {
  const fgRef = useRef<ForceGraphMethods | undefined>(undefined);

  // ── Data loading ───────────────────────────────────────────────────────────
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/graph.json')
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() as Promise<GraphData>; })
      .then(setGraphData)
      .catch((err: unknown) => setLoadError(String(err)));
  }, []);

  // ── Dark / light mode ──────────────────────────────────────────────────────
  const [isDark, setIsDark] = useState<boolean>(() => {
    try { return (localStorage.getItem(STORAGE_KEY) ?? 'dark') !== 'light'; }
    catch { return true; }
  });

  const toggleTheme = useCallback(() => {
    setIsDark((prev) => {
      const next = !prev;
      try { localStorage.setItem(STORAGE_KEY, next ? 'dark' : 'light'); } catch { /* ignore */ }
      return next;
    });
  }, []);

  const bgColor     = isDark ? BG_DARK  : BG_LIGHT;
  const uiTextColor = isDark ? '#e0e0e0' : '#111111';
  const uiBgColor   = isDark ? 'rgba(20,20,20,0.9)' : 'rgba(240,240,240,0.9)';
  const uiBorder    = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)';

  // ── Collapse state ─────────────────────────────────────────────────────────
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (!graphData) return;
    const s = new Set<string>();
    graphData.nodes.forEach((n) => { if (n.collapsible) s.add(n.id); });
    setCollapsedNodes(s);
  }, [graphData]);

  // ── Tag highlight ──────────────────────────────────────────────────────────
  const [highlightedTag, setHighlightedTag] = useState<string | null>(null);

  // ── Dimensions ────────────────────────────────────────────────────────────
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });
  useEffect(() => {
    const onResize = () => setDimensions({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // ── Tooltip (imperative — zero React re-renders on hover/mousemove) ────────
  const tooltipRef = useRef<HTMLDivElement>(null);

  const updateTooltipPosition = useCallback((x: number, y: number) => {
    const el = tooltipRef.current;
    if (!el || el.style.display === 'none') return;
    el.style.left = `${x + 14}px`;
    el.style.top  = `${y + 14}px`;
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    updateTooltipPosition(e.clientX, e.clientY);
  }, [updateTooltipPosition]);

  // ── Visible data (stable reference → force sim never restarts spuriously) ──
  const visibleData = useMemo((): GraphData => {
    if (!graphData) return { nodes: [], links: [] };
    if (collapsedNodes.size === 0) return graphData;
    const hidden = new Set<string>();
    graphData.links.forEach((l) => {
      const src = typeof l.source === 'object' ? (l.source as GraphNode).id : l.source as string;
      const tgt = typeof l.target === 'object' ? (l.target as GraphNode).id : l.target as string;
      if (collapsedNodes.has(src) && l.type === 'wikilink') hidden.add(tgt);
    });
    return {
      nodes: graphData.nodes.filter((n) => !hidden.has(n.id)),
      links: graphData.links.filter((l) => {
        const src = typeof l.source === 'object' ? (l.source as GraphNode).id : l.source as string;
        const tgt = typeof l.target === 'object' ? (l.target as GraphNode).id : l.target as string;
        return !hidden.has(src) && !hidden.has(tgt);
      }),
    };
  }, [graphData, collapsedNodes]);

  // ── Node THREE.js objects ─────────────────────────────────────────────────
  const nodeThreeObject = useCallback((rawNode: object) => {
    const node = rawNode as GraphNode;
    const isHighlighted =
      highlightedTag !== null &&
      (graphData?.links ?? []).some((l) => {
        const src = typeof l.source === 'object' ? (l.source as GraphNode).id : l.source as string;
        const tgt = typeof l.target === 'object' ? (l.target as GraphNode).id : l.target as string;
        return tgt === highlightedTag && src === node.id;
      });

    const obj = buildNodeObject(node.type, node.shape, node.color, node.val);

    if (highlightedTag !== null && !isHighlighted && node.id !== highlightedTag) {
      obj.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mat = (child as THREE.Mesh).material as THREE.MeshLambertMaterial;
          if (mat) { mat.transparent = true; mat.opacity = 0.08; }
        }
      });
    }
    return obj;
  }, [highlightedTag, graphData]);

  // ── Hover ──────────────────────────────────────────────────────────────────
  const handleNodeHover = useCallback((rawNode: object | null) => {
    const el = tooltipRef.current;
    if (!el) return;
    if (!rawNode) { el.style.display = 'none'; return; }
    const node = rawNode as GraphNode;
    let content = node.name;
    if (node.type === 'ghost') content = `${node.name}\nNote not yet created.`;
    else if (node.type === 'tag') content = node.name;
    else if (node.excerpt) content = `${node.name}\n${node.excerpt}`;
    if (node.collapsible && collapsedNodes.has(node.id)) content += '\n[Click to expand]';
    el.textContent      = content;
    el.style.background = uiBgColor;
    el.style.color      = uiTextColor;
    el.style.border     = `1px solid ${uiBorder}`;
    el.style.display    = 'block';
  }, [collapsedNodes, uiBgColor, uiTextColor, uiBorder]);

  // ── Click ──────────────────────────────────────────────────────────────────
  const handleNodeClick = useCallback((rawNode: object) => {
    const node = rawNode as GraphNode;
    if (node.type === 'ghost') return;
    if (node.type === 'tag') { setHighlightedTag((p) => (p === node.id ? null : node.id)); return; }
    if (node.collapsible && collapsedNodes.has(node.id)) {
      setCollapsedNodes((p) => { const n = new Set(p); n.delete(node.id); return n; });
      return;
    }
    if (node.path) window.location.href = node.path;
  }, [collapsedNodes]);

  // ── Right-click: fly camera ────────────────────────────────────────────────
  const handleNodeRightClick = useCallback((rawNode: object, event: MouseEvent) => {
    event.preventDefault();
    const node = rawNode as GraphNode & { x?: number; y?: number; z?: number };
    if (!fgRef.current || node.x == null) return;
    const dist   = 80;
    const mag    = Math.hypot(node.x, node.y ?? 0, node.z ?? 0) || 1;
    const ratio  = 1 + dist / mag;
    fgRef.current.cameraPosition(
      { x: node.x * ratio, y: (node.y ?? 0) * ratio, z: (node.z ?? 0) * ratio },
      { x: node.x, y: node.y ?? 0, z: node.z ?? 0 },
      1500,
    );
  }, []);

  // ── Link color ────────────────────────────────────────────────────────────
  const linkColor = useCallback((rawLink: object) => {
    const l = rawLink as { type: string };
    if (l.type === 'file-tag')      return '#e74c3c44';
    if (l.type === 'tag-hierarchy') return '#e67e2244';
    return isDark ? '#ffffff22' : '#00000022';
  }, [isDark]);

  // ── Loading / error ────────────────────────────────────────────────────────
  if (loadError) {
    return (
      <div style={{ width: '100vw', height: '100vh', background: bgColor, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#e74c3c', fontFamily: 'sans-serif' }}>
        Failed to load graph.json: {loadError}
      </div>
    );
  }

  if (!graphData) {
    // Dark (or light) empty canvas while fetch completes
    return <div style={{ width: '100vw', height: '100vh', background: bgColor }} />;
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div
      style={{ width: '100vw', height: '100vh', background: bgColor, overflow: 'hidden', position: 'relative' }}
      onMouseMove={handleMouseMove}
    >
      <ForceGraph3D
        ref={fgRef}
        graphData={visibleData}
        width={dimensions.width}
        height={dimensions.height}
        backgroundColor={bgColor}
        nodeThreeObject={nodeThreeObject}
        nodeThreeObjectExtend={false}
        onNodeClick={handleNodeClick}
        onNodeRightClick={handleNodeRightClick}
        onNodeHover={handleNodeHover}
        linkColor={linkColor}
        linkOpacity={0.5}
        linkWidth={0.5}
        linkDirectionalParticles={2}
        linkDirectionalParticleWidth={0.8}
        linkDirectionalParticleSpeed={0.005}
        enableNodeDrag={true}
        enableNavigationControls={true}
        showNavInfo={false}
      />

      {/* Dark / light toggle — fixed top-right, persists to localStorage */}
      <button
        onClick={toggleTheme}
        title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        style={{
          position:       'fixed',
          top:            16,
          right:          16,
          zIndex:         9999,
          background:     uiBgColor,
          color:          uiTextColor,
          border:         `1px solid ${uiBorder}`,
          borderRadius:   8,
          padding:        '6px 12px',
          fontSize:       18,
          cursor:         'pointer',
          lineHeight:     1,
          backdropFilter: 'blur(4px)',
        }}
      >
        {isDark ? '☀️' : '🌙'}
      </button>

      {/* Tooltip — single DOM node, updated imperatively */}
      <div
        ref={tooltipRef}
        style={{
          display:        'none',
          position:       'fixed',
          left:           0,
          top:            0,
          padding:        '8px 12px',
          borderRadius:   6,
          fontSize:       13,
          pointerEvents:  'none',
          whiteSpace:     'pre-line',
          maxWidth:       260,
          zIndex:         9999,
          backdropFilter: 'blur(4px)',
        }}
      />

      {/* Tag filter banner */}
      {highlightedTag !== null && (
        <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', background: 'rgba(231,76,60,0.18)', border: '1px solid #e74c3c', color: '#e74c3c', padding: '6px 16px', borderRadius: 20, fontSize: 13, pointerEvents: 'none', zIndex: 9999 }}>
          Filtering by {graphData.nodes.find((n) => n.id === highlightedTag)?.name ?? highlightedTag} — click tag again to clear
        </div>
      )}

      {/* Hint bar */}
      <div style={{ position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)', background: isDark ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.75)', color: uiTextColor, padding: '5px 14px', borderRadius: 20, fontSize: 12, pointerEvents: 'none', zIndex: 9998, border: `1px solid ${uiBorder}`, whiteSpace: 'nowrap', backdropFilter: 'blur(4px)' }}>
        Left-click file → navigate &nbsp;|&nbsp; Left-click tag → filter &nbsp;|&nbsp; Right-click → focus camera &nbsp;|&nbsp; Drag to rotate
      </div>
    </div>
  );
}
