/**
 * graph-types.ts
 * Canonical types for Phase 2 graph building pipeline.
 * Re-exports everything from types.ts and adds per-note graph types.
 */

export type {
  NodeShape,
  NodeType,
  LinkType,
  GraphNode,
  GraphLink,
  GraphData,
  NoteFrontmatter,
  ParsedNote,
} from './types';

// ─── Per-Note Graph (public/graph/[id].json) ─────────────────────────────────

/** Minimal reference to a note used in backlinks / forwardLinks lists. */
export interface NoteRef {
  id: string;
  name: string;
  path: string | null;
}

/**
 * Schema for `public/graph/[noteId].json`.
 * Extends the full GraphData with pre-computed backlinks and forward-link lists
 * so the sidebar LocalGraph component doesn't need to re-derive them.
 */
export interface NoteGraphData {
  nodes: import('./types').GraphNode[];
  links: import('./types').GraphLink[];
  /** Notes that link TO this note (incoming wikilinks). */
  backlinks: NoteRef[];
  /** Notes this note links TO (outgoing wikilinks). */
  forwardLinks: NoteRef[];
}
