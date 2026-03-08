/**
 * asset-collector.ts
 * Astro integration that runs at astro:build:start (before everything else).
 *
 * 1. Reads all published .md files from vault/.
 * 2. Extracts image references: ![[img.ext]], ![alt](path), frontmatter cover.
 * 3. Resolves each image by shortest-path match across vault/ (same logic as wikilinks).
 * 4. Copies matched files to public/vault-assets/ preserving relative vault/ structure.
 * 5. Writes .astro/vault-images.json — path map: { "photo.png": "/vault-assets/attachments/photo.png" }
 */

import type { AstroIntegration } from 'astro';
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
  copyFileSync,
} from 'node:fs';
import path from 'node:path';
import fg from 'fast-glob';
import matter from 'gray-matter';
import { detectGitHubPagesBase, withBasePath } from '../lib/hosting';

// ─── Constants ────────────────────────────────────────────────────────────────

const IMAGE_EXTENSIONS = new Set([
  'png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'avif', 'pdf',
]);

/** Determine if a filename has an image/media extension. */
function isImageFile(name: string): boolean {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  return IMAGE_EXTENSIONS.has(ext);
}

// ─── Image reference extraction ───────────────────────────────────────────────

/** Find all image filenames referenced in a markdown body. */
function extractImageRefs(body: string): string[] {
  const refs = new Set<string>();

  // ![[filename.ext]] — Obsidian embed syntax for images
  const obsidianRe = /!\[\[([^\]]+\.(png|jpg|jpeg|gif|svg|webp|avif|pdf))\]\]/gi;
  let m: RegExpExecArray | null;
  while ((m = obsidianRe.exec(body)) !== null) {
    refs.add(path.basename(m[1]));
  }

  // ![alt](path/to/image.ext) — standard markdown images
  const standardRe = /!\[[^\]]*\]\(([^)]+\.(png|jpg|jpeg|gif|svg|webp|avif|pdf))\)/gi;
  while ((m = standardRe.exec(body)) !== null) {
    refs.add(path.basename(m[1]));
  }

  return [...refs];
}

// ─── Shortest-path image resolver ─────────────────────────────────────────────

/**
 * Build an index from filename (lowercased) → absolute path for all files
 * found under a root directory matching image extensions.
 */
function buildImageIndex(vaultRoot: string, allImageFiles: string[]): Map<string, string> {
  const index = new Map<string, string>();
  for (const abs of allImageFiles) {
    const name = path.basename(abs).toLowerCase();
    // First occurrence wins (shortest path / first found)
    if (!index.has(name)) {
      index.set(name, abs);
    }
  }
  return index;
}

// ─── Integration ──────────────────────────────────────────────────────────────

export function assetCollector(): AstroIntegration {
  return {
    name: 'asset-collector',
    hooks: {
      'astro:build:start': async ({ logger }) => {
        await collect(process.cwd(), { info: logger.info.bind(logger), warn: logger.warn.bind(logger) });
      },
      // Also run in dev so images appear during `astro dev`
      'astro:server:setup': async () => {
        await collect(process.cwd());
      },
    },
  };
}

async function collect(
  projectRoot: string,
  log: { info: (s: string) => void; warn: (s: string) => void } = {
    info: (s) => console.log(`[asset-collector] ${s}`),
    warn: (s) => console.warn(`[asset-collector] ${s}`),
  },
): Promise<void> {
  const vaultRoot = path.join(projectRoot, 'vault');
  const basePath = detectGitHubPagesBase();
  const outputDir = path.join(projectRoot, 'public', 'vault-assets');
  const astroDir = path.join(projectRoot, '.astro');
  const mapFile = path.join(astroDir, 'vault-images.json');

  // ── 1. Find all markdown files ─────────────────────────────────────────────
  const mdFiles = await fg('**/*.md', {
    cwd: vaultRoot,
    absolute: true,
    onlyFiles: true,
    ignore: ['attachments/**'],
  });

  // ── 2. Find all image files in vault/ ─────────────────────────────────────
  const allImageFiles = await fg('**/*', {
    cwd: vaultRoot,
    absolute: true,
    onlyFiles: true,
  }).then((files) => files.filter((f) => isImageFile(f)));

  const imageIndex = buildImageIndex(vaultRoot, allImageFiles);
  log.info(`Found ${allImageFiles.length} image/asset files in vault/`);

  // ── 3. Collect referenced image names from published notes ─────────────────
  const referencedImages = new Set<string>();

  for (const mdFile of mdFiles) {
    const raw = readFileSync(mdFile, 'utf-8');
    const { data: fm, content } = matter(raw);

    if (fm.publish !== true) continue; // skip unpublished

    // Frontmatter cover
    if (fm.cover && typeof fm.cover === 'string') {
      referencedImages.add(path.basename(fm.cover));
    }

    // Body image references
    for (const ref of extractImageRefs(content)) {
      referencedImages.add(ref.toLowerCase());
    }
  }

  log.info(`Found ${referencedImages.size} unique image references in published notes`);

  // ── 4. Resolve & copy ──────────────────────────────────────────────────────
  const pathMap: Record<string, string> = {};

  mkdirSync(outputDir, { recursive: true });

  for (const imgName of referencedImages) {
    const resolved = imageIndex.get(imgName.toLowerCase());
    if (!resolved) {
      log.warn(`Image not found in vault: ${imgName}`);
      continue;
    }

    // Relative path from vault root, to preserve directory structure
    const relFromVault = path.relative(vaultRoot, resolved).replace(/\\/g, '/');
    const destPath = path.join(outputDir, relFromVault);

    mkdirSync(path.dirname(destPath), { recursive: true });

    if (!existsSync(destPath)) {
      copyFileSync(resolved, destPath);
      log.info(`Copied ${relFromVault} → public/vault-assets/${relFromVault}`);
    }

    // Map both the full relative path and the bare filename
    const publicPath = withBasePath(`/vault-assets/${relFromVault}`, basePath);
    pathMap[imgName] = publicPath;
    pathMap[path.basename(resolved).toLowerCase()] = publicPath;
  }

  // ── 5. Write path map ──────────────────────────────────────────────────────
  mkdirSync(astroDir, { recursive: true });
  writeFileSync(mapFile, JSON.stringify(pathMap, null, 2), 'utf-8');
  log.info(`Wrote vault-images.json with ${Object.keys(pathMap).length} entries`);
}
