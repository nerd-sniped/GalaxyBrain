import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import ForceGraph3D from 'react-force-graph-3d';
import type { ForceGraphMethods } from 'react-force-graph-3d';
import * as THREE from 'three';
import type { GraphAnimationState, GraphParticleStyle, GraphThemeTokens } from '../lib/graph-ui';
import type { GraphData, GraphNode } from '../lib/types';
import { buildNodeObject } from './GraphNodeFactory';

export interface InteractiveGraphHandle {
  fitToGraph: () => void;
  resetCamera: () => void;
  startCameraTour: () => void;
  startOrbitSettleAnimation: () => void;
  stopAnimation: () => void;
  isAnimationRunning: () => boolean;
}

const HINT_BAR_STORAGE_KEY = 'gb-hint-bar-expanded';

interface InteractiveGraphProps {
  graphData: GraphData | null;
  themeTokens: GraphThemeTokens;
  onOpenNode?: (node: GraphNode) => void;
  nodePrimaryAction?: 'open' | 'focus';
  showNodeContextMenu?: boolean;
  loadError?: string | null;
  emptyMessage?: string;
  hintText?: string;
  buildCta?: ((dismiss: () => void) => ReactNode) | null;
  calloutNodeId?: string | null;
  calloutLabel?: string;
  ignoreCollapsible?: boolean;
  showAllLabels?: boolean;
  impactGlow?: boolean;
  particleSpeed?: number;
  particleRandomness?: number;
  particleStyle?: GraphParticleStyle;
  particleTrailLength?: number;
  onShowAllLabelsChange?: (value: boolean) => void;
  showInlineLabelToggle?: boolean;
  showHintBar?: boolean;
  onAnimationStateChange?: (state: GraphAnimationState) => void;
}

interface SavedCameraState {
  position: { x: number; y: number; z: number };
  target: { x: number; y: number; z: number };
}

interface GraphControls {
  target?: THREE.Vector3;
  enabled?: boolean;
  domElement?: EventTarget | null;
  saveState?: () => void;
  update?: () => void;
}

interface PositionedGraphNode extends GraphNode {
  x?: number;
  y?: number;
  z?: number;
}

interface TourCandidate {
  id: string;
  position: THREE.Vector3;
  score: number;
}

interface NodeRuntimeVisual {
  glowSprite: THREE.Sprite;
  baseScale: number;
}

interface ImpactPulseState {
  startedAt: number;
  until: number;
}

interface TourSegment {
  approachCurve: [THREE.Vector3, THREE.Vector3, THREE.Vector3, THREE.Vector3];
  exitCurve: [THREE.Vector3, THREE.Vector3, THREE.Vector3, THREE.Vector3];
  targetId: string;
  nextId: string | null;
  targetPosition: THREE.Vector3;
  nextPosition: THREE.Vector3;
  orbitForward: THREE.Vector3;
  orbitRight: THREE.Vector3;
  orbitUp: THREE.Vector3;
  orbitDistance: number;
  orbitRadius: number;
  orbitVerticalRadius: number;
  orbitAngleStart: number;
  orbitAngleSweep: number;
  lookSideBias: number;
  lookLiftBias: number;
  driftAmplitude: number;
  driftPhase: number;
  driftFreqA: number;
  driftFreqB: number;
  approachDurationMs: number;
  orbitDurationMs: number;
  exitDurationMs: number;
  durationMs: number;
  previewLeadT: number;
}

function resolveId(v: unknown): string {
  return typeof v === 'object' && v !== null ? (v as GraphNode).id : (v as string);
}

function formatNodeName(node: GraphNode): string {
  if (node.type !== 'tag') return node.name;
  return node.name.startsWith('#') ? node.name : `#${node.name}`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpVec(a: THREE.Vector3, b: THREE.Vector3, t: number): THREE.Vector3 {
  return new THREE.Vector3(
    lerp(a.x, b.x, t),
    lerp(a.y, b.y, t),
    lerp(a.z, b.z, t),
  );
}

function cubicBezierPoint(
  p0: THREE.Vector3,
  p1: THREE.Vector3,
  p2: THREE.Vector3,
  p3: THREE.Vector3,
  t: number,
): THREE.Vector3 {
  const u = 1 - t;
  const tt = t * t;
  const uu = u * u;
  const uuu = uu * u;
  const ttt = tt * t;

  return new THREE.Vector3(
    uuu * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + ttt * p3.x,
    uuu * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + ttt * p3.y,
    uuu * p0.z + 3 * uu * t * p1.z + 3 * u * tt * p2.z + ttt * p3.z,
  );
}

function cubicBezierTangent(
  p0: THREE.Vector3,
  p1: THREE.Vector3,
  p2: THREE.Vector3,
  p3: THREE.Vector3,
  t: number,
): THREE.Vector3 {
  const u = 1 - t;

  return new THREE.Vector3(
    3 * u * u * (p1.x - p0.x) + 6 * u * t * (p2.x - p1.x) + 3 * t * t * (p3.x - p2.x),
    3 * u * u * (p1.y - p0.y) + 6 * u * t * (p2.y - p1.y) + 3 * t * t * (p3.y - p2.y),
    3 * u * u * (p1.z - p0.z) + 6 * u * t * (p2.z - p1.z) + 3 * t * t * (p3.z - p2.z),
  );
}

function smoothstep(t: number): number {
  const x = clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
}

function springVectorToward(
  current: THREE.Vector3,
  velocity: THREE.Vector3,
  target: THREE.Vector3,
  stiffness: number,
  damping: number,
  dt: number,
): void {
  const toTarget = target.clone().sub(current);
  velocity.add(toTarget.multiplyScalar(stiffness * dt));
  velocity.multiplyScalar(Math.exp(-damping * dt));
  current.add(velocity.clone().multiplyScalar(dt));
}

function pickWeightedIndex(weights: number[]): number {
  const total = weights.reduce((sum, weight) => sum + Math.max(0, weight), 0);
  if (total <= 0) {
    let maxIndex = 0;
    let maxWeight = Number.NEGATIVE_INFINITY;
    weights.forEach((weight, index) => {
      if (weight > maxWeight) {
        maxWeight = weight;
        maxIndex = index;
      }
    });
    return maxIndex;
  }

  let cursor = Math.random() * total;
  for (let index = 0; index < weights.length; index += 1) {
    cursor -= Math.max(0, weights[index]);
    if (cursor <= 0) return index;
  }

  return weights.length - 1;
}

function buildBasis(forward: THREE.Vector3, worldUp: THREE.Vector3): {
  forward: THREE.Vector3;
  right: THREE.Vector3;
  up: THREE.Vector3;
} {
  const safeForward =
    forward.lengthSq() > 1e-6 ? forward.clone().normalize() : new THREE.Vector3(0, 0, -1);
  let right = new THREE.Vector3().crossVectors(safeForward, worldUp);
  if (right.lengthSq() < 1e-6) {
    right = new THREE.Vector3().crossVectors(safeForward, new THREE.Vector3(1, 0, 0));
  }
  right.normalize();
  const up = new THREE.Vector3().crossVectors(right, safeForward).normalize();
  return {
    forward: safeForward,
    right,
    up,
  };
}

function hashToUnit(input: string, seed = 0): number {
  let hash = 2166136261 ^ seed;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) % 10000) / 10000;
}

function easeOutCubic(t: number): number {
  const x = clamp(t, 0, 1);
  return 1 - Math.pow(1 - x, 3);
}

function makePlusSprite(): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;

  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.Sprite(new THREE.SpriteMaterial());

  ctx.clearRect(0, 0, 128, 128);
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.beginPath();
  ctx.arc(64, 64, 54, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(64, 64, 54, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 72px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('+', 64, 66);

  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true });
  return new THREE.Sprite(mat);
}

let glowSpriteTexture: THREE.CanvasTexture | null = null;

function getGlowSpriteTexture(): THREE.CanvasTexture {
  if (glowSpriteTexture) return glowSpriteTexture;

  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    glowSpriteTexture = new THREE.CanvasTexture(canvas);
    return glowSpriteTexture;
  }

  const gradient = ctx.createRadialGradient(64, 64, 8, 64, 64, 56);
  gradient.addColorStop(0, 'rgba(255,255,255,0.95)');
  gradient.addColorStop(0.35, 'rgba(255,255,255,0.45)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);

  glowSpriteTexture = new THREE.CanvasTexture(canvas);
  glowSpriteTexture.minFilter = THREE.LinearFilter;
  glowSpriteTexture.magFilter = THREE.LinearFilter;
  return glowSpriteTexture;
}

function makeLabelSprite(
  text: string,
  options: {
    opacity?: number;
    textColor: string;
    outlineColor: string;
    fontFamily: string;
  },
): THREE.Sprite {
  const fontSize = 26;
  const paddingX = 14;
  const paddingY = 8;
  const pixelRatio = 2;

  const measureCanvas = document.createElement('canvas');
  const measureCtx = measureCanvas.getContext('2d');
  if (!measureCtx) return new THREE.Sprite(new THREE.SpriteMaterial());

  measureCtx.font = `600 ${fontSize}px ${options.fontFamily}`;
  const textWidth = Math.ceil(measureCtx.measureText(text).width);
  const width = textWidth + paddingX * 2;
  const height = fontSize + paddingY * 2;

  const canvas = document.createElement('canvas');
  canvas.width = width * pixelRatio;
  canvas.height = height * pixelRatio;

  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.Sprite(new THREE.SpriteMaterial());

  ctx.scale(pixelRatio, pixelRatio);
  ctx.font = `600 ${fontSize}px ${options.fontFamily}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = options.textColor;
  ctx.strokeStyle = options.outlineColor;
  ctx.lineWidth = 6;
  ctx.lineJoin = 'round';
  ctx.strokeText(text, width / 2, height / 2 + 1);
  ctx.fillText(text, width / 2, height / 2 + 1);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    opacity: options.opacity ?? 0.92,
  });
  const sprite = new THREE.Sprite(material);
  const worldHeight = 7;
  const aspect = width / height;
  sprite.scale.set(worldHeight * aspect, worldHeight, 1);
  return sprite;
}

function createFallbackTagNode(id: string, accent: string): GraphNode {
  return {
    id,
    name: id,
    type: 'tag',
    path: null,
    val: 1,
    shape: 'octahedron',
    color: accent,
    collapsible: false,
    pinned: false,
    callout: false,
    calloutText: '',
    excerpt: null,
  };
}

const InteractiveGraph = forwardRef<InteractiveGraphHandle, InteractiveGraphProps>(function InteractiveGraph(
  {
    graphData,
    themeTokens,
    onOpenNode,
    nodePrimaryAction = 'open',
    showNodeContextMenu = false,
    loadError = null,
    emptyMessage = 'No graph data available.',
    hintText = 'Click note → open | Shift+click → collapse | Click tag → filter | Right-click → focus | Drag to rotate',
    buildCta = null,
    calloutNodeId = null,
    calloutLabel,
    ignoreCollapsible = false,
    showAllLabels = false,
    impactGlow = true,
    particleSpeed: particleSpeedValue = 0.35,
    particleRandomness = 0,
    particleStyle = 'dot',
    particleTrailLength = 0.55,
    onShowAllLabelsChange,
    showInlineLabelToggle = false,
    showHintBar = true,
    onAnimationStateChange,
  },
  ref,
) {
  const fgRef = useRef<ForceGraphMethods | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const fitTimerRef = useRef<number | null>(null);
  const controlsReleaseTimerRef = useRef<number | null>(null);
  const savedCameraRef = useRef<SavedCameraState | null>(null);
  const hasShownCtaRef = useRef(false);
  const pulsingLightsRef = useRef<Map<string, THREE.PointLight>>(new Map());
  const nodeVisualsRef = useRef<Map<string, NodeRuntimeVisual>>(new Map());
  const impactPulsesRef = useRef<Map<string, ImpactPulseState>>(new Map());
  const linkMaterialCacheRef = useRef<Map<string, THREE.Material>>(new Map());
  const sceneLightRigRef = useRef<THREE.Light[]>([]);
  const calloutTargetRef = useRef<GraphNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const animationTimeoutsRef = useRef<number[]>([]);
  const animationRunIdRef = useRef(0);
  const animationStateRef = useRef<GraphAnimationState>({ mode: 'none', running: false });
  const tourPreviewLockUntilRef = useRef(0);
  const isDark = themeTokens.mode === 'dark';

  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string> | null>(null);
  const [highlightedTag, setHighlightedTag] = useState<string | null>(null);
  const [ghostTooltip, setGhostTooltip] = useState<{ x: number; y: number } | null>(null);
  const [nodeContextMenu, setNodeContextMenu] = useState<{ node: GraphNode; x: number; y: number } | null>(null);
  const [showBuildCta, setShowBuildCta] = useState(false);
  const [showCallout, setShowCallout] = useState(false);
  const [calloutPos, setCalloutPos] = useState<{ x: number; y: number } | null>(null);
  const [isHintBarExpanded, setIsHintBarExpanded] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(HINT_BAR_STORAGE_KEY);
      return stored !== 'false';
    } catch {
      return true;
    }
  });

  const emitAnimationState = useCallback((state: GraphAnimationState) => {
    animationStateRef.current = state;
    onAnimationStateChange?.(state);
  }, [onAnimationStateChange]);

  const clearAnimationTimers = useCallback(() => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    animationTimeoutsRef.current.forEach((timer) => window.clearTimeout(timer));
    animationTimeoutsRef.current = [];
  }, []);

  const rememberCameraState = useCallback(() => {
    const graph = fgRef.current as ForceGraphMethods & {
      camera?: () => THREE.Camera;
      controls?: () => object;
    };
    const camera = graph?.camera?.() as THREE.PerspectiveCamera | undefined;
    const controls = graph?.controls?.() as GraphControls | undefined;
    controls?.saveState?.();
    if (!camera) return;

    savedCameraRef.current = {
      position: {
        x: camera.position.x,
        y: camera.position.y,
        z: camera.position.z,
      },
      target: {
        x: controls?.target?.x ?? 0,
        y: controls?.target?.y ?? 0,
        z: controls?.target?.z ?? 0,
      },
    };
  }, []);

  const releaseControls = useCallback((delayMs = 0) => {
    if (controlsReleaseTimerRef.current !== null) {
      window.clearTimeout(controlsReleaseTimerRef.current);
    }

    controlsReleaseTimerRef.current = window.setTimeout(() => {
      const graph = fgRef.current as ForceGraphMethods & {
        controls?: () => object;
      };
      const controls = graph?.controls?.() as GraphControls | undefined;
      if (!controls) return;

      controls.enabled = true;
      controls.update?.();
      if (typeof PointerEvent !== 'undefined' && controls.domElement instanceof EventTarget) {
        controls.domElement.dispatchEvent(new PointerEvent('pointerup'));
      }
      controlsReleaseTimerRef.current = null;
    }, delayMs);
  }, []);

  const fitToGraph = useCallback((durationMs = 650) => {
    const graph = fgRef.current as ForceGraphMethods & {
      zoomToFit?: (duration?: number, padding?: number) => void;
    };
    if (!graph || !graphData || graphData.nodes.length === 0) return;

    graph.zoomToFit?.(durationMs, 70);

    if (fitTimerRef.current !== null) {
      window.clearTimeout(fitTimerRef.current);
    }
    fitTimerRef.current = window.setTimeout(() => {
      rememberCameraState();
      fitTimerRef.current = null;
    }, durationMs + 80);
    releaseControls(durationMs + 40);
  }, [graphData, releaseControls, rememberCameraState]);

  const resetCamera = useCallback(() => {
    const graph = fgRef.current as ForceGraphMethods & {
      cameraPosition?: (
        position: Partial<{ x: number; y: number; z: number }>,
        lookAt?: { x: number; y: number; z: number },
        transitionMs?: number,
      ) => void;
    };

    const saved = savedCameraRef.current;
    if (!saved) {
      fitToGraph();
      return;
    }

    graph?.cameraPosition?.(saved.position, saved.target, 700);
    releaseControls(760);
  }, [fitToGraph, releaseControls]);

  const hidePreviewCard = useCallback(() => {
    const preview = previewRef.current;
    if (!preview) return;
    preview.style.opacity = '0';
    preview.style.transform = 'translateY(6px)';
  }, []);

  const showPreviewCardForNode = useCallback((node: GraphNode) => {
    const preview = previewRef.current;
    if (!preview) return;

    const displayName = formatNodeName(node);
    const typeLabel = node.type === 'tag' ? 'tag' : node.type === 'ghost' ? 'unlinked note' : 'note';
    let excerptHtml = '';
    if (node.type === 'ghost') {
      excerptHtml = `<em style="opacity:0.68;color:${themeTokens.textMuted}">This note has not been created yet.</em>`;
    } else if (node.excerpt) {
      excerptHtml = node.excerpt;
    }

    let hint = '';
    if (!ignoreCollapsible && node.collapsible && collapsedNodes?.has(node.id)) hint = 'Click to expand';
    if (!ignoreCollapsible && node.collapsible && collapsedNodes && !collapsedNodes.has(node.id)) hint = 'Shift+click to collapse';

    preview.style.background = themeTokens.panelBackground;
    preview.style.color = themeTokens.textNormal;
    preview.style.borderColor = themeTokens.panelBorder;
    preview.innerHTML = `
      <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.08em;color:${themeTokens.textMuted};margin-bottom:5px">${typeLabel}</div>
      <div style="font-size:14px;font-weight:600;margin-bottom:${excerptHtml ? '8px' : '0'}">${displayName}</div>
      ${excerptHtml ? `<div style="font-size:12px;line-height:1.55;color:${themeTokens.textMuted}">${excerptHtml}</div>` : ''}
      ${hint ? `<div style="font-size:11px;color:${themeTokens.textMuted};margin-top:8px;border-top:1px solid ${themeTokens.panelBorder};padding-top:6px">${hint}</div>` : ''}
    `;
    preview.style.opacity = '1';
    preview.style.transform = 'translateY(0)';
  }, [collapsedNodes, ignoreCollapsible, themeTokens]);

  const stopAnimation = useCallback(() => {
    animationRunIdRef.current += 1;
    clearAnimationTimers();
    releaseControls();
    tourPreviewLockUntilRef.current = 0;
    hidePreviewCard();
    emitAnimationState({ mode: 'none', running: false });
  }, [clearAnimationTimers, emitAnimationState, hidePreviewCard, releaseControls]);

  const collectTourNodes = useCallback((): PositionedGraphNode[] => {
    if (!graphData) return [];

    const visibleNodes = graphData.nodes
      .filter((node): node is PositionedGraphNode => node.type === 'file')
      .filter((node) => node.x != null && node.y != null && node.z != null);
    const visibleNodeIds = new Set(visibleNodes.map((node) => node.id));

    const wikiDegree = new Map<string, number>();
    const tagDegree = new Map<string, number>();
    graphData.links.forEach((link) => {
      const sourceId = resolveId(link.source);
      const targetId = resolveId(link.target);

      if (link.type === 'wikilink') {
        wikiDegree.set(sourceId, (wikiDegree.get(sourceId) ?? 0) + 1);
        wikiDegree.set(targetId, (wikiDegree.get(targetId) ?? 0) + 1);
      }

      if (link.type === 'file-tag') {
        const fileId = visibleNodeIds.has(sourceId) ? sourceId : targetId;
        tagDegree.set(fileId, (tagDegree.get(fileId) ?? 0) + 1);
      }
    });

    const scored = [...visibleNodes].sort((a, b) => {
      const score = (node: PositionedGraphNode) => {
        const degree = wikiDegree.get(node.id) ?? 0;
        const tags = tagDegree.get(node.id) ?? 0;
        return (
          (node.pinned ? 180 : 0) +
          (node.callout ? 120 : 0) +
          node.val * 2.4 +
          degree * 7 +
          tags * 14 +
          Math.random() * 18
        );
      };
      return score(b) - score(a);
    });

    const selected: PositionedGraphNode[] = [];
    for (const node of scored) {
      const tooClose = selected.some((picked) => {
        const dx = (picked.x ?? 0) - (node.x ?? 0);
        const dy = (picked.y ?? 0) - (node.y ?? 0);
        const dz = (picked.z ?? 0) - (node.z ?? 0);
        return Math.hypot(dx, dy, dz) < 18;
      });
      if (!tooClose) selected.push(node);
      if (selected.length >= 34) break;
    }

    if (selected.length >= Math.min(18, scored.length)) {
      return selected;
    }

    return selected.length > 0 ? selected : scored.slice(0, Math.min(24, scored.length));
  }, [graphData]);

  const startCameraTour = useCallback(() => {
    const graph = fgRef.current as ForceGraphMethods & {
      camera?: () => THREE.Camera;
      controls?: () => object;
    };
    const camera = graph?.camera?.() as THREE.PerspectiveCamera | undefined;
    const controls = graph?.controls?.() as GraphControls | undefined;
    if (!graph || !camera || !controls) return;

    const initialStops = collectTourNodes();
    if (initialStops.length === 0) return;

    stopAnimation();
    const runId = animationRunIdRef.current;
    emitAnimationState({ mode: 'camera-tour', running: true });

    const worldUp = new THREE.Vector3(0, 1, 0);
    const controlTarget = controls.target ?? new THREE.Vector3();
    if (!controls.target) {
      controls.target = controlTarget;
    }

    const recentTargetIds: string[] = [];
    const cameraVelocity = new THREE.Vector3();
    const lookVelocity = new THREE.Vector3();

    const pushRecentTarget = (id: string) => {
      recentTargetIds.unshift(id);
      while (recentTargetIds.length > 6) {
        recentTargetIds.pop();
      }
    };

    const getCandidates = (): TourCandidate[] => {
      const nodes = collectTourNodes();
      return nodes.map((node) => ({
        id: node.id,
        position: new THREE.Vector3(node.x ?? 0, node.y ?? 0, node.z ?? 0),
        score: (node.pinned ? 1000 : 0) + (node.callout ? 500 : 0) + node.val,
      }));
    };

    const chooseTarget = (
      origin: THREE.Vector3,
      currentId: string | null,
      directionHint: THREE.Vector3,
      history = recentTargetIds,
      candidates = getCandidates(),
    ): TourCandidate | null => {
      if (candidates.length === 0) return null;
      if (candidates.length === 1) return candidates[0];

      const maxNodeScore = Math.max(1, ...candidates.map((candidate) => candidate.score));

      const heading =
        directionHint.lengthSq() > 1e-6
          ? directionHint.clone().normalize()
          : new THREE.Vector3(0, 0, -1);

      const weights = candidates.map((candidate) => {
        if (currentId !== null && candidate.id === currentId && candidates.length > 1) {
          return 0;
        }

        const toNode = candidate.position.clone().sub(origin);
        const distance = Math.max(toNode.length(), 1);
        const direction = toNode.normalize();
        const alignment = direction.dot(heading);
        const turnBias = clamp(0.4 + (alignment + 1) * 0.38, 0.06, 1.5);
        const reversePenalty =
          alignment < -0.55 ? 0.015 : alignment < -0.25 ? 0.07 : alignment < 0 ? 0.32 : 1;
        const distanceBias = clamp(distance / 58, 0.22, 2.9);
        const nearPenalty =
          distance < 26 ? 0.008 : distance < 40 ? 0.04 : distance < 58 ? 0.16 : distance < 80 ? 0.55 : 1;

        let recencyPenalty = 1;
        const recentIndex = history.indexOf(candidate.id);
        if (recentIndex === 0) recencyPenalty = 0.01;
        else if (recentIndex === 1) recencyPenalty = 0.05;
        else if (recentIndex === 2) recencyPenalty = 0.15;
        else if (recentIndex === 3) recencyPenalty = 0.32;
        else if (recentIndex >= 4) recencyPenalty = 0.55;

        const scoreBias = 0.9 + (candidate.score / maxNodeScore) * 0.6;
        const randomBias = lerp(0.62, 1.42, Math.random());

        return scoreBias * distanceBias * nearPenalty * recencyPenalty * turnBias * reversePenalty * randomBias;
      });

      return candidates[pickWeightedIndex(weights)] ?? candidates[0];
    };

    const buildSegment = ({
      fromPosition,
      fromVelocity,
      targetId,
      history = recentTargetIds,
    }: {
      fromPosition: THREE.Vector3;
      fromVelocity: THREE.Vector3;
      targetId?: string | null;
      history?: string[];
    }): TourSegment => {
      const candidates = getCandidates();
      if (candidates.length === 0) {
        throw new Error('No tour candidates available.');
      }

      const travelDirection =
        fromVelocity.lengthSq() > 1e-6
          ? fromVelocity.clone().normalize()
          : controlTarget.clone().sub(fromPosition).normalize();
      if (travelDirection.lengthSq() < 1e-6) {
        travelDirection.set(0, 0, -1);
      }

      const resolvedTarget =
        (targetId ? candidates.find((candidate) => candidate.id === targetId) : null)
        ?? chooseTarget(fromPosition, null, travelDirection, history, candidates)
        ?? candidates[0];
      const targetPosition = resolvedTarget.position.clone();

      let approachDirection = targetPosition.clone().sub(fromPosition);
      if (approachDirection.lengthSq() < 1e-6) {
        approachDirection = travelDirection.clone();
      } else {
        approachDirection.normalize();
      }

      const sideSign = Math.random() < 0.5 ? -1 : 1;
      const sideDirection = buildBasis(approachDirection, worldUp).right.multiplyScalar(sideSign);
      const orbitDepartureDirection = approachDirection
        .clone()
        .lerp(sideDirection, 0.78)
        .normalize();

      const nextTarget =
        candidates.length > 1
          ? chooseTarget(
            targetPosition,
            resolvedTarget.id,
            orbitDepartureDirection,
            [resolvedTarget.id, ...history],
            candidates,
          )
          : resolvedTarget;
      const nextPosition = (nextTarget ?? resolvedTarget).position.clone();

      let exitDirection = nextPosition.clone().sub(targetPosition);
      if (exitDirection.lengthSq() < 1e-6) {
        exitDirection = orbitDepartureDirection.clone();
      } else {
        exitDirection.normalize().lerp(orbitDepartureDirection, 0.46).normalize();
      }

      const blendedBasis = buildBasis(
        travelDirection
          .clone()
          .lerp(approachDirection, 0.44)
          .lerp(orbitDepartureDirection, 0.44)
          .lerp(exitDirection, 0.18),
        worldUp,
      );
      const distance = Math.max(fromPosition.distanceTo(targetPosition), 24);
      const sideDistance = clamp(distance * lerp(0.22, 0.36, Math.random()), 16, 78);
      const verticalOffset = sideDistance * lerp(-0.16, 0.24, Math.random());
      const startPull = clamp(distance * lerp(0.14, 0.24, Math.random()), 10, 36);
      const leadInDistance = clamp(distance * lerp(0.08, 0.14, Math.random()), 8, 22);
      const exitDistance = clamp(distance * lerp(0.32, 0.56, Math.random()), 24, 84);
      const orbitBasis = buildBasis(
        approachDirection
          .clone()
          .lerp(exitDirection, 0.24)
          .lerp(orbitDepartureDirection, 0.3),
        worldUp,
      );
      const orbitDistance = clamp(distance * lerp(0.52, 0.74, Math.random()), 24, 72);
      const orbitRadius = clamp(sideDistance * lerp(0.82, 1.08, Math.random()), 16, 48);
      const orbitVerticalRadius = clamp(Math.abs(verticalOffset) * 0.8 + orbitRadius * lerp(0.24, 0.46, Math.random()), 6, 22);
      const orbitAngleStart = sideSign > 0
        ? lerp(-Math.PI * 0.78, -Math.PI * 0.56, Math.random())
        : lerp(Math.PI * 0.56, Math.PI * 0.78, Math.random());
      const orbitAngleSweep = sideSign * lerp(Math.PI * 0.92, Math.PI * 1.18, Math.random());

      const orbitPointAt = (angle: number) => targetPosition.clone()
        .add(orbitBasis.forward.clone().multiplyScalar(-orbitDistance))
        .add(orbitBasis.right.clone().multiplyScalar(Math.cos(angle) * orbitRadius))
        .add(orbitBasis.up.clone().multiplyScalar(Math.sin(angle) * orbitVerticalRadius));
      const orbitTangentAt = (angle: number) => orbitBasis.right.clone()
        .multiplyScalar(-Math.sin(angle) * orbitRadius)
        .add(orbitBasis.up.clone().multiplyScalar(Math.cos(angle) * orbitVerticalRadius))
        .multiplyScalar(Math.sign(orbitAngleSweep) || 1)
        .normalize();

      const orbitEntry = orbitPointAt(orbitAngleStart);
      const orbitExit = orbitPointAt(orbitAngleStart + orbitAngleSweep);
      const orbitEntryTangent = orbitTangentAt(orbitAngleStart);
      const orbitExitTangent = orbitTangentAt(orbitAngleStart + orbitAngleSweep);

      const approachP0 = fromPosition.clone();
      const approachP1 = fromPosition.clone()
        .add(travelDirection.clone().multiplyScalar(startPull))
        .add(blendedBasis.right.clone().multiplyScalar(sideSign * sideDistance * 0.2))
        .add(blendedBasis.up.clone().multiplyScalar(verticalOffset * 0.42));
      const approachP2 = orbitEntry.clone()
        .sub(orbitEntryTangent.clone().multiplyScalar(leadInDistance))
        .add(approachDirection.clone().multiplyScalar(-leadInDistance * 0.18));
      const approachP3 = orbitEntry.clone();

      const exitP0 = orbitExit.clone();
      const exitP1 = orbitExit.clone()
        .add(orbitExitTangent.clone().multiplyScalar(clamp(exitDistance * 0.24, 10, 28)));
      const exitP3 = targetPosition.clone()
        .add(orbitDepartureDirection.clone().multiplyScalar(clamp(orbitRadius * lerp(0.72, 1.05, Math.random()), 14, 58)))
        .add(exitDirection.clone().multiplyScalar(exitDistance))
        .add(blendedBasis.right.clone().multiplyScalar(sideSign * sideDistance * lerp(0.32, 0.68, Math.random())))
        .add(blendedBasis.up.clone().multiplyScalar(verticalOffset * lerp(0.2, 0.58, Math.random())));
      const exitP2 = exitP3.clone()
        .sub(exitDirection.clone().multiplyScalar(clamp(exitDistance * 0.36, 12, 38)))
        .add(blendedBasis.right.clone().multiplyScalar(sideSign * sideDistance * 0.16));

      const approachDurationMs = clamp(1200 + distance * 11 + Math.random() * 700, 1200, 2500);
      const orbitDurationMs = 4200;
      const exitDurationMs = clamp(1200 + distance * 7 + Math.random() * 550, 1200, 2400);

      return {
        approachCurve: [approachP0, approachP1, approachP2, approachP3],
        exitCurve: [exitP0, exitP1, exitP2, exitP3],
        targetId: resolvedTarget.id,
        nextId: nextTarget?.id ?? null,
        targetPosition,
        nextPosition,
        orbitForward: orbitBasis.forward.clone(),
        orbitRight: orbitBasis.right.clone(),
        orbitUp: orbitBasis.up.clone(),
        orbitDistance,
        orbitRadius,
        orbitVerticalRadius,
        orbitAngleStart,
        orbitAngleSweep,
        lookSideBias: -sideSign * clamp(sideDistance * lerp(0.15, 0.26, Math.random()), 4, 16),
        lookLiftBias: clamp(verticalOffset * 0.34 + lerp(-2.5, 4.5, Math.random()), -8, 12),
        driftAmplitude: clamp(sideDistance * 0.16, 1.4, 5.2),
        driftPhase: Math.random() * Math.PI * 2,
        driftFreqA: lerp(0.42, 0.82, Math.random()),
        driftFreqB: lerp(0.88, 1.46, Math.random()),
        approachDurationMs,
        orbitDurationMs,
        exitDurationMs,
        durationMs: approachDurationMs + orbitDurationMs + exitDurationMs,
        previewLeadT: lerp(0.08, 0.16, Math.random()),
      };
    };

    const buildUpcomingSegment = (segment: TourSegment) => {
      const endTangent = cubicBezierTangent(...segment.exitCurve, 1);
      const seededVelocity =
        endTangent.lengthSq() > 1e-6
          ? endTangent.clone().normalize().multiplyScalar(clamp(segment.exitCurve[0].distanceTo(segment.exitCurve[3]) * 0.32, 18, 46))
          : segment.nextPosition.clone().sub(segment.targetPosition).normalize().multiplyScalar(26);

      return buildSegment({
        fromPosition: segment.exitCurve[3].clone(),
        fromVelocity: seededVelocity,
        targetId: segment.nextId,
        history: [segment.targetId, ...recentTargetIds],
      });
    };

    const sampleSegmentState = (segment: TourSegment, progress: number, now: number) => {
      const approachRatio = segment.approachDurationMs / segment.durationMs;
      const orbitRatio = segment.orbitDurationMs / segment.durationMs;
      const exitRatio = segment.exitDurationMs / segment.durationMs;
      const orbitStart = approachRatio;
      const exitStart = approachRatio + orbitRatio;
      const time = now * 0.001;
      let basePosition: THREE.Vector3;
      let tangent: THREE.Vector3;
      let basis: { forward: THREE.Vector3; right: THREE.Vector3; up: THREE.Vector3 };
      let focusBase: THREE.Vector3;

      if (progress < orbitStart) {
        const localT = smoothstep(progress / Math.max(approachRatio, 0.0001));
        basePosition = cubicBezierPoint(...segment.approachCurve, localT);
        tangent = cubicBezierTangent(...segment.approachCurve, localT);
        basis = buildBasis(tangent, worldUp);
        focusBase = segment.targetPosition.clone();
      } else if (progress < exitStart) {
        const orbitT = smoothstep((progress - orbitStart) / Math.max(orbitRatio, 0.0001));
        const angle = segment.orbitAngleStart + segment.orbitAngleSweep * orbitT;
        basePosition = segment.targetPosition.clone()
          .add(segment.orbitForward.clone().multiplyScalar(-segment.orbitDistance))
          .add(segment.orbitRight.clone().multiplyScalar(Math.cos(angle) * segment.orbitRadius))
          .add(segment.orbitUp.clone().multiplyScalar(Math.sin(angle) * segment.orbitVerticalRadius));
        tangent = segment.orbitRight.clone()
          .multiplyScalar(-Math.sin(angle) * segment.orbitRadius)
          .add(segment.orbitUp.clone().multiplyScalar(Math.cos(angle) * segment.orbitVerticalRadius))
          .multiplyScalar(Math.sign(segment.orbitAngleSweep) || 1);
        basis = buildBasis(tangent, worldUp);
        focusBase = segment.targetPosition.clone();
      } else {
        const localT = smoothstep((progress - exitStart) / Math.max(exitRatio, 0.0001));
        basePosition = cubicBezierPoint(...segment.exitCurve, localT);
        tangent = cubicBezierTangent(...segment.exitCurve, localT);
        basis = buildBasis(tangent, worldUp);
        const lookLead = clamp(smoothstep(localT) * 0.24, 0, 0.24);
        focusBase = segment.targetPosition.clone().lerp(segment.nextPosition, lookLead);
      }

      const positionDrift = basis.right.clone()
        .multiplyScalar(Math.sin(time * segment.driftFreqA + segment.driftPhase) * segment.driftAmplitude)
        .add(
          basis.up.clone().multiplyScalar(
            Math.cos(time * segment.driftFreqB + segment.driftPhase * 1.37) * segment.driftAmplitude * 0.58,
          ),
        );
      const lookDrift = basis.right.clone()
        .multiplyScalar(Math.sin(time * 0.73 + segment.driftPhase * 0.72) * segment.driftAmplitude * 0.18)
        .add(
          basis.up.clone().multiplyScalar(
            Math.cos(time * 0.61 + segment.driftPhase * 0.31) * segment.driftAmplitude * 0.12,
          ),
        );

      return {
        position: basePosition.add(positionDrift),
        lookAt: focusBase
          .add(basis.right.clone().multiplyScalar(segment.lookSideBias))
          .add(basis.up.clone().multiplyScalar(segment.lookLiftBias))
          .add(lookDrift),
      };
    };

    let initialVelocity = controlTarget.clone().sub(camera.position);
    if (initialVelocity.lengthSq() < 1e-6) {
      initialVelocity = new THREE.Vector3(0, 0, -1);
    }

    let activeSegment = buildSegment({
      fromPosition: camera.position.clone(),
      fromVelocity: initialVelocity,
    });
    pushRecentTarget(activeSegment.targetId);
    let upcomingSegment: TourSegment | null = null;
    let previewedTargetId: string | null = null;
    let segmentStartTime = performance.now();
    let lastNow = performance.now();

    const animate = (now: number) => {
      if (runId !== animationRunIdRef.current) return;

      const deltaMs = now - lastNow;
      lastNow = now;
      const dt = clamp(deltaMs / 1000, 0.001, 0.05);
      const progress = clamp((now - segmentStartTime) / activeSegment.durationMs, 0, 1);
      const orbitStart = activeSegment.approachDurationMs / activeSegment.durationMs;

      if (progress >= orbitStart && previewedTargetId !== activeSegment.targetId) {
        const previewNode = graphData?.nodes.find((node) => node.id === activeSegment.targetId);
        if (previewNode && previewNode.type === 'file') {
          tourPreviewLockUntilRef.current = now + 2000;
          showPreviewCardForNode(previewNode);
          previewedTargetId = activeSegment.targetId;
        }
      }

      if (!upcomingSegment && progress >= 0.9) {
        upcomingSegment = buildUpcomingSegment(activeSegment);
      }

      const activeState = sampleSegmentState(activeSegment, progress, now);
      let previewProgress = 0;
      let desiredPosition = activeState.position;
      let desiredLookAt = activeState.lookAt;

      if (upcomingSegment && progress >= 0.95) {
        const blend = smoothstep((progress - 0.95) / 0.05);
        previewProgress = blend * upcomingSegment.previewLeadT;
        const nextState = sampleSegmentState(upcomingSegment, previewProgress, now + 120);
        desiredPosition = lerpVec(activeState.position, nextState.position, blend);
        desiredLookAt = lerpVec(activeState.lookAt, nextState.lookAt, blend);
      }

      springVectorToward(camera.position, cameraVelocity, desiredPosition, 8.5, 3.8, dt);
      springVectorToward(controlTarget, lookVelocity, desiredLookAt, 11.5, 4.4, dt);
      controls.update?.();

      if (progress >= 1) {
        if (!upcomingSegment) {
          upcomingSegment = buildUpcomingSegment(activeSegment);
        }
        activeSegment = upcomingSegment;
        upcomingSegment = null;
        pushRecentTarget(activeSegment.targetId);
        previewedTargetId = null;
        segmentStartTime = now - previewProgress * activeSegment.durationMs;
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    controls.enabled = false;
    animationFrameRef.current = requestAnimationFrame(animate);
  }, [collectTourNodes, emitAnimationState, graphData, showPreviewCardForNode, stopAnimation]);

  const startOrbitSettleAnimation = useCallback(() => {
    const graph = fgRef.current as ForceGraphMethods & {
      d3ReheatSimulation?: () => void;
      camera?: () => THREE.Camera;
      controls?: () => object;
      getGraphBbox?: () => { x: [number, number]; y: [number, number]; z: [number, number] } | null;
    };
    const camera = graph?.camera?.() as THREE.PerspectiveCamera | undefined;
    const controls = graph?.controls?.() as GraphControls | undefined;
    const bbox = graph?.getGraphBbox?.();
    if (!graph || !camera || !controls || !bbox) return;

    stopAnimation();
    fitToGraph(900);
    graph.d3ReheatSimulation?.();
    controls.enabled = false;

    const runId = animationRunIdRef.current;
    emitAnimationState({ mode: 'orbit-settle', running: true });

    const center = {
      x: (bbox.x[0] + bbox.x[1]) / 2,
      y: (bbox.y[0] + bbox.y[1]) / 2,
      z: (bbox.z[0] + bbox.z[1]) / 2,
    };
    const span = Math.max(
      bbox.x[1] - bbox.x[0],
      bbox.y[1] - bbox.y[0],
      bbox.z[1] - bbox.z[0],
      140,
    );
    const baseRadius = span * 1.04;
    const startTime = performance.now();
    const orbitCycleMs = 22_000;

    const animate = (now: number) => {
      if (runId !== animationRunIdRef.current) return;
      const elapsed = now - startTime;
      const t = elapsed / orbitCycleMs;
      const phase = t * Math.PI * 2 * 1.08;
      const phase2 = t * Math.PI * 2 * 0.37 + 0.8;
      const phase3 = t * Math.PI * 2 * 1.31 + 1.4;

      const radiusX = baseRadius * (1.02 + 0.28 * Math.sin(phase2));
      const radiusZ = baseRadius * (0.68 + 0.24 * Math.cos(phase2 + 1.1));
      const radiusY = baseRadius * (0.16 + 0.12 * (0.5 + 0.5 * Math.sin(phase2 * 0.9)));
      const x = center.x + Math.cos(phase) * radiusX + Math.sin(phase3) * baseRadius * 0.08;
      const y = center.y + Math.sin(phase * 0.48 + 0.6) * radiusY + Math.cos(phase3 * 0.74) * baseRadius * 0.07;
      const z = center.z + Math.sin(phase) * radiusZ + Math.cos(phase * 0.61 + 1.2) * baseRadius * 0.06;
      const lookX = center.x + Math.sin(phase * 0.71) * span * 0.035;
      const lookY = center.y + Math.cos(phase * 0.93) * span * 0.024;
      const lookZ = center.z + Math.sin(phase * 0.57 + 0.4) * span * 0.03;

      camera.position.set(
        x,
        y,
        z,
      );
      controls.target?.set(lookX, lookY, lookZ);
      controls.update?.();

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);
  }, [emitAnimationState, fitToGraph, stopAnimation]);

  useImperativeHandle(ref, () => ({
    fitToGraph: () => fitToGraph(),
    resetCamera,
    startCameraTour,
    startOrbitSettleAnimation,
    stopAnimation,
    isAnimationRunning: () => animationStateRef.current.running,
  }), [fitToGraph, resetCamera, startCameraTour, startOrbitSettleAnimation, stopAnimation]);

  useEffect(() => {
    const host = containerRef.current;
    if (!host) return;

    const updateSize = () => {
      setDimensions({
        width: host.clientWidth,
        height: host.clientHeight,
      });
    };

    updateSize();

    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(host);
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    (fgRef.current as { refresh?: () => void } | undefined)?.refresh?.();
  }, [graphData, particleRandomness, particleSpeedValue, particleStyle, particleTrailLength, showAllLabels, themeTokens]);

  useEffect(() => {
    if (!graphData || dimensions.width === 0 || dimensions.height === 0 || !fgRef.current) {
      return;
    }

    const graph = fgRef.current as ForceGraphMethods & {
      lights?: () => THREE.Light[];
      scene?: () => THREE.Scene;
      refresh?: () => void;
    };
    const scene = graph.scene?.();
    if (!scene) return;

    sceneLightRigRef.current.forEach((light) => {
      if (light.parent === scene) {
        scene.remove(light);
      }
    });

    const ambient = new THREE.AmbientLight(
      themeTokens.mode === 'dark' ? 0xffffff : 0xf6f8ff,
      themeTokens.mode === 'dark' ? 2.35 : 1.8,
    );
    const key = new THREE.DirectionalLight(0xffffff, 1.95);
    key.position.set(140, 180, 120);

    const fill = new THREE.DirectionalLight(
      themeTokens.mode === 'dark' ? 0xa8c8ff : 0xffffff,
      themeTokens.mode === 'dark' ? 1.12 : 0.76,
    );
    fill.position.set(-160, -90, -140);

    sceneLightRigRef.current = [ambient, key, fill];
    sceneLightRigRef.current.forEach((light) => scene.add(light));
    graph.lights?.(sceneLightRigRef.current);
    graph.refresh?.();

    return () => {
      sceneLightRigRef.current.forEach((light) => {
        if (light.parent === scene) {
          scene.remove(light);
        }
      });
    };
  }, [dimensions.height, dimensions.width, graphData, themeTokens.mode]);

  useEffect(() => {
    nodeVisualsRef.current.clear();
    impactPulsesRef.current.clear();
  }, [graphData, ignoreCollapsible, showAllLabels]);

  useEffect(() => {
    if (impactGlow) return;

    impactPulsesRef.current.clear();
    nodeVisualsRef.current.forEach((visual) => {
      const material = visual.glowSprite.material as THREE.SpriteMaterial;
      material.opacity = 0;
      visual.glowSprite.scale.set(visual.baseScale, visual.baseScale, 1);
    });
  }, [impactGlow]);

  useEffect(() => {
    linkMaterialCacheRef.current.forEach((material) => material.dispose());
    linkMaterialCacheRef.current.clear();
  }, [highlightedTag, isDark, themeTokens.accent, themeTokens.accentHover]);

  useEffect(() => {
    if (!graphData) {
      setCollapsedNodes(null);
      return;
    }

    const next = new Set<string>();
    graphData.nodes.forEach((node) => {
      if (node.collapsible) next.add(node.id);
    });
    setCollapsedNodes(next);
  }, [graphData]);

  useEffect(() => {
    setHighlightedTag(null);
  }, [graphData]);

  useEffect(() => {
    setShowBuildCta(false);
    hasShownCtaRef.current = false;
  }, [graphData]);

  useEffect(() => {
    setShowCallout(Boolean(calloutNodeId));
    setCalloutPos(null);
  }, [calloutNodeId]);

  useEffect(() => {
    try {
      localStorage.setItem(HINT_BAR_STORAGE_KEY, String(isHintBarExpanded));
    } catch {
      // Ignore storage failures.
    }
  }, [isHintBarExpanded]);

  useEffect(() => {
    const styleId = 'gb-interactive-graph-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      @keyframes gb-pulse {
        0%   { transform: translate(-50%,-50%) scale(1); opacity: 0.9; }
        100% { transform: translate(-50%,-50%) scale(2.8); opacity: 0; }
      }
      @keyframes gb-float {
        0%, 100% { transform: translate(-50%,-100%) translateY(0px); }
        50% { transform: translate(-50%,-100%) translateY(-7px); }
      }
      @keyframes gb-fadein {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes gb-toast-fade {
        0%, 70% { opacity: 1; transform: translateY(0); }
        100% { opacity: 0; transform: translateY(-6px); }
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.getElementById(styleId)?.remove();
    };
  }, []);

  useEffect(() => {
    const onMove = (event: MouseEvent) => {
      const tooltip = tooltipRef.current;
      const host = containerRef.current;
      if (!tooltip || !host || tooltip.style.display === 'none') return;

      const rect = host.getBoundingClientRect();
      tooltip.style.left = `${event.clientX - rect.left + 14}px`;
      tooltip.style.top = `${event.clientY - rect.top + 14}px`;
    };

    document.addEventListener('mousemove', onMove);
    return () => document.removeEventListener('mousemove', onMove);
  }, []);

  useEffect(() => {
    const host = containerRef.current;
    if (!host) return;

    const stopOnInteraction = () => {
      setNodeContextMenu(null);
      if (animationStateRef.current.running) {
        stopAnimation();
      }
    };

    host.addEventListener('pointerdown', stopOnInteraction, { capture: true });
    host.addEventListener('wheel', stopOnInteraction, { capture: true });

    return () => {
      host.removeEventListener('pointerdown', stopOnInteraction, { capture: true });
      host.removeEventListener('wheel', stopOnInteraction, { capture: true });
    };
  }, [stopAnimation]);

  useEffect(() => {
    if (!nodeContextMenu) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('[data-gb-node-menu="true"]')) return;
      setNodeContextMenu(null);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setNodeContextMenu(null);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown, true);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [nodeContextMenu]);

  useEffect(() => {
    return () => {
      if (fitTimerRef.current !== null) {
        window.clearTimeout(fitTimerRef.current);
      }
      if (controlsReleaseTimerRef.current !== null) {
        window.clearTimeout(controlsReleaseTimerRef.current);
      }
      linkMaterialCacheRef.current.forEach((material) => material.dispose());
      linkMaterialCacheRef.current.clear();
      if (!fgRef.current) return;

      try {
        (fgRef.current as { pauseAnimation?: () => void }).pauseAnimation?.();
        const renderer = (
          fgRef.current as { renderer?: () => { dispose?: () => void } }
        ).renderer?.();
        renderer?.dispose?.();
      } catch {
        // Best-effort cleanup.
      }
    };
  }, []);

  useEffect(() => {
    if (animationStateRef.current.running) {
      stopAnimation();
    }
  }, [graphData, ignoreCollapsible, showAllLabels, stopAnimation]);

  useEffect(() => {
    if (!graphData || graphData.nodes.length === 0 || dimensions.width === 0 || dimensions.height === 0) {
      return;
    }

    const timer = window.setTimeout(() => fitToGraph(420), 180);
    return () => window.clearTimeout(timer);
  }, [dimensions.height, dimensions.width, fitToGraph, graphData, ignoreCollapsible]);

  const highlightedNodeIds = useMemo<Set<string>>(() => {
    if (!highlightedTag || !graphData) return new Set();

    const ids = new Set<string>([highlightedTag]);
    graphData.links.forEach((link) => {
      const src = resolveId(link.source);
      const tgt = resolveId(link.target);
      if (src === highlightedTag) ids.add(tgt);
      if (tgt === highlightedTag) ids.add(src);
    });
    return ids;
  }, [graphData, highlightedTag]);

  useEffect(() => {
    if (highlightedTag === null) {
      pulsingLightsRef.current.clear();
      return;
    }

    let rafId = 0;
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

  const calloutTarget = useMemo(() => {
    if (!graphData || !calloutNodeId) return null;
    return graphData.nodes.find((node) => node.id === calloutNodeId) ?? null;
  }, [graphData, calloutNodeId]);

  calloutTargetRef.current = calloutTarget;

  const dismissCallout = useCallback(() => {
    setShowCallout(false);
    setCalloutPos(null);
  }, []);

  useEffect(() => {
    if (!showCallout || !calloutTarget) return;

    let rafId = 0;
    const project = () => {
      const node = calloutTargetRef.current as (GraphNode & {
        x?: number;
        y?: number;
        z?: number;
      }) | null;
      const graph = fgRef.current as ForceGraphMethods & {
        camera?: () => THREE.Camera;
        renderer?: () => THREE.WebGLRenderer;
      };

      if (graph && node && node.x != null) {
        const camera = graph.camera?.();
        const renderer = graph.renderer?.();
        if (camera && renderer) {
          const size = new THREE.Vector2();
          renderer.getSize(size);
          const vec = new THREE.Vector3(node.x, node.y ?? 0, node.z ?? 0);
          vec.project(camera);
          const sx = (vec.x * 0.5 + 0.5) * size.x;
          const sy = (-vec.y * 0.5 + 0.5) * size.y;
          if (sx > 0 && sy > 0 && sx < size.x && sy < size.y) {
            setCalloutPos({ x: sx, y: sy });
          }
        }
      }
      rafId = requestAnimationFrame(project);
    };

    const startTimer = window.setTimeout(() => {
      rafId = requestAnimationFrame(project);
    }, 2500);
    const dismissTimer = window.setTimeout(() => dismissCallout(), 30000);

    return () => {
      window.clearTimeout(startTimer);
      window.clearTimeout(dismissTimer);
      cancelAnimationFrame(rafId);
    };
  }, [calloutTarget, dismissCallout, showCallout]);

  const visibleData = useMemo<GraphData>(() => {
    if (!graphData) return { nodes: [], links: [] };
    if (ignoreCollapsible) return graphData;

    const collapsed = collapsedNodes ?? new Set(
      graphData.nodes.filter((node) => node.collapsible).map((node) => node.id),
    );

    if (collapsed.size === 0) return graphData;

    const wikilinks = graphData.links.filter((link) => link.type === 'wikilink');
    const fileTags = graphData.links.filter((link) => link.type === 'file-tag');
    const incomingAll = new Map<string, Set<string>>();

    graphData.nodes.forEach((node) => incomingAll.set(node.id, new Set()));
    wikilinks.forEach((link) => {
      const src = resolveId(link.source);
      const tgt = resolveId(link.target);
      incomingAll.get(tgt)?.add(src);
    });

    const visible = new Set<string>();
    const queue: string[] = [];
    const addVisible = (id: string) => {
      if (visible.has(id)) return;
      visible.add(id);
      if (!collapsed.has(id)) queue.push(id);
    };

    graphData.nodes.forEach((node) => {
      if (node.type === 'tag') return;
      const isPinned = node.pinned === true;
      const isRoot = (incomingAll.get(node.id)?.size ?? 0) === 0;
      if (isPinned || isRoot) addVisible(node.id);
    });

    while (queue.length > 0) {
      const current = queue.shift();
      if (!current) continue;
      wikilinks.forEach((link) => {
        const src = resolveId(link.source);
        const tgt = resolveId(link.target);
        if (src === current) addVisible(tgt);
      });
    }

    fileTags.forEach((link) => {
      const src = resolveId(link.source);
      const tgt = resolveId(link.target);
      if (visible.has(src)) visible.add(tgt);
    });

    return {
      nodes: graphData.nodes.filter((node) => visible.has(node.id)),
      links: graphData.links.filter((link) => {
        const src = resolveId(link.source);
        const tgt = resolveId(link.target);
        return visible.has(src) && visible.has(tgt);
      }),
    };
  }, [collapsedNodes, graphData, ignoreCollapsible]);

  const nodeThreeObject = useCallback((rawNode: object) => {
    const node = rawNode as GraphNode;
    const isHighlighted = node.id === highlightedTag;
    const isConnected = highlightedTag !== null && highlightedNodeIds.has(node.id);
    const isDimmed = highlightedTag !== null && !isConnected && !isHighlighted;
    const isCollapsed = !ignoreCollapsible && node.collapsible && (collapsedNodes?.has(node.id) ?? false);

    const group = new THREE.Group();
    group.renderOrder = 20;
    const mesh = buildNodeObject(node.type, node.shape, node.color, node.val, themeTokens.mode === 'light');
    if (isHighlighted || isConnected) {
      mesh.scale.multiplyScalar(1.35);
    }

    mesh.traverse((child) => {
      if (!(child as THREE.Mesh).isMesh) return;
      const meshChild = child as THREE.Mesh;
      meshChild.renderOrder = 20;
    });

    if (isDimmed) {
      mesh.traverse((child) => {
        if (!(child as THREE.Mesh).isMesh) return;
        const mat = (child as THREE.Mesh).material as THREE.MeshLambertMaterial;
        mat.transparent = true;
        mat.opacity = 0.15;
      });
    }

    if (isHighlighted) {
      mesh.traverse((child) => {
        if (!(child as THREE.Mesh).isMesh) return;
        const mat = (child as THREE.Mesh).material as THREE.MeshLambertMaterial;
        mat.emissive.copy(new THREE.Color(node.color));
        mat.emissiveIntensity = 0.7;
      });

      const light = new THREE.PointLight(node.color, 4, 60);
      pulsingLightsRef.current.set(node.id, light);
      group.add(light);
    } else {
      pulsingLightsRef.current.delete(node.id);
    }

    const glowSprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: getGlowSpriteTexture(),
        color: new THREE.Color(node.color),
        transparent: true,
        opacity: 0,
        depthTest: false,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    glowSprite.renderOrder = 28;
    const baseScale = Math.cbrt(node.val) * 6.2;
    glowSprite.scale.set(baseScale, baseScale, 1);
    group.add(glowSprite);
    nodeVisualsRef.current.set(node.id, {
      glowSprite,
      baseScale,
    });

    group.add(mesh);

    if (isCollapsed) {
      const sprite = makePlusSprite();
      const spriteScale = Math.cbrt(node.val) * 0.8 * 2.8;
      sprite.scale.set(spriteScale, spriteScale, 1);
      sprite.position.set(spriteScale * 0.38, spriteScale * 0.38, 0);
      group.add(sprite);
    }

    if (showAllLabels) {
      const label = makeLabelSprite(formatNodeName(node), {
        opacity: isDimmed ? 0.18 : isHighlighted || isConnected ? 1 : 0.92,
        textColor: themeTokens.labelText,
        outlineColor: themeTokens.labelOutline,
        fontFamily: themeTokens.fontFamily,
      });
      const labelOffset = Math.cbrt(node.val) * (isHighlighted || isConnected ? 3.8 : 3.2);
      label.position.set(0, labelOffset, 0);
      group.add(label);
    }

    return group;
  }, [collapsedNodes, highlightedNodeIds, highlightedTag, ignoreCollapsible, showAllLabels, themeTokens]);

  const handleNodeHover = useCallback((rawNode: object | null) => {
    const tooltip = tooltipRef.current;
    const preview = previewRef.current;

    if (tourPreviewLockUntilRef.current > performance.now()) {
      return;
    }

    if (!rawNode) {
      if (tooltip) tooltip.style.display = 'none';
      if (preview) hidePreviewCard();
      return;
    }

    const node = rawNode as GraphNode;
    const displayName = formatNodeName(node);

    if (tooltip) {
      tooltip.textContent = displayName;
      tooltip.style.background = themeTokens.panelBackground;
      tooltip.style.color = themeTokens.textNormal;
      tooltip.style.border = `1px solid ${themeTokens.panelBorder}`;
      tooltip.style.display = 'block';
    }

    if (preview) {
      showPreviewCardForNode(node);
    }
  }, [hidePreviewCard, showPreviewCardForNode, themeTokens]);

  const focusNode = useCallback((node: GraphNode & { x?: number; y?: number; z?: number }, transitionMs = 1200) => {
    if (!fgRef.current || node.x == null) return;

    const dist = 80;
    const mag = Math.hypot(node.x, node.y ?? 0, node.z ?? 0) || 1;
    const ratio = 1 + dist / mag;
    fgRef.current.cameraPosition(
      { x: node.x * ratio, y: (node.y ?? 0) * ratio, z: (node.z ?? 0) * ratio },
      { x: node.x, y: node.y ?? 0, z: node.z ?? 0 },
      transitionMs,
    );
  }, []);

  const handleNodeClick = useCallback((rawNode: object, event: MouseEvent) => {
    if (animationStateRef.current.running) {
      stopAnimation();
    }
    setNodeContextMenu(null);
    const node = rawNode as GraphNode;

    if (node.type === 'ghost') {
      const rect = containerRef.current?.getBoundingClientRect();
      setGhostTooltip({
        x: rect ? event.clientX - rect.left : event.clientX,
        y: rect ? event.clientY - rect.top : event.clientY,
      });
      window.setTimeout(() => setGhostTooltip(null), 2200);
      return;
    }

    if (node.type === 'tag') {
      setHighlightedTag((current) => (current === node.id ? null : node.id));
      return;
    }

    if (!ignoreCollapsible && event.shiftKey && node.collapsible && collapsedNodes && !collapsedNodes.has(node.id)) {
      setCollapsedNodes((current) => {
        const next = new Set(current ?? []);
        next.add(node.id);
        return next;
      });
      return;
    }

    if (!ignoreCollapsible && node.collapsible && collapsedNodes?.has(node.id)) {
      setCollapsedNodes((current) => {
        const next = new Set(current ?? []);
        next.delete(node.id);
        return next;
      });
      if (buildCta && !hasShownCtaRef.current) {
        hasShownCtaRef.current = true;
        window.setTimeout(() => setShowBuildCta(true), 600);
      }
      return;
    }

    if (showCallout && calloutNodeId === node.id) dismissCallout();

    if (nodePrimaryAction === 'focus') {
      focusNode(node as GraphNode & { x?: number; y?: number; z?: number });
      return;
    }

    if (onOpenNode) {
      onOpenNode(node);
      return;
    }

    if (node.path) window.location.href = node.path;
  }, [buildCta, calloutNodeId, collapsedNodes, dismissCallout, focusNode, ignoreCollapsible, nodePrimaryAction, onOpenNode, showCallout, stopAnimation]);

  const handleNodeRightClick = useCallback((rawNode: object, event: MouseEvent) => {
    if (animationStateRef.current.running) {
      stopAnimation();
    }
    event.preventDefault();
    const node = rawNode as GraphNode & { x?: number; y?: number; z?: number };
    if (showNodeContextMenu && node.type === 'file') {
      const rect = containerRef.current?.getBoundingClientRect();
      const menuWidth = 152;
      const menuHeight = 48;
      const x = rect
        ? Math.min(event.clientX - rect.left, rect.width - menuWidth - 12)
        : event.clientX;
      const y = rect
        ? Math.min(event.clientY - rect.top, rect.height - menuHeight - 12)
        : event.clientY;
      setNodeContextMenu({
        node,
        x: Math.max(12, x),
        y: Math.max(12, y),
      });
      return;
    }

    setNodeContextMenu(null);
    focusNode(node, 1500);
  }, [focusNode, showNodeContextMenu, stopAnimation]);

  const getLinkVisuals = useCallback((rawLink: object) => {
    const link = rawLink as { type: string; source: unknown; target: unknown };
    const src = resolveId(link.source);
    const tgt = resolveId(link.target);
    const isConnected = highlightedTag !== null && highlightedNodeIds.has(src) && highlightedNodeIds.has(tgt);

    const baseHue =
      link.type === 'file-tag'
        ? '#e74c3c'
        : link.type === 'tag-hierarchy'
          ? '#e67e22'
          : isDark
            ? '#ffffff'
            : '#111111';

    if (highlightedTag !== null) {
      if (!isConnected) {
        return {
          hue: baseHue,
          lineOpacity: link.type === 'wikilink' ? 0.035 : 0.05,
          particleOpacity: 0,
          particleCount: 0,
        };
      }

      return {
        hue:
          link.type === 'file-tag'
            ? themeTokens.accent
            : link.type === 'tag-hierarchy'
              ? themeTokens.accentHover
              : isDark
                ? '#ffffff'
                : '#111111',
        lineOpacity: link.type === 'wikilink' ? 0.78 : 0.88,
        particleOpacity: link.type === 'wikilink' ? 0.94 : 0.88,
        particleCount: 1,
      };
    }

    return {
      hue: baseHue,
      lineOpacity:
        link.type === 'file-tag'
          ? 0.26
          : link.type === 'tag-hierarchy'
            ? 0.22
            : 0.13,
      particleOpacity:
        link.type === 'file-tag'
          ? 0.76
          : link.type === 'tag-hierarchy'
            ? 0.68
            : 0.84,
      particleCount: 1,
    };
  }, [highlightedNodeIds, highlightedTag, isDark, themeTokens]);

  const linkColor = useCallback((rawLink: object) => {
    return getLinkVisuals(rawLink).hue;
  }, [getLinkVisuals]);

  const linkMaterial = useCallback((rawLink: object) => {
    const { hue, lineOpacity } = getLinkVisuals(rawLink);
    const key = `${hue}|${lineOpacity.toFixed(3)}`;
    const cached = linkMaterialCacheRef.current.get(key);
    if (cached) return cached;

    const material = new THREE.MeshBasicMaterial({
      color: new THREE.Color(hue),
      transparent: lineOpacity < 1,
      opacity: lineOpacity,
      depthWrite: lineOpacity >= 1,
    });
    linkMaterialCacheRef.current.set(key, material);
    return material;
  }, [getLinkVisuals]);

  const resolvedParticleSpeed = useMemo(
    () => lerp(0.0015, 0.012, clamp(particleSpeedValue, 0, 1)),
    [particleSpeedValue],
  );

  const particleSpeedAccessor = useCallback(() => {
    return resolvedParticleSpeed;
  }, [resolvedParticleSpeed]);

  const particleOffset = useCallback((rawLink: object) => {
    const link = rawLink as { type: string; source: unknown; target: unknown };
    const randomness = clamp(particleRandomness, 0, 1);
    if (randomness <= 0.001) return 0;

    const key = `${resolveId(link.source)}->${resolveId(link.target)}:${link.type}`;
    const offsetSeed = hashToUnit(key, 73);
    return offsetSeed * randomness;
  }, [particleRandomness]);

  const particleColor = useCallback((rawLink: object) => {
    return getLinkVisuals(rawLink).hue;
  }, [getLinkVisuals]);

  const particleCount = useCallback((rawLink: object) => {
    return getLinkVisuals(rawLink).particleCount;
  }, [getLinkVisuals]);

  const particleThreeObject = useCallback((rawLink: object) => {
    const link = rawLink as {
      type: string;
      source: unknown;
      target: unknown;
      __particleTemplate?: THREE.Mesh<THREE.BufferGeometry, THREE.Material>;
    };
    const key = `${resolveId(link.source)}->${resolveId(link.target)}:${link.type}`;
    const { hue, particleOpacity } = getLinkVisuals(rawLink);
    const widthSeed = hashToUnit(key, 197);

    if (particleStyle === 'trail') {
      const lengthSeed = hashToUnit(key, 131);
      const trailLengthFactor = lerp(0.55, 2, clamp(particleTrailLength, 0, 1));
      const length =
        (link.type === 'wikilink' ? 4.2 : link.type === 'file-tag' ? 3.5 : 2.9) +
        lengthSeed * 1.1;
      const resolvedLength = length * trailLengthFactor;
      const tailRadius = 0.03 + widthSeed * 0.06;
      const headRadius = tailRadius * 2.4;
      const geometry = new THREE.CylinderGeometry(
        tailRadius,
        headRadius,
        resolvedLength,
        10,
        1,
        true,
      );
      geometry.rotateX(Math.PI / 2);
      geometry.translate(0, 0, -resolvedLength / 2);

      const material = new THREE.MeshBasicMaterial({
        color: new THREE.Color(hue),
        transparent: true,
        opacity: particleOpacity,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      });

      const mesh = new THREE.Mesh(geometry, material);
      link.__particleTemplate = mesh;
      return mesh;
    }

    const radius = 0.18 + widthSeed * 0.1;
    const geometry = new THREE.SphereGeometry(radius, 10, 10);
    const material = new THREE.MeshBasicMaterial({
      color: new THREE.Color(hue),
      transparent: true,
      opacity: particleOpacity,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const mesh = new THREE.Mesh(geometry, material);
    link.__particleTemplate = mesh;
    return mesh;
  }, [getLinkVisuals, particleStyle, particleTrailLength]);

  useEffect(() => {
    if (!impactGlow) {
      impactPulsesRef.current.clear();
      nodeVisualsRef.current.forEach((visual) => {
        const material = visual.glowSprite.material as THREE.SpriteMaterial;
        material.opacity = 0;
        visual.glowSprite.scale.set(visual.baseScale, visual.baseScale, 1);
      });
      return;
    }

    if (!visibleData.links.length) {
      impactPulsesRef.current.clear();
      return;
    }

    const progressByLink = new Map<string, number>();
    const pulseDurationMs = 300;
    let rafId = 0;
    let lastNow = performance.now();

    const triggerImpact = (nodeId: string, now: number) => {
      const current = impactPulsesRef.current.get(nodeId);
      impactPulsesRef.current.set(nodeId, {
        startedAt: now,
        until: Math.max(current?.until ?? 0, now + pulseDurationMs),
      });
    };

    const animate = (now: number) => {
      const deltaFrames = clamp((now - lastNow) / (1000 / 60), 0, 6);
      lastNow = now;

      visibleData.links.forEach((link) => {
        const linkKey = `${resolveId(link.source)}->${resolveId(link.target)}:${link.type}`;
        const offset = particleOffset(link);
        const baseProgress = progressByLink.get(linkKey) ?? offset;
        const nextProgress = baseProgress + resolvedParticleSpeed * deltaFrames;

        if (Math.floor(nextProgress) > Math.floor(baseProgress)) {
          triggerImpact(resolveId(link.target), now);
        }

        progressByLink.set(linkKey, nextProgress);
      });

      nodeVisualsRef.current.forEach((visual, nodeId) => {
        const pulse = impactPulsesRef.current.get(nodeId);
        const progress = pulse
          ? clamp((now - pulse.startedAt) / (pulse.until - pulse.startedAt), 0, 1)
          : 1;
        const pulseStrength = pulse ? Math.sin(progress * Math.PI) * 0.85 : 0;
        const easedStrength = easeOutCubic(pulseStrength);

        const material = visual.glowSprite.material as THREE.SpriteMaterial;
        material.opacity = easedStrength * 0.575;
        const scale = visual.baseScale * (1 + easedStrength * 0.24);
        visual.glowSprite.scale.set(scale, scale, 1);

        if (pulse && now >= pulse.until) {
          impactPulsesRef.current.delete(nodeId);
        }
      });

      rafId = requestAnimationFrame(animate);
    };

    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [impactGlow, particleOffset, resolvedParticleSpeed, visibleData.links]);

  if (loadError) {
    return (
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '100%',
          background: themeTokens.background,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 12,
          color: themeTokens.error,
          fontFamily: themeTokens.fontFamily,
        }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <span>Could not load graph</span>
        <span style={{ fontSize: 12, color: themeTokens.textMuted }}>{loadError}</span>
      </div>
    );
  }

  const hasGraph = Boolean(graphData);
  const hasNodes = (graphData?.nodes.length ?? 0) > 0;

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        background: themeTokens.background,
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {hasGraph && hasNodes && dimensions.width > 0 && dimensions.height > 0 ? (
        <ForceGraph3D
          ref={fgRef}
          graphData={visibleData}
          width={dimensions.width}
          height={dimensions.height}
          backgroundColor={themeTokens.background}
          nodeThreeObject={nodeThreeObject}
          nodeThreeObjectExtend={false}
          onNodeClick={handleNodeClick}
          onNodeRightClick={handleNodeRightClick}
          onNodeHover={handleNodeHover}
          nodeLabel=""
          linkColor={linkColor}
          linkOpacity={0.28}
          linkWidth={0.5}
          linkMaterial={linkMaterial}
          linkDirectionalParticles={particleCount}
          linkDirectionalParticleWidth={0.8}
          linkDirectionalParticleSpeed={particleSpeedAccessor}
          linkDirectionalParticleOffset={particleOffset}
          linkDirectionalParticleColor={particleColor}
          linkDirectionalParticleThreeObject={particleStyle === 'trail' ? particleThreeObject : undefined}
          enableNodeDrag={true}
          enableNavigationControls={true}
          showNavInfo={false}
        />
      ) : (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: themeTokens.textMuted,
            fontFamily: themeTokens.fontFamily,
            fontSize: 14,
            letterSpacing: '0.01em',
          }}
        >
          {hasGraph ? emptyMessage : 'Loading graph...'}
        </div>
      )}

      <div
        ref={tooltipRef}
        style={{
          display: 'none',
          position: 'absolute',
          left: 0,
          top: 0,
          padding: '5px 10px',
          borderRadius: 6,
          fontSize: 12,
          fontWeight: 600,
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
          zIndex: 9999,
          backdropFilter: 'blur(4px)',
          fontFamily: themeTokens.fontFamily,
        }}
      />

      <div
        ref={previewRef}
        style={{
          position: 'absolute',
          bottom: 58,
          left: 20,
          width: 'min(272px, calc(100% - 40px))',
          padding: '12px 14px',
          borderRadius: 10,
          border: '1px solid',
          fontSize: 13,
          lineHeight: 1.4,
          pointerEvents: 'none',
          zIndex: 9999,
          backdropFilter: 'blur(8px)',
          fontFamily: themeTokens.fontFamily,
          opacity: 0,
          transform: 'translateY(6px)',
          transition: 'opacity 0.18s ease, transform 0.18s ease',
        }}
      />

      {ghostTooltip ? (
        <div
          style={{
            position: 'absolute',
            left: ghostTooltip.x + 12,
            top: ghostTooltip.y + 12,
            background: themeTokens.panelBackground,
            color: themeTokens.textNormal,
            border: `1px solid ${themeTokens.panelBorder}`,
            padding: '6px 14px',
            borderRadius: 8,
            fontSize: 13,
            pointerEvents: 'none',
            zIndex: 10000,
            animation: 'gb-toast-fade 2.2s forwards',
            fontFamily: themeTokens.fontFamily,
          }}
        >
          Note not yet created
        </div>
      ) : null}

      {nodeContextMenu ? (
        <div
          data-gb-node-menu="true"
          style={{
            position: 'absolute',
            left: nodeContextMenu.x,
            top: nodeContextMenu.y,
            minWidth: 152,
            background: themeTokens.panelBackground,
            color: themeTokens.textNormal,
            border: `1px solid ${themeTokens.panelBorder}`,
            borderRadius: 10,
            padding: 6,
            zIndex: 10001,
            backdropFilter: 'blur(8px)',
            boxShadow: '0 10px 30px rgba(0,0,0,0.24)',
          }}
        >
          <button
            onPointerDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setNodeContextMenu(null);
              if (onOpenNode) {
                onOpenNode(nodeContextMenu.node);
                return;
              }
              if (nodeContextMenu.node.path) {
                window.location.href = nodeContextMenu.node.path;
              }
            }}
            style={{
              width: '100%',
              border: 'none',
              background: 'transparent',
              color: 'inherit',
              padding: '8px 10px',
              textAlign: 'left',
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: 13,
              fontFamily: themeTokens.fontFamily,
            }}
          >
            Open note
          </button>
        </div>
      ) : null}

      {highlightedTag !== null ? (
        <div
          style={{
            position: 'absolute',
            top: 20,
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: themeTokens.panelBackground,
            border: `1px solid ${themeTokens.accent}`,
            color: themeTokens.textNormal,
            padding: '6px 10px 6px 16px',
            borderRadius: 20,
            fontSize: 13,
            zIndex: 99999,
            userSelect: 'none',
            pointerEvents: 'none',
          }}
        >
          <span>
            Filtering by {formatNodeName(graphData?.nodes.find((node) => node.id === highlightedTag) ?? createFallbackTagNode(highlightedTag, themeTokens.accent))}
          </span>
          <button
            onPointerDown={(event) => {
              event.stopPropagation();
              event.preventDefault();
              setHighlightedTag(null);
            }}
            style={{
              pointerEvents: 'all',
              background: themeTokens.accent,
              border: `1px solid ${themeTokens.accent}`,
              color: themeTokens.accentText,
              borderRadius: 12,
              width: 22,
              height: 22,
              cursor: 'pointer',
              fontSize: 13,
              lineHeight: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              padding: 0,
            }}
            title="Clear tag filter"
          >
            ✕
          </button>
        </div>
      ) : null}

      {hasGraph && hasNodes && showInlineLabelToggle && onShowAllLabelsChange ? (
        <label
          style={{
            position: 'absolute',
            top: 20,
            right: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 12px',
            borderRadius: 999,
            background: themeTokens.panelBackgroundMuted,
            color: themeTokens.textNormal,
            border: `1px solid ${themeTokens.panelBorder}`,
            backdropFilter: 'blur(6px)',
            fontSize: 12,
            fontFamily: themeTokens.fontFamily,
            lineHeight: 1,
            zIndex: 9999,
            userSelect: 'none',
            cursor: 'pointer',
            pointerEvents: 'all',
          }}
          title="Show labels for all visible nodes"
        >
          <input
            type="checkbox"
            checked={showAllLabels}
            onChange={(event) => onShowAllLabelsChange(event.target.checked)}
            style={{ margin: 0 }}
          />
          <span>Show all labels</span>
        </label>
      ) : null}

      {showCallout && calloutPos && calloutTarget ? (
        <>
          {[0, 0.85].map((delay) => (
            <div
              key={delay}
              style={{
                position: 'absolute',
                left: calloutPos.x,
                top: calloutPos.y,
                transform: 'translate(-50%,-50%)',
                width: 52,
                height: 52,
                borderRadius: '50%',
                border: `2px solid ${calloutTarget.color ?? themeTokens.accent}`,
                animation: `gb-pulse 1.7s ease-out ${delay}s infinite`,
                pointerEvents: 'none',
                zIndex: 99998,
              }}
            />
          ))}

          <svg
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none',
              zIndex: 99998,
              overflow: 'visible',
            }}
          >
            <defs>
              <marker id="gb-arrowhead" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
                <path d="M0,0 L0,6 L8,3 z" fill={calloutTarget.color ?? themeTokens.accent} opacity="0.75" />
              </marker>
            </defs>
            <line
              x1={calloutPos.x - 110}
              y1={calloutPos.y - 75}
              x2={calloutPos.x - 14}
              y2={calloutPos.y - 14}
              stroke={calloutTarget.color ?? themeTokens.accent}
              strokeWidth="1.5"
              strokeDasharray="5,4"
              opacity="0.65"
              markerEnd="url(#gb-arrowhead)"
            />
          </svg>

          <div
            onPointerDown={(event) => {
              event.stopPropagation();
              dismissCallout();
            }}
            style={{
              position: 'absolute',
              left: calloutPos.x - 110,
              top: calloutPos.y - 75,
              transform: 'translate(-50%, -100%)',
              animation: 'gb-float 2.4s ease-in-out infinite, gb-fadein 0.6s ease',
              zIndex: 99999,
              pointerEvents: 'all',
              cursor: 'pointer',
              background: themeTokens.calloutBackground,
              border: `1px solid ${calloutTarget.color ?? themeTokens.accent}99`,
              borderRadius: 12,
              padding: '10px 16px',
              color: themeTokens.calloutText,
              fontSize: 13,
              fontFamily: themeTokens.fontFamily,
              textAlign: 'center',
              backdropFilter: 'blur(6px)',
              userSelect: 'none',
              whiteSpace: 'nowrap',
              boxShadow: `0 4px 20px ${calloutTarget.color ?? themeTokens.accent}33`,
            }}
            title="Click to dismiss"
          >
            <div style={{ fontWeight: 600 }}>
              {calloutLabel || calloutTarget.calloutText || 'Click to get started'}
            </div>
          </div>
        </>
      ) : null}

      {hasGraph && hasNodes && showHintBar ? (
        <div
          style={{
            position: 'absolute',
            bottom: 20,
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            pointerEvents: 'none',
            zIndex: 9998,
          }}
        >
          {isHintBarExpanded ? (
            <div
              style={{
                background: themeTokens.panelBackgroundMuted,
                color: themeTokens.textNormal,
                padding: '5px 14px',
                borderRadius: 20,
                fontSize: 12,
                pointerEvents: 'none',
                border: `1px solid ${themeTokens.panelBorder}`,
                whiteSpace: 'nowrap',
                backdropFilter: 'blur(4px)',
                fontFamily: themeTokens.fontFamily,
              }}
            >
              {hintText}
            </div>
          ) : null}

          <button
            onPointerDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setIsHintBarExpanded((current) => !current);
            }}
            style={{
              width: 28,
              height: 28,
              borderRadius: 999,
              border: `1px solid ${themeTokens.panelBorder}`,
              background: themeTokens.panelBackgroundMuted,
              color: themeTokens.textNormal,
              backdropFilter: 'blur(4px)',
              pointerEvents: 'all',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
            }}
            title={isHintBarExpanded ? 'Hide controls hint' : 'Show controls hint'}
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 10v6" />
              <path d="M12 7h.01" />
            </svg>
          </button>
        </div>
      ) : null}

      {showBuildCta && buildCta ? buildCta(() => setShowBuildCta(false)) : null}
    </div>
  );
});

export default InteractiveGraph;
