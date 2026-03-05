/**
 * remark-vault-images.ts
 *
 * Remark plugin that rewrites vault image references so they point to the
 * collected assets in public/vault-assets/.  Runs FIRST in the remark pipeline.
 *
 * Handles:
 *   ![[filename.png]]  — Obsidian embed syntax in text nodes
 *   ![alt](path.png)   — Standard markdown image nodes
 *
 * Reads the path map from .astro/vault-images.json (written by asset-collector).
 */

import { visit } from 'unist-util-visit';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'unified';
import type { Root, Text, Image, PhrasingContent } from 'mdast';

// ─── Image extensions ─────────────────────────────────────────────────────────

const IMAGE_EXT_RE = /\.(png|jpe?g|gif|svg|webp|avif|pdf)$/i;

// ─── Path map loader (cached) ─────────────────────────────────────────────────

let pathMapCache: Record<string, string> | null = null;

function loadPathMap(): Record<string, string> {
  if (pathMapCache) return pathMapCache;

  const mapFile = path.join(process.cwd(), '.astro', 'vault-images.json');
  if (!existsSync(mapFile)) {
    console.warn('[remark-vault-images] vault-images.json not found — skipping image rewrites');
    pathMapCache = {};
    return pathMapCache;
  }

  try {
    pathMapCache = JSON.parse(readFileSync(mapFile, 'utf-8')) as Record<string, string>;
    return pathMapCache;
  } catch (e) {
    console.warn('[remark-vault-images] Failed to parse vault-images.json:', e);
    pathMapCache = {};
    return pathMapCache;
  }
}

/** Look up the public URL for an image filename. */
function resolveImagePath(filename: string, map: Record<string, string>): string | null {
  const key = path.basename(filename).toLowerCase();
  return map[key] ?? null;
}

// ─── Regex for ![[img.ext]] in text nodes ────────────────────────────────────

// Match ![[filename.ext]] where ext is an image extension
const OBSIDIAN_IMG_RE =
  /!\[\[([^\]]+\.(png|jpe?g|gif|svg|webp|avif|pdf))\]\]/gi;

// ─── Plugin ───────────────────────────────────────────────────────────────────

const remarkVaultImages: Plugin<[], Root> = () => {
  return (tree) => {
    const map = loadPathMap();
    if (Object.keys(map).length === 0) return;

    // ── Pass 1: Rewrite ![[img.ext]] text nodes ─────────────────────────────
    visit(tree, 'text', (node: Text, index, parent) => {
      if (!parent || index == null) return;
      if (!OBSIDIAN_IMG_RE.test(node.value)) return;

      const parts: PhrasingContent[] = [];
      let lastIndex = 0;
      OBSIDIAN_IMG_RE.lastIndex = 0;
      let m: RegExpExecArray | null;

      while ((m = OBSIDIAN_IMG_RE.exec(node.value)) !== null) {
        if (m.index > lastIndex) {
          parts.push({ type: 'text', value: node.value.slice(lastIndex, m.index) });
        }

        const filename = m[1];
        const resolvedSrc = resolveImagePath(filename, map);

        if (resolvedSrc) {
          // Emit a proper image node so remark's AST stays well-typed
          const imgNode: Image = {
            type: 'image',
            url: resolvedSrc,
            alt: path.basename(filename, path.extname(filename)),
            title: null,
          };
          // Wrap in paragraph-level html since image nodes are block in some contexts
          // Use a raw HTML node for inline rendering; rehype-raw handles it
          const htmlNode = {
            type: 'html' as const,
            value: `<img src="${resolvedSrc}" alt="${imgNode.alt}" class="vault-image" loading="lazy" decoding="async" />`,
          };
          parts.push(htmlNode as unknown as PhrasingContent);
        } else {
          // Not found in vault — render a broken-image placeholder and log a warning
          console.warn(`[remark-vault-images] Image not found in vault: ${filename}`);
          const brokenHtml = [
            `<span class="vault-image-missing" title="Image not found: ${filename}">`,
            `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">`,
            `<rect x="3" y="3" width="18" height="18" rx="2"/><path d="m3 16 5-5 4 4 3-3 6 6"/><circle cx="8.5" cy="8.5" r="1.5"/>`,
            `</svg>`,
            `<em class="vault-image-missing-label">${filename}</em>`,
            `</span>`,
          ].join('');
          parts.push({ type: 'html' as const, value: brokenHtml } as unknown as PhrasingContent);
        }

        lastIndex = OBSIDIAN_IMG_RE.lastIndex;
      }

      if (parts.length === 0) return;

      if (lastIndex < node.value.length) {
        parts.push({ type: 'text', value: node.value.slice(lastIndex) });
      }

      parent.children.splice(index, 1, ...parts);
    });

    // ── Pass 2: Rewrite standard image nodes ────────────────────────────────
    visit(tree, 'image', (node: Image) => {
      if (!node.url) return;
      if (!IMAGE_EXT_RE.test(node.url)) return;
      // Only rewrite if it's NOT already an absolute URL or an existing vault-assets path
      if (node.url.startsWith('http') || node.url.includes('/vault-assets/')) return;

      const resolved = resolveImagePath(node.url, map);
      if (resolved) {
        node.url = resolved;
      }
    });
  };
};

// Reset cache between builds (used in dev mode)
export function resetImagePathMapCache(): void {
  pathMapCache = null;
}

export default remarkVaultImages;
