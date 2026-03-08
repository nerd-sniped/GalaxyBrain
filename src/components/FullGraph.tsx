import { useRef, useCallback, useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import ForceGraph3D from 'react-force-graph-3d';
import type { ForceGraphMethods } from 'react-force-graph-3d';
import * as THREE from 'three';
import { buildNodeObject } from './GraphNodeFactory';
import type { GraphData, GraphNode } from '../lib/types';
import { withPublicBase } from '../lib/public-path';

// ─── Constants ────────────────────────────────────────────────────────────────

const BG_DARK  = '#0a0a0a';
const BG_LIGHT = '#f5f5f5';
const STORAGE_KEY = 'theme';

/**
 * Set to false once you've replaced the default template content with your
 * own notes and no longer want the "Build your own" prompt to appear.
 */
const SHOW_BUILD_CTA = true;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function resolveId(v: unknown): string {
  return typeof v === 'object' && v !== null ? (v as GraphNode).id : (v as string);
}

/** Create a "+" sprite texture canvas, cached per call */
function makePlusSprite(): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 128; canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, 128, 128);
  // Circular background
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.beginPath(); ctx.arc(64, 64, 54, 0, Math.PI * 2); ctx.fill();
  // Subtle stroke
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = 4;
  ctx.beginPath(); ctx.arc(64, 64, 54, 0, Math.PI * 2); ctx.stroke();
  // "+" symbol
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 72px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('+', 64, 66);
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
    fetch(withPublicBase('/graph.json'))
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
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string> | null>(null);
  useEffect(() => {
    if (!graphData) return;
    const s = new Set<string>();
    graphData.nodes.forEach((n) => { if (n.collapsible) s.add(n.id); });
    setCollapsedNodes(s);
  }, [graphData]);
  // ── Build CTA (shown once after the first collapsible node is expanded) ──────
  const [showBuildCta, setShowBuildCta] = useState(false);
  const hasShownCtaRef = useRef(false);
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

  // ── "Start here" callout (shown once to new visitors) ─────────────────────
  // Points to the note with `graph.callout: true` in its frontmatter.
  // The callout text comes from `graph.calloutText`.

  const calloutTarget = useMemo(() => {
    if (!graphData) return null;
    return (graphData.nodes.find((n) => n.callout) ?? null) as
      (GraphNode & { x?: number; y?: number; z?: number }) | null;
  }, [graphData]);

  const calloutLabel = calloutTarget?.calloutText || 'Click to get started';

  const [showCallout, setShowCallout] = useState<boolean>(true);
  const [calloutPos, setCalloutPos] = useState<{ x: number; y: number } | null>(null);
  // Keep a ref so the RAF loop always reads the current node position object
  const calloutTargetRef = useRef(calloutTarget);
  calloutTargetRef.current = calloutTarget;
  // Use a ref so handleNodeClick can read current value without re-creating the callback
  const showCalloutRef = useRef(showCallout);
  showCalloutRef.current = showCallout;

  const dismissCallout = useCallback(() => {
    setShowCallout(false);
    setCalloutPos(null);
  }, []);

  // (calloutTarget is derived from graphData via useMemo — no separate tracking effect needed)

  // Inject CSS keyframes once
  useEffect(() => {
    if (!showCallout) return;
    const style = document.createElement('style');
    style.id = 'gb-callout-styles';
    style.textContent = `
      @keyframes gb-pulse {
        0%   { transform: translate(-50%,-50%) scale(1);   opacity: 0.9; }
        100% { transform: translate(-50%,-50%) scale(2.8); opacity: 0;   }
      }
      @keyframes gb-float {
        0%, 100% { transform: translate(-50%,-100%) translateY(0px);  }
        50%       { transform: translate(-50%,-100%) translateY(-7px); }
      }
      @keyframes gb-fadein { from { opacity: 0; } to { opacity: 1; } }
    `;
    document.head.appendChild(style);
    return () => { document.getElementById('gb-callout-styles')?.remove(); };
  }, [showCallout]);

  // RAF loop: project the node's 3D world position to 2D screen coordinates
  useEffect(() => {
    if (!showCallout) return;
    let rafId: number;

    const project = () => {
      const node = calloutTargetRef.current;
      const fg   = fgRef.current as ForceGraphMethods & {
        camera?:   () => THREE.Camera;
        renderer?: () => THREE.WebGLRenderer;
      };
      if (fg && node && node.x != null) {
        const camera   = fg.camera?.();
        const renderer = fg.renderer?.();
        if (camera && renderer) {
          const size = new THREE.Vector2();
          renderer.getSize(size);
          const vec = new THREE.Vector3(node.x, node.y ?? 0, node.z ?? 0);
          vec.project(camera);
          const sx = (vec.x  *  0.5 + 0.5) * size.x;
          const sy = (-vec.y *  0.5 + 0.5) * size.y;
          if (sx > 0 && sy > 0 && sx < size.x && sy < size.y) {
            setCalloutPos({ x: sx, y: sy });
          }
        }
      }
      rafId = requestAnimationFrame(project);
    };

    // Wait for the force simulation to partially settle before tracking
    const startTimer   = setTimeout(() => { rafId = requestAnimationFrame(project); }, 2500);
    // Auto-dismiss after 30 s so return visitors aren't stuck with it
    const dismissTimer = setTimeout(() => dismissCallout(), 30000);

    return () => {
      clearTimeout(startTimer);
      clearTimeout(dismissTimer);
      cancelAnimationFrame(rafId);
    };
  }, [showCallout, dismissCallout]);

  // ── Dimensions ────────────────────────────────────────────────────────────
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });
  useEffect(() => {
    const onResize = () => setDimensions({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // ── Cursor tooltip + preview panel (both updated imperatively) ─────────────
  const tooltipRef = useRef<HTMLDivElement>(null);
  const previewRef  = useRef<HTMLDivElement>(null);

  // Use a native document listener — the Three.js canvas consumes pointer events
  // and prevents the React synthetic onMouseMove from firing on the wrapper.
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const el = tooltipRef.current;
      if (!el || el.style.display === 'none') return;
      el.style.left = `${e.clientX + 14}px`;
      el.style.top  = `${e.clientY + 14}px`;
    };
    document.addEventListener('mousemove', onMove);
    return () => document.removeEventListener('mousemove', onMove);
  }, []);

  // ── Visible data (stable reference → force sim never restarts spuriously) ──
  const visibleData = useMemo((): GraphData => {
    if (!graphData) return { nodes: [], links: [] };
    
    // Compute collapsed nodes: use state if available, otherwise compute on-demand
    const collapsed = collapsedNodes ?? new Set(
      graphData.nodes.filter((n) => n.collapsible).map((n) => n.id)
    );
    
    if (collapsed.size === 0) return graphData;

    // Determine which nodes to hide when a collapsible node is collapsed.
    //
    // Strategy: forward BFS from "absolute root" nodes — nodes that have ZERO
    // incoming wikilinks from ANYWHERE, plus explicitly `pinned: true` nodes.
    //
    // Key rules:
    //   • A collapsed node reached by BFS is added to `visible` but NOT queued —
    //     it shows as a collapsed badge, hiding everything downstream.
    //   • A collapsed node that is NEVER reached by BFS stays hidden entirely,
    //     which fixes the "hub shows up disconnected then disappears on expand" bug.
    //   • `pinned` nodes are always seeded as roots regardless of incoming links.
    const wikilinks = graphData.links.filter((l) => l.type === 'wikilink');
    const fileTags  = graphData.links.filter((l) => l.type === 'file-tag');

    // Build a per-node set of ALL nodes that link TO it (collapsed included).
    const incomingAll = new Map<string, Set<string>>();
    graphData.nodes.forEach((n) => incomingAll.set(n.id, new Set()));
    wikilinks.forEach((l) => {
      const src = resolveId(l.source);
      const tgt = resolveId(l.target);
      incomingAll.get(tgt)?.add(src);
    });

    // Helper: enqueue a node as visible, but only traverse it if it's not collapsed.
    const visible = new Set<string>();
    const queue: string[] = [];
    const addVisible = (id: string) => {
      if (visible.has(id)) return;
      visible.add(id);
      if (!collapsed.has(id)) queue.push(id);
      // collapsed nodes: visible (shown as badge) but not traversed → children hidden
    };

    // Seeds: zero-incoming nodes (true graph roots) + explicitly pinned notes.
    // Tag nodes are excluded (they follow their notes, handled below).
    graphData.nodes.forEach((n) => {
      if (n.type === 'tag') return;
      const isPinned = n.pinned === true;
      const isRoot   = (incomingAll.get(n.id)?.size ?? 0) === 0;
      if (isPinned || isRoot) addVisible(n.id);
    });

    // BFS: propagate visibility forward through wikilinks.
    // Collapsed targets are marked visible-but-not-traversed by addVisible().
    while (queue.length > 0) {
      const cur = queue.shift()!;
      wikilinks.forEach((l) => {
        const src = resolveId(l.source);
        const tgt = resolveId(l.target);
        if (src === cur) addVisible(tgt);
      });
    }

    // Tag nodes become visible only when at least one of their tagged notes is visible.
    fileTags.forEach((l) => {
      const src = resolveId(l.source);
      const tgt = resolveId(l.target);
      if (visible.has(src)) visible.add(tgt);
    });

    return {
      nodes: graphData.nodes.filter((n) => visible.has(n.id)),
      links: graphData.links.filter((l) => {
        const src = resolveId(l.source);
        const tgt = resolveId(l.target);
        return visible.has(src) && visible.has(tgt);
      }),
    };
  }, [graphData, collapsedNodes]);

  // ── Node THREE.js objects ─────────────────────────────────────────────────
  const nodeThreeObject = useCallback((rawNode: object) => {
    const node = rawNode as GraphNode;

    const isHighlightedTag   = node.id === highlightedTag;
    const isConnected        = highlightedTag !== null && highlightedNodeIds.has(node.id);
    const isDimmed           = highlightedTag !== null && !isConnected && !isHighlightedTag;
    const isCollapsed        = node.collapsible && (collapsedNodes?.has(node.id) ?? false);

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
      const spriteScale = Math.cbrt(node.val) * 0.8 * 2.8;
      sprite.scale.set(spriteScale, spriteScale, 1);
      // Float above-right of the mesh
      sprite.position.set(spriteScale * 0.38, spriteScale * 0.38, 0);
      group.add(sprite);
    }

    return group;
  }, [highlightedTag, highlightedNodeIds, collapsedNodes]); // isDark via isDarkRef — stable callback, refresh() on theme change

  // ── Hover ──────────────────────────────────────────────────────────────────
  const handleNodeHover = useCallback((rawNode: object | null) => {
    const el      = tooltipRef.current;
    const preview = previewRef.current;

    if (!rawNode) {
      if (el)      el.style.display = 'none';
      if (preview) { preview.style.opacity = '0'; preview.style.transform = 'translateY(6px)'; }
      return;
    }

    const node = rawNode as GraphNode;

    // ── Name label at cursor ──────────────────────────────────────────────────────
    if (el) {
      el.textContent      = node.type === 'tag' ? `#${node.name}` : node.name;
      el.style.background = uiBgColor;
      el.style.color      = uiTextColor;
      el.style.border     = `1px solid ${uiBorder}`;
      el.style.display    = 'block';
    }

    // ── Rich preview panel at bottom-left edge ────────────────────────────────
    if (preview) {
      const typeLabel   = node.type === 'tag' ? 'tag' : node.type === 'ghost' ? 'unlinked note' : 'note';
      const displayName = node.type === 'tag' ? `#${node.name}` : node.name;

      let excerptHtml = '';
      if (node.type === 'ghost') {
        excerptHtml = `<em style="opacity:0.5">This note hasn't been created yet.</em>`;
      } else if (node.excerpt) {
        excerptHtml = node.excerpt;
      }

      let hint = '';
      if (node.collapsible && collapsedNodes?.has(node.id))  hint = 'Click to expand';
      if (node.collapsible && collapsedNodes && !collapsedNodes.has(node.id)) hint = 'Shift+click to collapse';

      preview.style.background  = uiBgColor;
      preview.style.color       = uiTextColor;
      preview.style.borderColor = uiBorder;
      preview.innerHTML = `
        <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.08em;opacity:0.45;margin-bottom:5px">${typeLabel}</div>
        <div style="font-size:14px;font-weight:600;margin-bottom:${excerptHtml ? '8px' : '0'}">${displayName}</div>
        ${excerptHtml ? `<div style="font-size:12px;opacity:0.72;line-height:1.55">${excerptHtml}</div>` : ''}
        ${hint ? `<div style="font-size:11px;opacity:0.45;margin-top:8px;border-top:1px solid ${uiBorder};padding-top:6px">${hint}</div>` : ''}
      `;
      preview.style.opacity   = '1';
      preview.style.transform = 'translateY(0)';
    }
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
    if (event.shiftKey && node.collapsible && collapsedNodes && !collapsedNodes.has(node.id)) {
      setCollapsedNodes((p) => { const s = new Set(p ?? []); s.add(node.id); return s; });
      return;
    }

    // Click on a collapsed node → expand
    if (node.collapsible && collapsedNodes?.has(node.id)) {
      setCollapsedNodes((p) => { const s = new Set(p ?? []); s.delete(node.id); return s; });
      if (SHOW_BUILD_CTA && !hasShownCtaRef.current) {
        hasShownCtaRef.current = true;
        setTimeout(() => setShowBuildCta(true), 600); // slight delay so the graph expansion animates first
      }
      return;
    }

    // Dismiss if the callout target node is clicked
    if (showCalloutRef.current && node.callout) dismissCallout();

    // File node with a path → navigate
    if (node.path) window.location.href = node.path;
  }, [collapsedNodes, dismissCallout]);  // eslint-disable-line react-hooks/exhaustive-deps

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
        nodeLabel=""
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

      {/* Cursor name label */}
      <div
        ref={tooltipRef}
        style={{
          display:        'none',
          position:       'fixed',
          left:           0,
          top:            0,
          padding:        '5px 10px',
          borderRadius:   6,
          fontSize:       12,
          fontWeight:     600,
          pointerEvents:  'none',
          whiteSpace:     'nowrap',
          zIndex:         9999,
          backdropFilter: 'blur(4px)',
        }}
      />

      {/* Node preview panel — bottom-left edge, slides in on hover */}
      <div
        ref={previewRef}
        style={{
          position:       'fixed',
          bottom:         58,
          left:           20,
          width:          272,
          maxWidth:       'calc(100vw - 40px)',
          padding:        '12px 14px',
          borderRadius:   10,
          border:         '1px solid',
          fontSize:       13,
          lineHeight:     1.4,
          pointerEvents:  'none',
          zIndex:         9999,
          backdropFilter: 'blur(8px)',
          fontFamily:     'sans-serif',
          opacity:        0,
          transform:      'translateY(6px)',
          transition:     'opacity 0.18s ease, transform 0.18s ease',
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

      {/* Tag filter banner — rendered via portal to escape ForceGraph3D canvas event interception */}
      {highlightedTag !== null && createPortal(
        <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(231,76,60,0.18)', border: '1px solid #e74c3c', color: '#e74c3c', padding: '6px 10px 6px 16px', borderRadius: 20, fontSize: 13, zIndex: 99999, userSelect: 'none', pointerEvents: 'none' }}>
          <span>Filtering by #{graphData.nodes.find((n) => n.id === highlightedTag)?.name ?? highlightedTag}</span>
          <button
            onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); setHighlightedTag(null); }}
            style={{ pointerEvents: 'all', background: 'rgba(231,76,60,0.3)', border: '1px solid #e74c3c', color: '#e74c3c', borderRadius: 12, width: 22, height: 22, cursor: 'pointer', fontSize: 13, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, padding: 0 }}
            title="Clear tag filter"
          >✕</button>
        </div>,
        document.body,
      )}

      {/* Start-here callout — rendered via portal, tracks the target node in world space */}
      {showCallout && calloutPos && calloutTarget && createPortal(
        <>
          {/* Pulsing rings centered on the node */}
          {[0, 0.85].map((delay) => (
            <div key={delay} style={{
              position: 'fixed', left: calloutPos.x, top: calloutPos.y,
              transform: 'translate(-50%,-50%)',
              width: 52, height: 52, borderRadius: '50%',
              border: `2px solid ${calloutTarget.color ?? '#3498db'}`,
              animation: `gb-pulse 1.7s ease-out ${delay}s infinite`,
              pointerEvents: 'none', zIndex: 99998,
            }} />
          ))}

          {/* Dashed connector line + arrowhead */}
          <svg style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 99998, overflow: 'visible' }}>
            <defs>
              <marker id="gb-arrowhead" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
                <path d="M0,0 L0,6 L8,3 z" fill={calloutTarget.color ?? '#3498db'} opacity="0.75" />
              </marker>
            </defs>
            <line
              x1={calloutPos.x - 110} y1={calloutPos.y - 75}
              x2={calloutPos.x - 14}  y2={calloutPos.y - 14}
              stroke={calloutTarget.color ?? '#3498db'} strokeWidth="1.5" strokeDasharray="5,4" opacity="0.65"
              markerEnd="url(#gb-arrowhead)"
            />
          </svg>

          {/* Label bubble */}
          <div
            onPointerDown={(e) => { e.stopPropagation(); dismissCallout(); }}
            style={{
              position:       'fixed',
              left:           calloutPos.x - 110,
              top:            calloutPos.y - 75,
              transform:      'translate(-50%, -100%)',
              animation:      'gb-float 2.4s ease-in-out infinite, gb-fadein 0.6s ease',
              zIndex:         99999,
              pointerEvents:  'all',
              cursor:         'pointer',
              background:     isDark ? 'rgba(10,30,60,0.88)' : 'rgba(220,235,255,0.94)',
              border:         `1px solid ${calloutTarget.color ?? '#3498db'}99`,
              borderRadius:   12,
              padding:        '10px 16px',
              color:          isDark ? '#74b9ff' : '#1a5fa8',
              fontSize:       13,
              fontFamily:     'sans-serif',
              textAlign:      'center',
              backdropFilter: 'blur(6px)',
              userSelect:     'none',
              whiteSpace:     'nowrap',
              boxShadow:      `0 4px 20px ${calloutTarget.color ?? '#3498db'}33`,
            }}
            title="Click to dismiss"
          >
            <div style={{ fontWeight: 600 }}>{calloutLabel}</div>
          </div>
        </>,
        document.body,
      )}

      {/* Hint bar */}
      <div style={{ position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)', background: isDark ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.75)', color: uiTextColor, padding: '5px 14px', borderRadius: 20, fontSize: 12, pointerEvents: 'none', zIndex: 9998, border: `1px solid ${uiBorder}`, whiteSpace: 'nowrap', backdropFilter: 'blur(4px)' }}>
        Click file → navigate &nbsp;|&nbsp; Shift+click → collapse &nbsp;|&nbsp; Click tag → filter &nbsp;|&nbsp; Right-click → focus &nbsp;|&nbsp; Drag to rotate
      </div>

      {/* Build-your-own CTA — slides up after first expansion */}
      {showBuildCta && createPortal(
        <div style={{
          position:       'fixed',
          bottom:         62,
          left:           '50%',
          transform:      'translateX(-50%)',
          zIndex:         99999,
          display:        'flex',
          alignItems:     'center',
          gap:            12,
          background:     isDark ? 'rgba(15,25,40,0.92)' : 'rgba(230,240,255,0.95)',
          border:         '1px solid #3498db66',
          borderRadius:   14,
          padding:        '12px 16px',
          backdropFilter: 'blur(10px)',
          boxShadow:      '0 6px 32px rgba(52,152,219,0.22)',
          fontFamily:     'sans-serif',
          animation:      'gb-fadein 0.4s ease',
          whiteSpace:     'nowrap',
        }}>
          <span style={{ fontSize: 13, color: isDark ? '#b0cfe8' : '#1a5fa8' }}>
            Need setup instructions?
          </span>
          <a
            href="https://github.com/nerd-sniped/GalaxyBrain#readme"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize:       13,
              fontWeight:     600,
              color:          '#fff',
              background:     '#3498db',
              border:         'none',
              borderRadius:   8,
              padding:        '6px 14px',
              cursor:         'pointer',
              textDecoration: 'none',
              transition:     'background 0.15s',
            }}
          >
            Open README →
          </a>
          <button
            onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); setShowBuildCta(false); }}
            style={{
              background:   'transparent',
              border:       `1px solid ${isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)'}`,
              color:        isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.4)',
              borderRadius: 8,
              width:        26,
              height:       26,
              cursor:       'pointer',
              fontSize:     14,
              lineHeight:   1,
              padding:      0,
              flexShrink:   0,
            }}
            title="Dismiss"
          >✕</button>
        </div>,
        document.body,
      )}
    </div>
  );
}
