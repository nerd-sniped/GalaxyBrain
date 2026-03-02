import * as THREE from 'three';
import type { NodeShape } from '../lib/types';

// ─── Colour helpers ───────────────────────────────────────────────────────────

/** Parse a #rrggbb hex string to [r, g, b] in [0, 1] range */
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16) / 255,
    parseInt(h.slice(2, 4), 16) / 255,
    parseInt(h.slice(4, 6), 16) / 255,
  ];
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return [h, s, l];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  if (s === 0) return [l, l, l];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hue = (t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 0.5)   return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [hue(h + 1 / 3), hue(h), hue(h - 1 / 3)];
}

/** Darken a #rrggbb colour by reducing HSL lightness by `amount` (0–1). */
function darkenHex(hex: string, amount = 0.22): string {
  const [r, g, b] = hexToRgb(hex);
  const [h, s, l] = rgbToHsl(r, g, b);
  const [nr, ng, nb] = hslToRgb(h, s, Math.max(0, l - amount));
  const toHex = (x: number) => Math.round(x * 255).toString(16).padStart(2, '0');
  return `#${toHex(nr)}${toHex(ng)}${toHex(nb)}`;
}

/**
 * Returns the effective colour for a node, adjusting for dark vs light mode.
 * In light mode, colours are darkened by ~22% so they stay readable on white.
 */
function resolveColor(color: string, isLight: boolean): string {
  if (!isLight) return color;
  return darkenHex(color, 0.22);
}

/**
 * Maps a frontmatter shape string to a THREE.js BufferGeometry.
 * All geometries are unit-sized — the force graph scales them via `val`.
 */
export function buildGeometry(shape: NodeShape): THREE.BufferGeometry {
  switch (shape) {
    case 'box':
      return new THREE.BoxGeometry(1, 1, 1);
    case 'cone':
      return new THREE.ConeGeometry(0.6, 1.2, 8);
    case 'cylinder':
      return new THREE.CylinderGeometry(0.5, 0.5, 1.2, 8);
    case 'dodecahedron':
      return new THREE.DodecahedronGeometry(0.7);
    case 'torus':
      return new THREE.TorusGeometry(0.5, 0.2, 8, 16);
    case 'torusknot':
      return new THREE.TorusKnotGeometry(0.4, 0.15, 64, 8);
    case 'octahedron':
      return new THREE.OctahedronGeometry(0.7);
    case 'sphere':
    default:
      return new THREE.SphereGeometry(0.6, 12, 12);
  }
}

/**
 * Builds the Three.js Object3D used to render a single graph node.
 * Ghost nodes get wireframe rendering; tag nodes get an octahedron.
 * Pass isLight=true to automatically adjust colours for light backgrounds.
 */
export function buildNodeObject(
  type: 'file' | 'ghost' | 'tag',
  shape: NodeShape,
  color: string,
  val: number,
  isLight = false,
): THREE.Object3D {
  const scale = Math.cbrt(val) * 1.2;

  if (type === 'ghost') {
    const geo = new THREE.SphereGeometry(0.6, 8, 8);
    const mat = new THREE.MeshBasicMaterial({
      color:       isLight ? 0x888888 : 0xffffff,
      wireframe:   true,
      transparent: true,
      opacity:     isLight ? 0.35 : 0.15,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.scale.setScalar(scale);
    return mesh;
  }

  const effectiveColor = resolveColor(color, isLight);
  const geo = buildGeometry(type === 'tag' ? 'octahedron' : shape);
  const mat = new THREE.MeshLambertMaterial({ color: effectiveColor });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.scale.setScalar(scale);
  return mesh;
}
