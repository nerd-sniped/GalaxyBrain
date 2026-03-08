/**
 * remark-transclusion.ts
 *
 * Remark plugin that resolves Obsidian-style embed syntax:
 *   ![[note-name#^blockId]]  — block embed   → <blockquote class="transclusion">
 *   ![[note-name]]           — full note embed → <div class="transclusion-embed">
 *
 * Runs AFTER remark-vault-images (so images are already rewritten) but BEFORE
 * remark-wikilinks (so the [[...]] hasn't been converted to <a> yet).
 *
 * Reads block content from .astro/block-index.json (written by block-indexer).
 */

import { visit } from 'unist-util-visit';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'unified';
import type { Root, Text, PhrasingContent, BlockContent, Html } from 'mdast';
import { detectGitHubPagesBase, withBasePath } from '../lib/hosting';

const basePath = detectGitHubPagesBase();

// ─── Block index loader (cached) ──────────────────────────────────────────────

let blockIndexCache: Record<string, string> | null = null;

function loadBlockIndex(): Record<string, string> {
  if (blockIndexCache) return blockIndexCache;

  const indexFile = path.join(process.cwd(), '.astro', 'block-index.json');
  if (!existsSync(indexFile)) {
    console.warn('[remark-transclusion] block-index.json not found — skipping transclusions');
    blockIndexCache = {};
    return blockIndexCache;
  }

  try {
    blockIndexCache = JSON.parse(readFileSync(indexFile, 'utf-8')) as Record<string, string>;
    return blockIndexCache;
  } catch (e) {
    console.warn('[remark-transclusion] Failed to parse block-index.json:', e);
    blockIndexCache = {};
    return blockIndexCache;
  }
}

// ─── Slug helpers ─────────────────────────────────────────────────────────────

function toSlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// ─── Markdown → safe HTML (minimal renderer) ─────────────────────────────────

/**
 * Convert a small markdown snippet to HTML string.
 * Uses a simple synchronous remark pipeline.
 * We do this inline to avoid async complexity in remark visitors.
 */
function mdToHtml(md: string): string {
  // Lightweight inline converter — handles bold, italic, inline-code, and paragraphs
  let html = md
    // Escape HTML entities first
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // Fenced code blocks
    .replace(/```[\s\S]*?```/g, (m) => {
      const inner = m.replace(/^```[^\n]*\n/, '').replace(/```$/, '');
      return `<pre><code>${inner.trim()}</code></pre>`;
    })
    // Inline code
    .replace(/`([^`\n]+)`/g, '<code>$1</code>')
    // Bold
    .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
    .replace(/__([^_\n]+)__/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*([^*\n]+)\*/g, '<em>$1</em>')
    .replace(/_([^_\n]+)_/g, '<em>$1</em>')
    // Strikethrough
    .replace(/~~([^~\n]+)~~/g, '<del>$1</del>')
    // Wikilinks [[Note]] → text (stripped; full resolution not needed in preview)
    .replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_m, target, alias) => alias ?? target)
    // Standard links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  // Paragraphs — split on blank lines, wrap non-empty sections
  const paragraphs = html.split(/\n{2,}/);
  return paragraphs
    .map((p) => {
      p = p.trim();
      if (!p) return '';
      // Don't double-wrap pre blocks
      if (p.startsWith('<pre>')) return p;
      // List-like lines
      if (/^[-*+]\s/.test(p) || /^\d+\.\s/.test(p)) {
        const items = p.split('\n').filter(Boolean);
        const listItems = items
          .map((item) => {
            const text = item.replace(/^[-*+]\s+/, '').replace(/^\d+\.\s+/, '');
            return `<li>${text}</li>`;
          })
          .join('');
        return `<ul>${listItems}</ul>`;
      }
      return `<p>${p.replace(/\n/g, ' ')}</p>`;
    })
    .filter(Boolean)
    .join('\n');
}

// ─── Embed regex ──────────────────────────────────────────────────────────────

// Matches:
//   ![[note-name#^blockId]]  → groups[1]=noteName, groups[2]=undefined, groups[3]=^blockId
//   ![[note-name.md#^id]]   → groups[1]=note-name, groups[2]=md, groups[3]=^id
//   ![[note-name]]           → groups[1]=noteName, rest undefined
//
// Image embeds like ![[photo.png]] are matched too but then skipped via isImageEmbed().
const EMBED_REGEX = /!\[\[([^\]#|]+?)(?:\.(md))?(?:#(\^[a-zA-Z0-9-]+))?\]\]/g;

// Image extensions to skip
const IMAGE_EXT_NAMES = new Set(['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'avif', 'pdf']);

function isImageEmbed(raw: string): boolean {
  // raw is the inner content like "photo.png" or "diagram.svg"
  const ext = raw.split('.').pop()?.toLowerCase() ?? '';
  return IMAGE_EXT_NAMES.has(ext);
}

// ─── HTML builders ────────────────────────────────────────────────────────────

function buildBlockTransclusion(
  noteName: string,
  noteSlug: string,
  blockId: string,
  content: string,
): string {
  const innerHtml = mdToHtml(content);
  return [
    `<blockquote class="transclusion">`,
    innerHtml,
    `<cite class="transclusion-cite">`,
    `<a href="${withBasePath(`/notes/${noteSlug}`, basePath)}" data-wikilink="${noteSlug}">From: ${noteName}</a>`,
    `</cite>`,
    `</blockquote>`,
  ].join('\n');
}

function buildFullNoteEmbed(
  noteName: string,
  noteSlug: string,
  content: string,
): string {
  // Trim the content to a reasonable preview (first 1500 chars of raw md)
  const preview = content.length > 1500 ? content.slice(0, 1500) + '\n\n...' : content;
  const innerHtml = mdToHtml(preview);
  return [
    `<details class="transclusion-embed">`,
    `<summary class="transclusion-embed-header">`,
    `<a href="${withBasePath(`/notes/${noteSlug}`, basePath)}" data-wikilink="${noteSlug}">${noteName}</a>`,
    `</summary>`,
    `<div class="transclusion-embed-body">`,
    innerHtml,
    `</div>`,
    `</details>`,
  ].join('\n');
}

function buildMissingBlockWarning(noteName: string, blockId: string): string {
  return [
    `<div class="transclusion-missing">`,
    `⚠ Block not found: <code>${noteName}#${blockId}</code>`,
    `</div>`,
  ].join('\n');
}

function buildMissingNoteWarning(noteName: string): string {
  return [
    `<div class="transclusion-missing">`,
    `⚠ Note not found: <code>${noteName}</code>`,
    `</div>`,
  ].join('\n');
}

// ─── Circular-reference / depth guard ────────────────────────────────────────

/**
 * Track the set of note slugs currently being expanded so we can detect
 * circular embeds (A ⊃ B ⊃ A) and cap expansion at MAX_EMBED_DEPTH.
 * Stored as a module-level stack: remark processes one document at a time
 * synchronously, so a simple counter is safe.
 */
const MAX_EMBED_DEPTH = 3;
let _embedDepth = 0;
const _expandingNotes = new Set<string>();

// ─── Plugin ───────────────────────────────────────────────────────────────────

const remarkTransclusion: Plugin<[], Root> = () => {
  return (tree) => {
    const index = loadBlockIndex();

    visit(tree, 'text', (node: Text, idx, parent) => {
      if (!parent || idx == null) return;

      const text = node.value;
      // Quick pre-check
      if (!text.includes('![[')) return;

      const parts: (PhrasingContent | Html)[] = [];
      let lastIndex = 0;

      EMBED_REGEX.lastIndex = 0;
      let m: RegExpExecArray | null;

      while ((m = EMBED_REGEX.exec(text)) !== null) {
        const [fullMatch, rawName, _mdExt, blockId] = m;

        // Skip image embeds — handled by remark-vault-images
        if (isImageEmbed(rawName)) continue;

        // Text before match
        if (m.index > lastIndex) {
          parts.push({ type: 'text', value: text.slice(lastIndex, m.index) });
        }

        const noteName = rawName.trim();
        const noteSlug = toSlug(noteName);

        if (blockId) {
          // Block embed: ![[note#^blockId]]
          const key = `${noteSlug}/^${blockId.slice(1)}`; // strip leading ^
          const blockContent = index[key];

          if (blockContent) {
            parts.push({
              type: 'html' as const,
              value: buildBlockTransclusion(noteName, noteSlug, blockId, blockContent),
            } as Html);
          } else {
            parts.push({
              type: 'html' as const,
              value: buildMissingBlockWarning(noteName, blockId),
            } as Html);
          }
        } else {
          // Full note embed: ![[note]]
          // Guard against circular embeds and excessive nesting depth
          if (_embedDepth >= MAX_EMBED_DEPTH) {
            parts.push({
              type: 'html' as const,
              value: `<div class="transclusion-missing">⚠ Max embed depth (${MAX_EMBED_DEPTH}) reached — skipping <code>[[${noteName}]]</code></div>`,
            } as Html);
          } else if (_expandingNotes.has(noteSlug)) {
            parts.push({
              type: 'html' as const,
              value: `<div class="transclusion-missing">⚠ Circular embed detected — skipping <code>[[${noteName}]]</code></div>`,
            } as Html);
          } else {
            const noteContent = index[noteSlug];

            if (noteContent) {
              _embedDepth++;
              _expandingNotes.add(noteSlug);
              try {
                parts.push({
                  type: 'html' as const,
                  value: buildFullNoteEmbed(noteName, noteSlug, noteContent),
                } as Html);
              } finally {
                _embedDepth--;
                _expandingNotes.delete(noteSlug);
              }
            } else {
              parts.push({
                type: 'html' as const,
                value: buildMissingNoteWarning(noteName),
              } as Html);
            }
          }
        }

        lastIndex = EMBED_REGEX.lastIndex;
      }

      if (parts.length === 0) return;

      if (lastIndex < text.length) {
        parts.push({ type: 'text', value: text.slice(lastIndex) });
      }

      parent.children.splice(idx, 1, ...(parts as PhrasingContent[]));
    });
  };
};

// Reset cache between builds
export function resetBlockIndexCache(): void {
  blockIndexCache = null;
}

export default remarkTransclusion;
