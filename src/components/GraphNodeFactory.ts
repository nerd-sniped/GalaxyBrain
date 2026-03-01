import * as THREE from 'three';
import type { NodeShape } from '../lib/types';

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
 */
export function buildNodeObject(
  type: 'file' | 'ghost' | 'tag',
  shape: NodeShape,
  color: string,
  val: number,
): THREE.Object3D {
  const scale = Math.cbrt(val) * 1.2;

  if (type === 'ghost') {
    const geo = new THREE.SphereGeometry(0.6, 8, 8);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      wireframe: true,
      transparent: true,
      opacity: 0.15,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.scale.setScalar(scale);
    return mesh;
  }

  const geo = buildGeometry(type === 'tag' ? 'octahedron' : shape);
  const mat = new THREE.MeshLambertMaterial({ color });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.scale.setScalar(scale);
  return mesh;
}
