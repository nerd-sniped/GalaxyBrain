/**
 * graph-builder.ts
 * Astro integration that parses vault/*.md and emits:
 *   public/graph.json          — full graph
 *   public/graph/[id].json     — 1-hop neighbourhood for each published note
 *
 * Runs on:  astro:config:done  (fires in BOTH `dev` and `build` modes before
 * content collections are processed, so the React graph island always has
 * up-to-date data).
 */

import type { AstroIntegration } from 'astro';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fg from 'fast-glob';

import { parseNote, slugify } from '../lib/vault-parser.js';
import { buildResolverIndex, resolveWikilink } from '../lib/link-resolver.js';
import type { GraphNode, GraphLink, GraphData, NodeShape } from '../lib/types.js';
import type { NoteGraphData, NoteRef } from '../lib/graph-types.js';
import { detectGitHubPagesBase, withBasePath } from '../lib/hosting';

// ─── Tag colour palette ───────────────────────────────────────────────────────

const TAG_COLORS = [
  '#FF6B6B', '#FFA726', '#FFEE58', '#66BB6A', '#26C6DA',
  '#42A5F5', '#7E57C2', '#AB47BC', '#EC407A',
  '#8D6E63', '#78909C', '#D4E157',
];

function hashString(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = (((h << 5) + h) ^ s.charCodeAt(i)) >>> 0; // unsigned 32-bit
  }
  return h;
}

function tagColor(topLevelFamily: string): string {
  return TAG_COLORS[hashString(topLevelFamily) % TAG_COLORS.length];
}

// ─── Core builder ─────────────────────────────────────────────────────────────

async function buildGraph(projectRoot: string, logger?: { info: (s: string) => void; warn: (s: string) => void }): Promise<void> {
  const log = {
    info: (s: string) => logger?.info(s) ?? console.log(`[graph-builder] ${s}`),
    warn: (s: string) => logger?.warn(s) ?? console.warn(`[graph-builder] ${s}`),
  };

  const vaultRoot = path.join(projectRoot, 'vault');
  const basePath = detectGitHubPagesBase();
  const publicDir = path.join(projectRoot, 'public');
  const graphDir = path.join(publicDir, 'graph');

  // ── 1. Glob all .md files ──────────────────────────────────────────────────
  const mdFiles = await fg('**/*.md', {
    cwd: vaultRoot,
    absolute: true,
    onlyFiles: true,
    ignore: ['attachments/**'],
  });

  log.info(`Found ${mdFiles.length} markdown files in vault/`);

  // ── 2. Parse every file ────────────────────────────────────────────────────
  const allNotes = mdFiles.flatMap((filePath) => {
    try {
      const raw = readFileSync(filePath, 'utf-8');
      return [parseNote(raw, filePath, vaultRoot)];
    } catch (err) {
      log.warn(`Skipping malformed file ${path.relative(vaultRoot, filePath)}: ${String(err)}`);
      return [] as ReturnType<typeof parseNote>[];
    }
  });

  // ── 3. Filter to published notes ───────────────────────────────────────────
  const publishedNotes = allNotes.filter((n) => n.frontmatter.publish === true);
  log.info(`${publishedNotes.length} notes have publish: true`);

  // ── 4. Build resolver index (all notes → only resolves to published) ───────
  const index = buildResolverIndex(publishedNotes);

  // ── 5. Collect all unique tags from published notes ────────────────────────
  const allTagNames = new Set<string>();
  for (const note of publishedNotes) {
    for (const tag of note.tags) allTagNames.add(tag);
  }

  // ── 6. Build node maps ─────────────────────────────────────────────────────

  const nodeMap = new Map<string, GraphNode>();

  // File nodes
  for (const note of publishedNotes) {
    const fm = note.frontmatter;
    const node: GraphNode = {
      id: note.id,
      name: fm.title ?? note.id,
      type: 'file',
      path: withBasePath(`/notes/${note.id}`, basePath),
      val: 1,
      shape: (fm.graph?.shape as NodeShape) ?? 'sphere',
      color: fm.graph?.color ?? '#3498db',
      collapsible: fm.graph?.collapsible ?? false,
      pinned:      fm.graph?.pinned      ?? false,
      callout:     fm.graph?.callout    ?? false,
      calloutText: fm.graph?.calloutText ?? 'Click to get started',
      excerpt: note.excerpt || null,
    };
    nodeMap.set(note.id, node);
  }

  // Tag nodes
  for (const tagName of allTagNames) {
    const tagId = `tag:${tagName}`;
    const topLevel = tagName.split('/')[0];
    const node: GraphNode = {
      id: tagId,
      name: `#${tagName}`,
      type: 'tag',
      path: null,
      val: 1,
      shape: 'octahedron',
      color: tagColor(topLevel),
      collapsible: false,
      pinned:      false,
      callout:     false,
      calloutText: '',
      excerpt: null,
    };
    nodeMap.set(tagId, node);
  }

  // ── 7. Build links + collect ghost node targets ────────────────────────────

  const links: GraphLink[] = [];
  // Track ghost targets we haven't created nodes for yet
  const ghostTargets = new Map<string, string>(); // ghostId → display name

  for (const note of publishedNotes) {
    // Wikilinks
    for (const target of note.wikilinks) {
      const resolved = resolveWikilink(target, index);
      if (resolved) {
        // file → file only if distinct
        if (resolved.id !== note.id) {
          links.push({ source: note.id, target: resolved.id, type: 'wikilink' });
        }
      } else {
        // Unresolved → ghost node
        const ghostId = `ghost:${slugify(target)}`;
        if (!ghostTargets.has(ghostId)) {
          ghostTargets.set(ghostId, target);
        }
        links.push({ source: note.id, target: ghostId, type: 'wikilink' });
      }
    }

    // File → tag links
    for (const tag of note.tags) {
      links.push({ source: note.id, target: `tag:${tag}`, type: 'file-tag' });
    }
  }

  // Ghost nodes
  for (const [ghostId, displayName] of ghostTargets) {
    const node: GraphNode = {
      id: ghostId,
      name: displayName,
      type: 'ghost',
      path: null,
      val: 1,
      shape: 'sphere',
      color: '#ffffff',
      collapsible: false,
      pinned:      false,
      callout:     false,
      calloutText: '',
      excerpt: null,
    };
    nodeMap.set(ghostId, node);
  }

  // Tag hierarchy links (tag:programming → tag:programming/systems)
  for (const tagName of allTagNames) {
    const parts = tagName.split('/');
    if (parts.length > 1) {
      const parentTag = parts.slice(0, -1).join('/');
      if (allTagNames.has(parentTag)) {
        links.push({
          source: `tag:${parentTag}`,
          target: `tag:${tagName}`,
          type: 'tag-hierarchy',
        });
      }
    }
  }

  // ── 8. Deduplicate links (same source+target+type may appear multiple times) ─

  const seenLinks = new Set<string>();
  const dedupedLinks: GraphLink[] = [];
  for (const link of links) {
    const key = `${link.source}→${link.target}→${link.type}`;
    if (!seenLinks.has(key)) {
      seenLinks.add(key);
      dedupedLinks.push(link);
    }
  }

  // ── 9. Compute val (link count) per node ───────────────────────────────────

  const linkCount = new Map<string, number>();
  const increment = (id: string) => linkCount.set(id, (linkCount.get(id) ?? 0) + 1);
  for (const link of dedupedLinks) {
    increment(link.source);
    increment(link.target);
  }

  for (const [id, node] of nodeMap) {
    node.val = Math.max(1, linkCount.get(id) ?? 0);
  }

  const nodes = [...nodeMap.values()];
  const fullGraph: GraphData = { nodes, links: dedupedLinks };

  // ── 10. Write public/graph.json ────────────────────────────────────────────

  if (!existsSync(publicDir)) mkdirSync(publicDir, { recursive: true });
  writeFileSync(
    path.join(publicDir, 'graph.json'),
    JSON.stringify(fullGraph, null, 2),
    'utf-8',
  );
  log.info(`Wrote public/graph.json (${nodes.length} nodes, ${dedupedLinks.length} links)`);

  // ── 11. Write per-note public/graph/[id].json ──────────────────────────────

  if (!existsSync(graphDir)) mkdirSync(graphDir, { recursive: true });

  // Pre-build adjacency: nodeId → Set of adjacent nodeIds
  const adjacency = new Map<string, Set<string>>();
  const addEdge = (a: string, b: string) => {
    if (!adjacency.has(a)) adjacency.set(a, new Set());
    if (!adjacency.has(b)) adjacency.set(b, new Set());
    adjacency.get(a)!.add(b);
    adjacency.get(b)!.add(a);
  };
  for (const link of dedupedLinks) addEdge(link.source, link.target);

  // Pre-build backlink map: noteId → Set of noteIds that link TO it (wikilinks only)
  const backlinkMap = new Map<string, Set<string>>();
  for (const link of dedupedLinks) {
    if (link.type !== 'wikilink') continue;
    if (!backlinkMap.has(link.target)) backlinkMap.set(link.target, new Set());
    backlinkMap.get(link.target)!.add(link.source);
  }

  for (const note of publishedNotes) {
    const centerNodeId = note.id;
    const neighbors = adjacency.get(centerNodeId) ?? new Set<string>();
    const subsetIds = new Set<string>([centerNodeId, ...neighbors]);

    // Nodes in 1-hop neighbourhood
    const subNodes = [...subsetIds]
      .map((id) => nodeMap.get(id))
      .filter(Boolean) as GraphNode[];

    // Links where BOTH endpoints are in the subset
    const subLinks = dedupedLinks.filter(
      (l) => subsetIds.has(l.source) && subsetIds.has(l.target),
    );

    // Backlinks: file nodes that wikilink TO this note
    const backlinkIds = backlinkMap.get(centerNodeId) ?? new Set<string>();
    const backlinks: NoteRef[] = [...backlinkIds]
      .map((id) => nodeMap.get(id))
      .filter((n): n is GraphNode => n?.type === 'file')
      .map((n) => ({ id: n.id, name: n.name, path: n.path }));

    // Forward links: file nodes this note wikilinks TO
    const forwardLinkIds = dedupedLinks
      .filter((l) => l.source === centerNodeId && l.type === 'wikilink')
      .map((l) => l.target);
    const forwardLinks: NoteRef[] = forwardLinkIds
      .map((id) => nodeMap.get(id))
      .filter((n): n is GraphNode => n?.type === 'file')
      .map((n) => ({ id: n.id, name: n.name, path: n.path }));

    const noteGraph: NoteGraphData = {
      nodes: subNodes,
      links: subLinks,
      backlinks,
      forwardLinks,
    };

    writeFileSync(
      path.join(graphDir, `${centerNodeId}.json`),
      JSON.stringify(noteGraph, null, 2),
      'utf-8',
    );
  }

  log.info(`Wrote ${publishedNotes.length} per-note JSON files to public/graph/`);
}

// ─── Astro integration ────────────────────────────────────────────────────────

export function graphBuilder(): AstroIntegration {
  let projectRoot = '';

  return {
    name: 'graph-builder',
    hooks: {
      /**
       * `astro:config:done` fires once in BOTH dev and build modes,
       * right after Astro has resolved all config. Writing graph.json here
       * means the dev server and production build both get fresh data.
       */
      'astro:config:done': async ({ config, logger }) => {
        projectRoot = fileURLToPath(config.root);
        await buildGraph(projectRoot, logger);
      },

      /**
       * In dev mode, watch vault notes for changes and rebuild the graph
       * automatically. Sends a full-page reload so the React graph island
       * re-fetches /graph.json with the latest data.
       */
      'astro:server:setup': ({ server, logger }) => {
        const vaultGlob = path.join(projectRoot, 'vault', '**', '*.md');

        server.watcher.add(vaultGlob);

        let rebuilding = false;
        const rebuild = async (filePath: string) => {
          if (rebuilding) return;
          rebuilding = true;
          try {
            logger.info(`Vault file changed: ${path.relative(projectRoot, filePath)} — rebuilding graph…`);
            await buildGraph(projectRoot, logger);
            // Invalidate the graph JSON modules in Vite's module graph so the
            // dev server serves fresh data, then trigger a full page reload.
            server.moduleGraph.invalidateAll();
            server.hot.send({ type: 'full-reload' });
          } finally {
            rebuilding = false;
          }
        };

        server.watcher.on('change', (filePath) => {
          if (filePath.includes(`${path.sep}vault${path.sep}`) && filePath.endsWith('.md')) {
            rebuild(filePath);
          }
        });
        server.watcher.on('add', (filePath) => {
          if (filePath.includes(`${path.sep}vault${path.sep}`) && filePath.endsWith('.md')) {
            rebuild(filePath);
          }
        });
        server.watcher.on('unlink', (filePath) => {
          if (filePath.includes(`${path.sep}vault${path.sep}`) && filePath.endsWith('.md')) {
            rebuild(filePath);
          }
        });
      },
    },
  };
}
