import { useRef, useCallback, useEffect, useState, useMemo } from 'react';
import ForceGraph3D from 'react-force-graph-3d';
import type { ForceGraphMethods } from 'react-force-graph-3d';
import * as THREE from 'three';
import { withPublicBase } from '../lib/public-path';
import { buildNodeObject } from './GraphNodeFactory';
import type { GraphNode, GraphLink } from '../lib/types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface LocalGraphData {
  nodes: GraphNode[];
  links: GraphLink[];
  backlinks: Array<{ id: string; name: string; path: string | null }>;
  forwardLinks: Array<{ id: string; name: string; path: string | null }>;
}

interface LocalGraphProps {
  noteId: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const BG_DARK  = '#0a0a0a';
const BG_LIGHT = '#f5f5f5';
const STORAGE_KEY = 'theme';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function resolveId(v: unknown): string {
  return typeof v === 'object' && v !== null ? (v as GraphNode).id : (v as string);
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function LocalGraph({ noteId }: LocalGraphProps) {
  const fgRef = useRef<ForceGraphMethods | undefined>(undefined);

  // ── Dark / light mode ──────────────────────────────────────────────────────
  const [isDark, setIsDark] = useState<boolean>(() => {
    try { return (localStorage.getItem(STORAGE_KEY) ?? 'dark') !== 'light'; }
    catch { return true; }
  });

  // Listen for theme changes from BaseLayout toggle
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

  const bgColor = isDark ? BG_DARK : BG_LIGHT;

  // Ref keeps nodeThreeObject stable across theme changes (same pattern as FullGraph)
  const isDarkRef = useRef(isDark);
  isDarkRef.current = isDark;
  useEffect(() => {
    (fgRef.current as { refresh?: () => void } | undefined)?.refresh?.();
  }, [isDark]);

  // ── Graph state ────────────────────────────────────────────────────────────
  const [nodes, setNodes] = useState<Map<string, GraphNode>>(new Map());
  const [links, setLinks] = useState<GraphLink[]>([]);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [clickedOnce, setClickedOnce] = useState<Set<string>>(new Set());

  // ── Sidebar data (from initial fetch) ─────────────────────────────────────
  const [backlinks, setBacklinks] = useState<LocalGraphData['backlinks']>([]);
  const [forwardLinks, setForwardLinks] = useState<LocalGraphData['forwardLinks']>([]);
  const [tags, setTags] = useState<GraphNode[]>([]);
  const [ghostForwardLinks, setGhostForwardLinks] = useState<
    Array<{ id: string; name: string }>
  >([]);

  // ── UI state ───────────────────────────────────────────────────────────────
  const [ghostTooltip, setGhostTooltip] = useState<{ x: number; y: number } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // ── Merge helper ──────────────────────────────────────────────────────────
  const mergeInto = useCallback((data: { nodes: GraphNode[]; links: GraphLink[] }) => {
    setNodes((prev) => {
      const next = new Map(prev);
      data.nodes.forEach((n) => { if (!next.has(n.id)) next.set(n.id, n); });
      return next;
    });
    setLinks((prev) => {
      const existing = new Set(prev.map((l) => `${resolveId(l.source)}→${resolveId(l.target)}`));
      const incoming = data.links.filter(
        (l) => !existing.has(`${resolveId(l.source)}→${resolveId(l.target)}`),
      );
      return incoming.length ? [...prev, ...incoming] : prev;
    });
  }, []);

  // ── Initial load ───────────────────────────────────────────────────────────
  useEffect(() => {
    fetch(withPublicBase(`/graph/${noteId}.json`))
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() as Promise<LocalGraphData>; })
      .then((data) => {
        mergeInto(data);
        setExpandedNodes(new Set([noteId]));
        setBacklinks(data.backlinks ?? []);
        setForwardLinks(data.forwardLinks ?? []);

        // Derive tags and ghost forward links from nodes array
        const nodeMap = new Map(data.nodes.map((n) => [n.id, n]));
        const tagNodes: GraphNode[] = [];
        const ghostFwd: Array<{ id: string; name: string }> = [];

        data.links.forEach((l) => {
          const src = resolveId(l.source);
          const tgt = resolveId(l.target);
          if (src === noteId && l.type === 'file-tag') {
            const t = nodeMap.get(tgt);
            if (t && t.type === 'tag') tagNodes.push(t);
          }
          if (src === noteId && l.type === 'wikilink') {
            const t = nodeMap.get(tgt);
            if (t && t.type === 'ghost') ghostFwd.push({ id: t.id, name: t.name });
          }
        });

        setTags(tagNodes);
        setGhostForwardLinks(ghostFwd);
      })
      .catch((err: unknown) => setLoadError(String(err)));
  }, [noteId, mergeInto]);

  // ── graphData for ForceGraph3D ────────────────────────────────────────────
  const graphData = useMemo(() => ({
    nodes: Array.from(nodes.values()),
    links,
  }), [nodes, links]);

  // ── Container width (responsive) ──────────────────────────────────────────
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(280);
  // Lazy initialisation: only mount the ForceGraph3D when the container is
  // visible in the viewport (equivalent of loading="lazy" for images on mobile).
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    setWidth(el.clientWidth || 280);
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w) setWidth(w);
    });
    ro.observe(el);

    // Intersect observer — defer Three.js initialisation until actually visible
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setIsVisible(true);
          io.disconnect(); // only need to fire once
        }
      },
      { rootMargin: '100px' },
    );
    io.observe(el);

    return () => {
      ro.disconnect();
      io.disconnect();
    };
  }, []);

  // ── Three.js cleanup on unmount ─────────────────────────────────────────
  // ForceGraph3D internally creates a WebGLRenderer. Without disposal the
  // GPU context is leaked when navigating between notes.
  useEffect(() => {
    return () => {
      if (!fgRef.current) return;
      try {
        (fgRef.current as { pauseAnimation?: () => void }).pauseAnimation?.();
        const renderer = (fgRef.current as { renderer?: () => { dispose?: () => void } }).renderer?.();
        renderer?.dispose?.();
      } catch {
        // Best-effort cleanup — ignore errors on unmount
      }
    };
  }, []);

  // ── Node Three.js visuals ──────────────────────────────────────────────────
  const nodeThreeObject = useCallback(
    (rawNode: object) => {
      const node = rawNode as GraphNode;
      const isCurrentNote = node.id === noteId;
      const isPrimed      = clickedOnce.has(node.id) && !isCurrentNote;

      const group = new THREE.Group();
      const mesh  = buildNodeObject(node.type, node.shape, node.color, node.val, !isDarkRef.current);

      if (isCurrentNote) {
        // Larger + emissive glow for the focal note
        mesh.scale.multiplyScalar(1.55);
        mesh.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mat = (child as THREE.Mesh).material as THREE.MeshLambertMaterial;
            if (mat) {
              mat.emissive          = new THREE.Color(node.color);
              mat.emissiveIntensity = 0.9;
            }
          }
        });
        // Point light for halo effect
        const light = new THREE.PointLight(node.color, 5, 70);
        group.add(light);
      }

      if (isPrimed) {
        // Pulsing ring: "click again to open"
        const scale   = Math.cbrt(node.val) * 1.2;
        const ringGeo = new THREE.RingGeometry(scale * 1.3, scale * 1.8, 20);
        const ringMat = new THREE.MeshBasicMaterial({
          color:       0xffffff,
          transparent: true,
          opacity:     0.45,
          side:        THREE.DoubleSide,
          depthTest:   false,
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        group.add(ring);
      }

      group.add(mesh);
      return group;
    },
    [noteId, clickedOnce],
  );

  // ── Hover tooltip (imperative) ────────────────────────────────────────────
  const tooltipRef = useRef<HTMLDivElement>(null);

  const handleNodeHover = useCallback(
    (rawNode: object | null) => {
      const el = tooltipRef.current;
      if (!el) return;
      if (!rawNode) { el.style.display = 'none'; return; }
      const node = rawNode as GraphNode;

      let content: string;
      if (node.type === 'ghost')                              content = `${node.name}\n(Note not yet created)`;
      else if (node.type === 'tag')                           content = node.name;
      else if (clickedOnce.has(node.id) && node.id !== noteId) content = `${node.name}\n▶ Click again to open`;
      else if (node.id === noteId)                            content = `${node.name}\n(current note)`;
      else                                                    content = `${node.name}\n▶ Click to expand`;

      el.textContent        = content;
      el.style.display      = 'block';
      el.style.background   = isDark ? 'rgba(20,20,20,0.92)' : 'rgba(245,245,245,0.92)';
      el.style.color        = isDark ? '#e0e0e0' : '#111111';
      el.style.borderColor  = isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.14)';
    },
    [noteId, clickedOnce, isDark],
  );

  // Use a native document listener — the Three.js canvas consumes pointer events
  // and prevents React's synthetic onMouseMove from firing on the wrapper.
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

  // ── Node click: progressive expansion ─────────────────────────────────────
  const handleNodeClick = useCallback(
    (rawNode: object, event: MouseEvent) => {
      const node = rawNode as GraphNode;

      // Tags: no-op in local graph
      if (node.type === 'tag') return;

      // Ghost: brief tooltip
      if (node.type === 'ghost') {
        setGhostTooltip({ x: event.clientX, y: event.clientY });
        setTimeout(() => setGhostTooltip(null), 2200);
        return;
      }

      // Current note: no-op
      if (node.id === noteId) return;

      if (!clickedOnce.has(node.id)) {
        // First click: expand neighbours
        setClickedOnce((p) => new Set([...p, node.id]));

        if (!expandedNodes.has(node.id)) {
          fetch(withPublicBase(`/graph/${node.id}.json`))
            .then((r) => { if (!r.ok) return null; return r.json() as Promise<LocalGraphData>; })
            .then((data) => {
              if (data) {
                mergeInto(data);
                setExpandedNodes((p) => new Set([...p, node.id]));
              }
            })
            .catch(() => { /* silently ignore */ });
        }
        return;
      }

      // Second click: navigate
      if (node.path) window.location.href = node.path;
    },
    [noteId, clickedOnce, expandedNodes, mergeInto],
  );

  // ── Right-click: fly camera ────────────────────────────────────────────────
  const handleNodeRightClick = useCallback((rawNode: object, event: MouseEvent) => {
    event.preventDefault();
    const node = rawNode as GraphNode & { x?: number; y?: number; z?: number };
    if (!fgRef.current || node.x == null) return;
    const dist  = 60;
    const mag   = Math.hypot(node.x, node.y ?? 0, node.z ?? 0) || 1;
    const ratio = 1 + dist / mag;
    fgRef.current.cameraPosition(
      { x: node.x * ratio, y: (node.y ?? 0) * ratio, z: (node.z ?? 0) * ratio },
      { x: node.x,         y: node.y ?? 0,            z: node.z ?? 0            },
      1200,
    );
  }, []);

  // ── Link color ────────────────────────────────────────────────────────────
  const linkColor = useCallback((rawLink: object) => {
    const l = rawLink as { type: string };
    if (l.type === 'file-tag')      return '#e74c3c55';
    if (l.type === 'tag-hierarchy') return '#e67e2255';
    return isDark ? '#ffffff33' : '#00000033';
  }, [isDark]);

  // ── Early returns ─────────────────────────────────────────────────────────
  if (loadError) {
    return (
      <div className="local-graph-error">Could not load graph</div>
    );
  }

  const isLoaded = nodes.size > 0;

  return (
    <div className="local-graph-wrapper">

      {/* ── 3D graph canvas ─────────────────────────────────── */}
      <div
        ref={containerRef}
        className="local-graph-canvas"
      >
        {(!isLoaded || !isVisible) && (
          <div
            style={{
              height:         350,
              background:     bgColor,
              borderRadius:   'var(--radius-md)',
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              color:          'var(--text-muted)',
              fontSize:       12,
            }}
          >
            {isLoaded && !isVisible ? 'Scroll to view graph…' : 'Loading…'}
          </div>
        )}

        {isLoaded && isVisible && (
          <ForceGraph3D
            ref={fgRef}
            graphData={graphData}
            width={width}
            height={350}
            backgroundColor={bgColor}
            nodeThreeObject={nodeThreeObject}
            nodeThreeObjectExtend={false}
            nodeLabel=""
            onNodeClick={handleNodeClick}
            onNodeRightClick={handleNodeRightClick}
            onNodeHover={handleNodeHover}
            linkColor={linkColor}
            linkOpacity={0.6}
            linkWidth={0.5}
            linkDirectionalParticles={1}
            linkDirectionalParticleWidth={0.8}
            linkDirectionalParticleSpeed={0.005}
            enableNodeDrag={true}
            enableNavigationControls={true}
            showNavInfo={false}
            d3AlphaDecay={0.03}
            d3VelocityDecay={0.3}
          />
        )}

        {/* Hover tooltip */}
        <div
          ref={tooltipRef}
          style={{
            display:        'none',
            position:       'fixed',
            left:           0,
            top:            0,
            padding:        '6px 10px',
            borderRadius:   6,
            border:         '1px solid transparent',
            fontSize:       12,
            pointerEvents:  'none',
            whiteSpace:     'pre-line',
            maxWidth:       200,
            zIndex:         9999,
            backdropFilter: 'blur(4px)',
          }}
        />

        {/* Ghost "not yet created" toast */}
        {ghostTooltip && (
          <div
            style={{
              position:      'fixed',
              left:          ghostTooltip.x + 12,
              top:           ghostTooltip.y + 12,
              background:    'rgba(30,30,30,0.92)',
              color:         '#e0e0e0',
              border:        '1px solid rgba(255,255,255,0.18)',
              padding:       '5px 12px',
              borderRadius:  6,
              fontSize:      12,
              pointerEvents: 'none',
              zIndex:        10000,
            }}
          >
            Note not yet created
          </div>
        )}
      </div>

      {/* ── Hint ────────────────────────────────────────────── */}
      {isLoaded && (
        <div className="local-graph-hint">
          Click to expand · Click again to open · Right-click to focus
        </div>
      )}

      {/* ── Backlinks ───────────────────────────────────────── */}
      {backlinks.length > 0 && (
        <section className="local-graph-section">
          <h3 className="local-graph-section-heading">Backlinks</h3>
          <ul className="local-graph-link-list">
            {backlinks.map((n) => (
              <li key={n.id}>
                <a href={n.path ?? '#'} className="local-graph-link">{n.name}</a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ── Forward links ───────────────────────────────────── */}
      {(forwardLinks.length > 0 || ghostForwardLinks.length > 0) && (
        <section className="local-graph-section">
          <h3 className="local-graph-section-heading">Linked Notes</h3>
          <ul className="local-graph-link-list">
            {forwardLinks.map((n) => (
              <li key={n.id}>
                <a href={n.path ?? '#'} className="local-graph-link">{n.name}</a>
              </li>
            ))}
            {ghostForwardLinks.map((n) => (
              <li key={n.id}>
                <span
                  className="local-graph-link local-graph-link--ghost"
                  title="Note not yet created"
                >
                  {n.name}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ── Tags ────────────────────────────────────────────── */}
      {tags.length > 0 && (
        <section className="local-graph-section">
          <h3 className="local-graph-section-heading">Tags</h3>
          <div className="local-graph-tags">
            {tags.map((t) => (
              <a
                key={t.id}
                href={`/?highlight=${encodeURIComponent(t.id)}`}
                className="local-graph-tag"
              >
                {t.name}
              </a>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
