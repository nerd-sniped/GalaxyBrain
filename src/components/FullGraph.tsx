import { useRef, useCallback, useEffect, useState, useMemo } from 'react';
import ForceGraph3D from 'react-force-graph-3d';
import type { ForceGraphMethods } from 'react-force-graph-3d';
import * as THREE from 'three';
import { buildNodeObject } from './GraphNodeFactory';
import type { GraphData, GraphNode } from '../lib/types';

// ─── Constants ────────────────────────────────────────────────────────────────

const BG_DARK  = '#0a0a0a';
const BG_LIGHT = '#f5f5f5';
const STORAGE_KEY = 'theme';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function resolveId(v: unknown): string {
  return typeof v === 'object' && v !== null ? (v as GraphNode).id : (v as string);
}

/** Create a "+" sprite texture canvas, cached per call */
function makePlusSprite(): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 64; canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, 64, 64);
  // Circular background
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.beginPath(); ctx.arc(32, 32, 28, 0, Math.PI * 2); ctx.fill();
  // "+" symbol
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 36px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('+', 32, 33);
  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true });
  return new THREE.Sprite(mat);
}

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
  // Listen for theme-change dispatched by the global BaseLayout toggle
  useEffect(() => {
    const onThemeChange = (e: Event) => {
      const detail = (e as CustomEvent<{ theme: string }>).detail;
      setIsDark(detail.theme !== 'light');
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setIsDark((e.newValue ?? 'dark') !== 'light');
    };
    window.addEventListener('theme-change', onThemeChange);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('theme-change', onThemeChange);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const bgColor     = isDark ? BG_DARK  : BG_LIGHT;
  const uiTextColor = isDark ? '#e0e0e0' : '#111111';
  const uiBgColor   = isDark ? 'rgba(20,20,20,0.9)' : 'rgba(240,240,240,0.9)';
  const uiBorder    = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)';

  // Keep a ref so nodeThreeObject can read current theme without being
  // recreated on every toggle (avoids full node-object rebuild on theme change).
  const isDarkRef = useRef(isDark);
  isDarkRef.current = isDark;
  // When theme changes, ask the graph to refresh its node visuals once.
  useEffect(() => {
    (fgRef.current as { refresh?: () => void } | undefined)?.refresh?.();
  }, [isDark]);

  // ── Collapse state ─────────────────────────────────────────────────────────
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (!graphData) return;
    const s = new Set<string>();
    graphData.nodes.forEach((n) => { if (n.collapsible) s.add(n.id); });
    setCollapsedNodes(s);
  }, [graphData]);

  // ── Tag highlight ──────────────────────────────────────────────────────────
  const [highlightedTag, setHighlightedTag] = useState<string | null>(() => {
    try { return new URLSearchParams(window.location.search).get('highlight'); }
    catch { return null; }
  });

  /**
   * Set of node IDs directly connected to the currently highlighted tag
   * (includes the tag itself). Used for visual dim / brighten logic.
   */
  const highlightedNodeIds = useMemo<Set<string>>(() => {
    if (!highlightedTag || !graphData) return new Set();
    const s = new Set<string>();
    s.add(highlightedTag);
    graphData.links.forEach((l) => {
      const src = resolveId(l.source);
      const tgt = resolveId(l.target);
      if (src === highlightedTag) s.add(tgt);
      if (tgt === highlightedTag) s.add(src);
    });
    return s;
  }, [highlightedTag, graphData]);

  // ── Pulsing PointLights for highlighted tag node ───────────────────────────
  const pulsingLightsRef = useRef<Map<string, THREE.PointLight>>(new Map());

  useEffect(() => {
    if (highlightedTag === null) {
      pulsingLightsRef.current.clear();
      return;
    }
    let rafId: number;
    const animate = () => {
      const t = Date.now() / 1000;
      pulsingLightsRef.current.forEach((light) => {
        light.intensity = 3 + 2 * Math.sin(t * 3);
      });
      rafId = requestAnimationFrame(animate);
    };
    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [highlightedTag]);

  // ── Ghost-click notification (brief "Not yet created" overlay) ────────────
  const [ghostTooltip, setGhostTooltip] = useState<{ x: number; y: number } | null>(null);

  // ── ?focus=noteId query param — auto-focus camera on mount ─────────────────
  const focusNodeId = useMemo<string | null>(() => {
    try { return new URLSearchParams(window.location.search).get('focus'); }
    catch { return null; }
  }, []);

  useEffect(() => {
    if (!focusNodeId || !graphData || !fgRef.current) return;
    // Give the force simulation a few seconds to partially settle before flying
    const timer = setTimeout(() => {
      if (!fgRef.current) return;
      const found = graphData.nodes.find((n) => n.id === focusNodeId) as
        | (GraphNode & { x?: number; y?: number; z?: number })
        | undefined;
      if (!found || found.x == null) return;
      const dist  = 80;
      const mag   = Math.hypot(found.x, found.y ?? 0, found.z ?? 0) || 1;
      const ratio = 1 + dist / mag;
      fgRef.current.cameraPosition(
        { x: found.x * ratio, y: (found.y ?? 0) * ratio, z: (found.z ?? 0) * ratio },
        { x: found.x, y: found.y ?? 0, z: found.z ?? 0 },
        1500,
      );
    }, 4000);
    return () => clearTimeout(timer);
  }, [focusNodeId, graphData]);

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

    // Iteratively propagate hidden status: a node is hidden if ALL its incoming
    // wikilinks come only from collapsed / hidden nodes, starting from collapsed roots.
    const hidden = new Set<string>();

    // Seed: direct wikilink targets of collapsed nodes
    let changed = true;
    while (changed) {
      changed = false;
      graphData.links.forEach((l) => {
        if (l.type !== 'wikilink') return;
        const src = resolveId(l.source);
        const tgt = resolveId(l.target);
        if (hidden.has(tgt)) return;                        // already hidden
        const tgtNode = graphData.nodes.find((n) => n.id === tgt);
        if (tgtNode?.type === 'tag') return;               // tags are never hidden

        if (collapsedNodes.has(src) || hidden.has(src)) {
          // Check whether tgt has ANY incoming wikilink from a visible, non-collapsed node
          const hasOtherParent = graphData.links.some((ll) => {
            if (ll.type !== 'wikilink') return false;
            const llSrc = resolveId(ll.source);
            const llTgt = resolveId(ll.target);
            return llTgt === tgt && llSrc !== src && !collapsedNodes.has(llSrc) && !hidden.has(llSrc);
          });
          if (!hasOtherParent) { hidden.add(tgt); changed = true; }
        }
      });
    }

    return {
      nodes: graphData.nodes.filter((n) => !hidden.has(n.id)),
      links: graphData.links.filter((l) => {
        const src = resolveId(l.source);
        const tgt = resolveId(l.target);
        return !hidden.has(src) && !hidden.has(tgt);
      }),
    };
  }, [graphData, collapsedNodes]);

  // ── Node THREE.js objects ─────────────────────────────────────────────────
  const nodeThreeObject = useCallback((rawNode: object) => {
    const node = rawNode as GraphNode;

    const isHighlightedTag   = node.id === highlightedTag;
    const isConnected        = highlightedTag !== null && highlightedNodeIds.has(node.id);
    const isDimmed           = highlightedTag !== null && !isConnected && !isHighlightedTag;
    const isCollapsed        = node.collapsible && collapsedNodes.has(node.id);

    const group = new THREE.Group();

    // ── base mesh ────────────────────────────────────────────────────────────
    const mesh = buildNodeObject(node.type, node.shape, node.color, node.val, !isDarkRef.current);

    // Scale up highlighted / connected nodes
    if (isHighlightedTag || isConnected) {
      mesh.scale.multiplyScalar(1.35);
    }

    // Dim non-highlighted nodes when a tag is active
    if (isDimmed) {
      mesh.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mat = (child as THREE.Mesh).material as THREE.MeshLambertMaterial;
          if (mat) { mat.transparent = true; mat.opacity = 0.15; }
        }
      });
    }

    // Emissive glow on the highlighted tag itself
    if (isHighlightedTag) {
      mesh.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mat = (child as THREE.Mesh).material as THREE.MeshLambertMaterial;
          if (mat) {
            mat.emissive = new THREE.Color(node.color);
            mat.emissiveIntensity = 0.7;
          }
        }
      });
      // PointLight that will be pulsed by the RAF loop
      const light = new THREE.PointLight(node.color, 4, 60);
      pulsingLightsRef.current.set(node.id, light);
      group.add(light);
    } else {
      pulsingLightsRef.current.delete(node.id);
    }

    group.add(mesh);

    // ── "+" sprite overlay for collapsed nodes ───────────────────────────────
    if (isCollapsed) {
      const sprite = makePlusSprite();
      const spriteScale = Math.cbrt(node.val) * 0.8 * 1.8;
      sprite.scale.set(spriteScale, spriteScale, 1);
      // Offset slightly so it floats above-right of the mesh
      sprite.position.set(spriteScale * 0.4, spriteScale * 0.4, 0);
      group.add(sprite);
    }

    return group;
  }, [highlightedTag, highlightedNodeIds, collapsedNodes]); // isDark via isDarkRef — stable callback, refresh() on theme change

  // ── Hover ──────────────────────────────────────────────────────────────────
  const handleNodeHover = useCallback((rawNode: object | null) => {
    const el = tooltipRef.current;
    if (!el) return;
    if (!rawNode) { el.style.display = 'none'; return; }
    const node = rawNode as GraphNode;
    let content = node.name;
    if (node.type === 'ghost') content = `${node.name}\n(Note not yet created)`;
    else if (node.type === 'tag') content = `#${node.name}`;
    else if (node.excerpt) content = `${node.name}\n${node.excerpt}`;
    if (node.collapsible && collapsedNodes.has(node.id))   content += '\n[Click to expand]';
    if (node.collapsible && !collapsedNodes.has(node.id))  content += '\n[Shift+click to collapse]';
    el.textContent      = content;
    el.style.background = uiBgColor;
    el.style.color      = uiTextColor;
    el.style.border     = `1px solid ${uiBorder}`;
    el.style.display    = 'block';
  }, [collapsedNodes, uiBgColor, uiTextColor, uiBorder]);

  // ── Click ──────────────────────────────────────────────────────────────────
  const handleNodeClick = useCallback((rawNode: object, event: MouseEvent) => {
    const node = rawNode as GraphNode;

    // Ghost node — show brief "not yet created" tooltip at click position
    if (node.type === 'ghost') {
      setGhostTooltip({ x: event.clientX, y: event.clientY });
      setTimeout(() => setGhostTooltip(null), 2200);
      return;
    }

    // Tag node — toggle tag highlight
    if (node.type === 'tag') {
      setHighlightedTag((p) => (p === node.id ? null : node.id));
      return;
    }

    // Shift+click on an expanded collapsible node → re-collapse
    if (event.shiftKey && node.collapsible && !collapsedNodes.has(node.id)) {
      setCollapsedNodes((p) => { const s = new Set(p); s.add(node.id); return s; });
      return;
    }

    // Click on a collapsed node → expand
    if (node.collapsible && collapsedNodes.has(node.id)) {
      setCollapsedNodes((p) => { const s = new Set(p); s.delete(node.id); return s; });
      return;
    }

    // File node with a path → navigate
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

  // ── Link color (respects tag-highlight state) ─────────────────────────────
  const linkColor = useCallback((rawLink: object) => {
    const l = rawLink as { type: string; source: unknown; target: unknown };

    if (highlightedTag !== null) {
      const src = resolveId(l.source);
      const tgt = resolveId(l.target);
      const connected = highlightedNodeIds.has(src) && highlightedNodeIds.has(tgt);
      if (connected) {
        if (l.type === 'file-tag')      return '#e74c3ccc';
        if (l.type === 'tag-hierarchy') return '#e67e22cc';
        return isDark ? '#ffffffcc' : '#000000cc';
      }
      // Dimmed links
      if (l.type === 'file-tag')      return '#e74c3c0a';
      if (l.type === 'tag-hierarchy') return '#e67e220a';
      return isDark ? '#ffffff0a' : '#0000000a';
    }

    if (l.type === 'file-tag')      return '#e74c3c44';
    if (l.type === 'tag-hierarchy') return '#e67e2244';
    return isDark ? '#ffffff22' : '#00000022';
  }, [isDark, highlightedTag, highlightedNodeIds]);

  // ── Loading / error ────────────────────────────────────────────────────────
  if (loadError) {
    return (
      <div style={{ width: '100vw', height: '100vh', background: bgColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, color: '#e74c3c', fontFamily: 'sans-serif' }}>
        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <span>Could not load graph</span>
        <span style={{ fontSize: 12, opacity: 0.6 }}>{loadError}</span>
      </div>
    );
  }

  if (!graphData) {
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
        linkDirectionalParticles={1}
        linkDirectionalParticleWidth={0.8}
        linkDirectionalParticleSpeed={0.005}
        enableNodeDrag={true}
        enableNavigationControls={true}
        showNavInfo={false}
      />

      {/* Dark / light toggle has moved to BaseLayout */}

      {/* Hover tooltip — single DOM node, updated imperatively */}
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

      {/* Ghost-click "not yet created" toast */}
      {ghostTooltip && (
        <div
          style={{
            position:      'fixed',
            left:          ghostTooltip.x + 12,
            top:           ghostTooltip.y + 12,
            background:    'rgba(40,40,40,0.92)',
            color:         '#e0e0e0',
            border:        '1px solid rgba(255,255,255,0.18)',
            padding:       '6px 14px',
            borderRadius:  8,
            fontSize:      13,
            pointerEvents: 'none',
            zIndex:        10000,
            animation:     'fadeOut 2.2s forwards',
          }}
        >
          Note not yet created
        </div>
      )}

      {/* Tag filter banner */}
      {highlightedTag !== null && (
        <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', background: 'rgba(231,76,60,0.18)', border: '1px solid #e74c3c', color: '#e74c3c', padding: '6px 16px', borderRadius: 20, fontSize: 13, pointerEvents: 'none', zIndex: 9999 }}>
          Filtering by #{graphData.nodes.find((n) => n.id === highlightedTag)?.name ?? highlightedTag} — click tag again to clear
        </div>
      )}

      {/* Hint bar */}
      <div style={{ position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)', background: isDark ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.75)', color: uiTextColor, padding: '5px 14px', borderRadius: 20, fontSize: 12, pointerEvents: 'none', zIndex: 9998, border: `1px solid ${uiBorder}`, whiteSpace: 'nowrap', backdropFilter: 'blur(4px)' }}>
        Click file → navigate &nbsp;|&nbsp; Shift+click → collapse &nbsp;|&nbsp; Click tag → filter &nbsp;|&nbsp; Right-click → focus &nbsp;|&nbsp; Drag to rotate
      </div>
    </div>
  );
}
