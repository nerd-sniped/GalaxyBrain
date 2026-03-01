// ─── Graph Data ──────────────────────────────────────────────────────────────

export type NodeShape =
  | 'sphere'
  | 'box'
  | 'cone'
  | 'cylinder'
  | 'dodecahedron'
  | 'torus'
  | 'torusknot'
  | 'octahedron';

export type NodeType = 'file' | 'ghost' | 'tag';
export type LinkType = 'wikilink' | 'file-tag' | 'tag-hierarchy';

export interface GraphNode {
  id: string;
  name: string;
  type: NodeType;
  path: string | null;
  /** Force graph sizing — proportional to link count */
  val: number;
  shape: NodeShape;
  color: string;
  /** When true, downstream nodes start hidden until user clicks this node */
  collapsible: boolean;
  excerpt: string | null;
}

export interface GraphLink {
  source: string;
  target: string;
  type: LinkType;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

// ─── Frontmatter ─────────────────────────────────────────────────────────────

export interface NoteFrontmatter {
  publish?: boolean;
  title?: string;
  tags?: string[];
  aliases?: string[];
  graph?: {
    shape?: NodeShape;
    color?: string;
    collapsible?: boolean;
  };
  cover?: string;
}

// ─── Vault Parser ────────────────────────────────────────────────────────────

export interface ParsedNote {
  id: string;            // slug derived from file path
  filePath: string;      // absolute path on disk
  relativePath: string;  // relative to vault/notes/
  frontmatter: NoteFrontmatter;
  /** Raw markdown content (without frontmatter) */
  content: string;
  /** [[wikilink]] targets (unresolved, as written in the file) */
  wikilinks: string[];
  tags: string[];
  aliases: string[];
  blockIds: string[];    // ^block-id markers found in content
  excerpt: string;       // First 200 chars of plain text
}
