import type { NoteGraphData, NoteRef } from './graph-types';
import { buildResolverIndex, resolveWikilink } from './link-resolver';
import { slugify } from './vault-parser';
import type { GraphData, GraphLink, GraphNode, NodeShape, ParsedNote } from './types';

export interface BuildGraphDataOptions {
  visibility?: 'all' | 'publish-only';
  mapNotePath?: (note: ParsedNote) => string | null;
  includeCallouts?: boolean;
}

const TAG_COLORS = [
  '#FF6B6B', '#FFA726', '#FFEE58', '#66BB6A', '#26C6DA',
  '#42A5F5', '#7E57C2', '#AB47BC', '#EC407A',
  '#8D6E63', '#78909C', '#D4E157',
];

function hashString(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = (((h << 5) + h) ^ s.charCodeAt(i)) >>> 0;
  }
  return h;
}

function tagColor(topLevelFamily: string): string {
  return TAG_COLORS[hashString(topLevelFamily) % TAG_COLORS.length];
}

function selectVisibleNotes(
  notes: ParsedNote[],
  visibility: BuildGraphDataOptions['visibility'],
): ParsedNote[] {
  if (visibility === 'publish-only') {
    return notes.filter((note) => note.frontmatter.publish === true);
  }
  return notes;
}

export function buildGraphData(
  notes: ParsedNote[],
  options: BuildGraphDataOptions = {},
): GraphData {
  const {
    visibility = 'publish-only',
    mapNotePath = () => null,
    includeCallouts = true,
  } = options;

  const visibleNotes = selectVisibleNotes(notes, visibility);
  const index = buildResolverIndex(visibleNotes);
  const allTagNames = new Set<string>();

  for (const note of visibleNotes) {
    for (const tag of note.tags) allTagNames.add(tag);
  }

  const nodeMap = new Map<string, GraphNode>();

  for (const note of visibleNotes) {
    const fm = note.frontmatter;
    nodeMap.set(note.id, {
      id: note.id,
      name: fm.title ?? note.id,
      type: 'file',
      path: mapNotePath(note),
      val: 1,
      shape: (fm.graph?.shape as NodeShape) ?? 'sphere',
      color: fm.graph?.color ?? '#3498db',
      colorSource: fm.graph?.color ? 'manual' : 'default',
      collapsible: fm.graph?.collapsible ?? false,
      pinned: fm.graph?.pinned ?? false,
      callout: includeCallouts ? (fm.graph?.callout ?? false) : false,
      calloutText: includeCallouts ? (fm.graph?.calloutText ?? 'Click to get started') : '',
      excerpt: note.excerpt || null,
    });
  }

  for (const tagName of allTagNames) {
    const topLevel = tagName.split('/')[0];
    nodeMap.set(`tag:${tagName}`, {
      id: `tag:${tagName}`,
      name: `#${tagName}`,
      type: 'tag',
      path: null,
      val: 1,
      shape: 'octahedron',
      color: tagColor(topLevel),
      colorSource: 'tag',
      collapsible: false,
      pinned: false,
      callout: false,
      calloutText: '',
      excerpt: null,
    });
  }

  const links: GraphLink[] = [];
  const ghostTargets = new Map<string, string>();

  for (const note of visibleNotes) {
    for (const target of note.wikilinks) {
      const resolved = resolveWikilink(target, index, visibility === 'publish-only');
      if (resolved) {
        if (resolved.id !== note.id) {
          links.push({ source: note.id, target: resolved.id, type: 'wikilink' });
        }
      } else {
        const ghostId = `ghost:${slugify(target)}`;
        if (!ghostTargets.has(ghostId)) ghostTargets.set(ghostId, target);
        links.push({ source: note.id, target: ghostId, type: 'wikilink' });
      }
    }

    for (const tag of note.tags) {
      links.push({ source: note.id, target: `tag:${tag}`, type: 'file-tag' });
    }
  }

  for (const [ghostId, displayName] of ghostTargets) {
    nodeMap.set(ghostId, {
      id: ghostId,
      name: displayName,
      type: 'ghost',
      path: null,
      val: 1,
      shape: 'sphere',
      color: '#ffffff',
      colorSource: 'ghost',
      collapsible: false,
      pinned: false,
      callout: false,
      calloutText: '',
      excerpt: null,
    });
  }

  for (const tagName of allTagNames) {
    const parts = tagName.split('/');
    if (parts.length < 2) continue;

    const parentTag = parts.slice(0, -1).join('/');
    if (!allTagNames.has(parentTag)) continue;

    links.push({
      source: `tag:${parentTag}`,
      target: `tag:${tagName}`,
      type: 'tag-hierarchy',
    });
  }

  const seenLinks = new Set<string>();
  const dedupedLinks: GraphLink[] = [];
  for (const link of links) {
    const key = `${link.source}→${link.target}→${link.type}`;
    if (seenLinks.has(key)) continue;
    seenLinks.add(key);
    dedupedLinks.push(link);
  }

  const linkCount = new Map<string, number>();
  const increment = (id: string) => linkCount.set(id, (linkCount.get(id) ?? 0) + 1);
  for (const link of dedupedLinks) {
    increment(link.source);
    increment(link.target);
  }

  for (const [id, node] of nodeMap) {
    node.val = Math.max(1, linkCount.get(id) ?? 0);
  }

  return {
    nodes: [...nodeMap.values()],
    links: dedupedLinks,
  };
}

export function buildNoteGraphData(
  graphData: GraphData,
  noteId: string,
): NoteGraphData {
  const nodeMap = new Map(graphData.nodes.map((node) => [node.id, node]));
  const adjacency = new Map<string, Set<string>>();
  const backlinkMap = new Map<string, Set<string>>();

  const addEdge = (a: string, b: string) => {
    if (!adjacency.has(a)) adjacency.set(a, new Set());
    if (!adjacency.has(b)) adjacency.set(b, new Set());
    adjacency.get(a)?.add(b);
    adjacency.get(b)?.add(a);
  };

  for (const link of graphData.links) {
    addEdge(link.source, link.target);

    if (link.type !== 'wikilink') continue;
    if (!backlinkMap.has(link.target)) backlinkMap.set(link.target, new Set());
    backlinkMap.get(link.target)?.add(link.source);
  }

  const neighbors = adjacency.get(noteId) ?? new Set<string>();
  const subsetIds = new Set<string>([noteId, ...neighbors]);

  const asNoteRef = (node: GraphNode): NoteRef => ({
    id: node.id,
    name: node.name,
    path: node.path,
  });

  const backlinks: NoteRef[] = [...(backlinkMap.get(noteId) ?? new Set<string>())]
    .map((id) => nodeMap.get(id))
    .filter((node): node is GraphNode => node?.type === 'file')
    .map(asNoteRef);

  const forwardLinks: NoteRef[] = graphData.links
    .filter((link) => link.source === noteId && link.type === 'wikilink')
    .map((link) => nodeMap.get(link.target))
    .filter((node): node is GraphNode => node?.type === 'file')
    .map(asNoteRef);

  return {
    nodes: [...subsetIds]
      .map((id) => nodeMap.get(id))
      .filter((node): node is GraphNode => Boolean(node)),
    links: graphData.links.filter(
      (link) => subsetIds.has(link.source) && subsetIds.has(link.target),
    ),
    backlinks,
    forwardLinks,
  };
}
