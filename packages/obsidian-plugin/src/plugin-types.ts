import type { GraphData } from '../../../src/lib/types';
import type { GraphAnimationMode, GraphParticleStyle } from '../../../src/lib/graph-ui';

export type GraphColorPreset = 'default' | 'ocean' | 'ember' | 'forest' | 'graphite';

export interface SearchableNoteMetadata {
  id: string;
  title: string;
  relativePath: string;
  tags: string[];
  createdAt: number;
  modifiedAt: number;
}

export interface GalaxyBrainGraphSnapshot {
  graphData: GraphData;
  noteMetadata: Map<string, SearchableNoteMetadata>;
}

export interface GraphFilterState {
  searchQuery: string;
  recentOnly: boolean;
  recentDays: number;
  recentBasis: 'modified' | 'created';
  showTags: boolean;
  existingFilesOnly: boolean;
  showOrphans: boolean;
  ignoreCollapsible: boolean;
  showAllLabels: boolean;
  impactGlow: boolean;
  colorPreset: GraphColorPreset;
  particleSpeed: number;
  particleRandomness: number;
  particleStyle: GraphParticleStyle;
  particleTrailLength: number;
  animationMode: GraphAnimationMode;
}
