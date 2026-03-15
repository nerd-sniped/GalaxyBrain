import type { GraphData, GraphNode } from '../../../src/lib/types';
import type { GraphColorPreset } from './plugin-types';

interface ColorPresetDefinition {
  filePalette: string[];
  tagPalette: string[];
}

const COLOR_PRESETS: Record<GraphColorPreset, ColorPresetDefinition> = {
  default: {
    filePalette: [
      '#3498db',
    ],
    tagPalette: [
      '#FF6B6B', '#FFA726', '#FFEE58', '#66BB6A', '#26C6DA',
      '#42A5F5', '#7E57C2', '#AB47BC', '#EC407A',
      '#8D6E63', '#78909C', '#D4E157',
    ],
  },
  ocean: {
    filePalette: [
      '#3b82f6', '#0ea5e9', '#06b6d4', '#2563eb',
      '#14b8a6', '#60a5fa', '#2dd4bf', '#818cf8',
    ],
    tagPalette: [
      '#38bdf8', '#0ea5e9', '#0284c7', '#2563eb', '#1d4ed8',
      '#14b8a6', '#06b6d4', '#22d3ee', '#60a5fa',
      '#818cf8', '#2dd4bf', '#67e8f9',
    ],
  },
  ember: {
    filePalette: [
      '#e76f51', '#ef4444', '#f97316', '#fb7185',
      '#f59e0b', '#f43f5e', '#dc2626', '#fdba74',
    ],
    tagPalette: [
      '#ef4444', '#f97316', '#fb7185', '#f59e0b', '#f43f5e',
      '#dc2626', '#ea580c', '#facc15', '#b45309',
      '#c2410c', '#fda4af', '#fdba74',
    ],
  },
  forest: {
    filePalette: [
      '#2a9d8f', '#22c55e', '#16a34a', '#84cc16',
      '#10b981', '#4ade80', '#15803d', '#34d399',
    ],
    tagPalette: [
      '#2a9d8f', '#22c55e', '#16a34a', '#84cc16', '#65a30d',
      '#10b981', '#4ade80', '#15803d', '#86efac',
      '#4d7c0f', '#34d399', '#a3e635',
    ],
  },
  graphite: {
    filePalette: [
      '#94a3b8', '#cbd5e1', '#64748b', '#d6d3d1',
      '#9ca3af', '#bdb2ff', '#71717a', '#e5e7eb',
    ],
    tagPalette: [
      '#cbd5e1', '#94a3b8', '#e2e8f0', '#64748b', '#a8a29e',
      '#d6d3d1', '#9ca3af', '#bdb2ff', '#f5f5f4',
      '#71717a', '#d4d4d8', '#e5e7eb',
    ],
  },
};

function hashString(input: string): number {
  let hash = 5381;
  for (let index = 0; index < input.length; index += 1) {
    hash = (((hash << 5) + hash) ^ input.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function recolorNode(node: GraphNode, preset: ColorPresetDefinition): GraphNode {
  if (node.type === 'ghost' || node.colorSource === 'ghost') {
    return node;
  }

  if (node.type === 'file') {
    return {
      ...node,
      color: preset.filePalette[hashString(node.id) % preset.filePalette.length],
    };
  }

  if (node.type === 'tag' || node.colorSource === 'tag') {
    const family = node.id.replace(/^tag:/, '').split('/')[0];
    const nextColor = preset.tagPalette[hashString(family) % preset.tagPalette.length];
    return {
      ...node,
      color: nextColor,
    };
  }

  return node;
}

export function applyColorPreset(
  graphData: GraphData | null,
  presetId: GraphColorPreset,
): GraphData | null {
  if (!graphData || presetId === 'default') return graphData;

  const preset = COLOR_PRESETS[presetId];
  return {
    nodes: graphData.nodes.map((node) => recolorNode(node, preset)),
    links: graphData.links,
  };
}
