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

import { buildGraphData, buildNoteGraphData } from '../lib/graph-core.js';
import { parseNote } from '../lib/vault-parser.js';
import { detectGitHubPagesBase, withBasePath } from '../lib/hosting';

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

  // ── 4. Build full graph JSON using the shared graph core ───────────────────
  const fullGraph = buildGraphData(allNotes, {
    visibility: 'publish-only',
    includeCallouts: true,
    mapNotePath: (note) => withBasePath(`/notes/${note.id}`, basePath),
  });

  // ── 5. Write public/graph.json ─────────────────────────────────────────────

  if (!existsSync(publicDir)) mkdirSync(publicDir, { recursive: true });
  writeFileSync(
    path.join(publicDir, 'graph.json'),
    JSON.stringify(fullGraph, null, 2),
    'utf-8',
  );
  log.info(`Wrote public/graph.json (${fullGraph.nodes.length} nodes, ${fullGraph.links.length} links)`);

  // ── 6. Write per-note public/graph/[id].json ───────────────────────────────

  if (!existsSync(graphDir)) mkdirSync(graphDir, { recursive: true });

  for (const note of publishedNotes) {
    writeFileSync(
      path.join(graphDir, `${note.id}.json`),
      JSON.stringify(buildNoteGraphData(fullGraph, note.id), null, 2),
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
