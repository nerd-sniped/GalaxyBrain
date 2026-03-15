import type { GraphData, GraphNode } from '../../../src/lib/types';
import type { GalaxyBrainGraphSnapshot, GraphFilterState } from './plugin-types';

function resolveId(value: unknown): string {
  return typeof value === 'object' && value !== null
    ? (value as GraphNode).id
    : (value as string);
}

function matchesQuery(query: string, metadata: { title: string; relativePath: string; tags: string[] }): boolean {
  const terms = query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);

  if (terms.length === 0) return true;

  const haystack = `${metadata.title}\n${metadata.relativePath}\n${metadata.tags.join(' ')}`
    .toLowerCase();

  return terms.every((term) => haystack.includes(term));
}

function isRecent(
  metadata: { createdAt: number; modifiedAt: number },
  filters: GraphFilterState,
  now = Date.now(),
): boolean {
  if (!filters.recentOnly) return true;

  const cutoff = now - filters.recentDays * 24 * 60 * 60 * 1000;
  const timestamp = filters.recentBasis === 'created'
    ? metadata.createdAt
    : metadata.modifiedAt;

  return timestamp >= cutoff;
}

function addAncestors(tagId: string, parentsByChild: Map<string, string[]>, visible: Set<string>): void {
  if (visible.has(tagId)) return;
  visible.add(tagId);

  for (const parentId of parentsByChild.get(tagId) ?? []) {
    addAncestors(parentId, parentsByChild, visible);
  }
}

export function applyGraphFilters(
  snapshot: GalaxyBrainGraphSnapshot | null,
  filters: GraphFilterState,
): GraphData | null {
  if (!snapshot) return null;

  const { graphData, noteMetadata } = snapshot;
  const nodeMap = new Map(graphData.nodes.map((node) => [node.id, node]));
  const wikilinks = graphData.links.filter((link) => link.type === 'wikilink');
  const fileTagLinks = graphData.links.filter((link) => link.type === 'file-tag');
  const tagHierarchyLinks = graphData.links.filter((link) => link.type === 'tag-hierarchy');

  let visibleFiles = new Set(
    graphData.nodes
      .filter((node) => node.type === 'file')
      .map((node) => node.id),
  );

  if (filters.searchQuery.trim()) {
    visibleFiles = new Set(
      [...visibleFiles].filter((id) => {
        const metadata = noteMetadata.get(id);
        return metadata ? matchesQuery(filters.searchQuery, metadata) : false;
      }),
    );
  }

  if (filters.recentOnly) {
    visibleFiles = new Set(
      [...visibleFiles].filter((id) => {
        const metadata = noteMetadata.get(id);
        return metadata ? isRecent(metadata, filters) : false;
      }),
    );
  }

  if (!filters.showOrphans) {
    const connectedFiles = new Set<string>();

    for (const link of wikilinks) {
      const sourceNode = nodeMap.get(resolveId(link.source));
      const targetNode = nodeMap.get(resolveId(link.target));
      if (sourceNode?.type === 'file') connectedFiles.add(sourceNode.id);
      if (targetNode?.type === 'file') connectedFiles.add(targetNode.id);
    }

    visibleFiles = new Set(
      [...visibleFiles].filter((id) => connectedFiles.has(id)),
    );
  }

  const visibleNodes = new Set<string>(visibleFiles);

  if (!filters.existingFilesOnly) {
    for (const link of wikilinks) {
      const sourceNode = nodeMap.get(resolveId(link.source));
      const targetNode = nodeMap.get(resolveId(link.target));
      if (sourceNode?.type !== 'file' || !visibleFiles.has(sourceNode.id)) continue;
      if (targetNode?.type === 'ghost') visibleNodes.add(targetNode.id);
    }
  }

  if (filters.showTags) {
    const visibleTags = new Set<string>();
    const parentsByChild = new Map<string, string[]>();

    for (const link of tagHierarchyLinks) {
      const parents = parentsByChild.get(link.target) ?? [];
      parents.push(link.source);
      parentsByChild.set(link.target, parents);
    }

    for (const link of fileTagLinks) {
      const sourceId = resolveId(link.source);
      const targetId = resolveId(link.target);
      if (visibleFiles.has(sourceId)) {
        addAncestors(targetId, parentsByChild, visibleTags);
      }
    }

    visibleTags.forEach((id) => visibleNodes.add(id));
  }

  const filteredLinks = graphData.links.filter((link) => {
    const sourceId = resolveId(link.source);
    const targetId = resolveId(link.target);

    if (!visibleNodes.has(sourceId) || !visibleNodes.has(targetId)) return false;
    if (!filters.showTags && (link.type === 'file-tag' || link.type === 'tag-hierarchy')) return false;
    if (filters.existingFilesOnly) {
      const sourceNode = nodeMap.get(sourceId);
      const targetNode = nodeMap.get(targetId);
      if (sourceNode?.type === 'ghost' || targetNode?.type === 'ghost') return false;
    }
    return true;
  });

  const linkedNodeIds = new Set<string>();
  filteredLinks.forEach((link) => {
    linkedNodeIds.add(resolveId(link.source));
    linkedNodeIds.add(resolveId(link.target));
  });

  const filteredNodes = graphData.nodes.filter((node) => {
    if (!visibleNodes.has(node.id)) return false;
    if (node.type === 'tag' || node.type === 'ghost') {
      return linkedNodeIds.has(node.id);
    }
    return true;
  });

  return {
    // Clone nodes/links before passing into ForceGraph. The library mutates
    // node coordinates and rewrites link endpoints to object refs.
    nodes: filteredNodes.map((node) => ({ ...node })),
    links: filteredLinks.map((link) => ({
      ...link,
      source: resolveId(link.source),
      target: resolveId(link.target),
    })),
  };
}

export function countVisibleNodes(graphData: GraphData | null, type: GraphNode['type']): number {
  return graphData?.nodes.filter((node) => node.type === type).length ?? 0;
}
