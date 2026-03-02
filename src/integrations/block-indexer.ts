/**
 * block-indexer.ts
 * Astro integration that runs at astro:build:start, AFTER graph-builder.
 *
 * 1. Reads all published .md files from vault/.
 * 2. For each file, finds all block ID definitions (lines ending with ^blockId).
 * 3. Extracts the block that the ID is attached to:
 *    - ^id on a paragraph line → entire paragraph is the block
 *    - ^id on a list item → that list item (and indented children) is the block
 *    - ^id on an otherwise-empty line → the preceding block is captured
 * 4. Builds an index:
 *    { "note-slug/^blockId": "block content as markdown string",
 *      "note-slug": "full note body (no frontmatter)" }
 * 5. Writes .astro/block-index.json
 */

import type { AstroIntegration } from 'astro';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import fg from 'fast-glob';
import matter from 'gray-matter';
import { slugify } from '../lib/vault-parser.js';

// ─── Block extraction ─────────────────────────────────────────────────────────

const BLOCK_ID_RE = /(\s*)\^([a-zA-Z0-9-]+)\s*$/;

type LineType = 'empty' | 'list' | 'heading' | 'paragraph';

function classifyLine(line: string): LineType {
  const trimmed = line.trimStart();
  if (!trimmed) return 'empty';
  if (/^[-*+]\s/.test(trimmed) || /^\d+\.\s/.test(trimmed)) return 'list';
  if (/^#{1,6}\s/.test(trimmed)) return 'heading';
  return 'paragraph';
}

/**
 * Extract the content block that ^blockId is attached to.
 * Returns the raw markdown string for that block, with the ^id annotation removed.
 */
function extractBlock(lines: string[], anchorLineIndex: number): string {
  const anchorLine = lines[anchorLineIndex];
  // Remove the block ID annotation from the anchor line
  const cleanAnchor = anchorLine.replace(BLOCK_ID_RE, '').trimEnd();
  const anchorType = classifyLine(cleanAnchor);

  // Case 1: ^id is on its own (empty after removing id) → use preceding block
  if (!cleanAnchor.trim()) {
    // Walk backwards to find the preceding non-empty block
    let j = anchorLineIndex - 1;
    while (j >= 0 && classifyLine(lines[j]) === 'empty') j--;
    if (j < 0) return '';

    return extractBlockBackward(lines, j);
  }

  // Case 2: list item
  if (anchorType === 'list') {
    // Collect the list item plus any indented children
    const baseIndent = anchorLine.length - anchorLine.trimStart().length;
    const collected: string[] = [cleanAnchor];
    let k = anchorLineIndex + 1;
    while (k < lines.length) {
      const next = lines[k];
      if (classifyLine(next) === 'empty') break;
      const nextIndent = next.length - next.trimStart().length;
      if (nextIndent <= baseIndent && classifyLine(next) !== 'empty') break;
      collected.push(next);
      k++;
    }
    return collected.join('\n').trim();
  }

  // Case 3: paragraph / heading — collect back to previous blank line
  let start = anchorLineIndex;
  while (start > 0 && classifyLine(lines[start - 1]) !== 'empty') {
    start--;
  }
  const paragraphLines = lines.slice(start, anchorLineIndex + 1).map((l, idx) => {
    // Only remove block ID from the actual anchor line (last in the slice)
    if (idx === anchorLineIndex - start) {
      return l.replace(BLOCK_ID_RE, '').trimEnd();
    }
    return l;
  });
  return paragraphLines.join('\n').trim();
}

/**
 * Collect a paragraph backward from line index j.
 * Walks back to the previous blank line (or heading), returns the whole block.
 */
function extractBlockBackward(lines: string[], endIndex: number): string {
  let start = endIndex;
  while (start > 0 && classifyLine(lines[start - 1]) !== 'empty') {
    start--;
  }
  return lines
    .slice(start, endIndex + 1)
    .join('\n')
    .trim();
}

/**
 * Build a block index for a single note's body.
 * Returns `Map<blockId, contentString>`.
 */
function buildNoteBlockIndex(content: string): Map<string, string> {
  const index = new Map<string, string>();
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const m = BLOCK_ID_RE.exec(lines[i]);
    if (!m) continue;
    const blockId = m[2];
    const block = extractBlock(lines, i);
    index.set(blockId, block);
  }

  return index;
}

// ─── Integration ──────────────────────────────────────────────────────────────

export function blockIndexer(): AstroIntegration {
  return {
    name: 'block-indexer',
    hooks: {
      'astro:build:start': async ({ logger }) => {
        await buildIndex(process.cwd(), {
          info: logger.info.bind(logger),
          warn: logger.warn.bind(logger),
        });
      },
      'astro:server:setup': async () => {
        await buildIndex(process.cwd());
      },
    },
  };
}

async function buildIndex(
  projectRoot: string,
  log: { info: (s: string) => void; warn: (s: string) => void } = {
    info: (s) => console.log(`[block-indexer] ${s}`),
    warn: (s) => console.warn(`[block-indexer] ${s}`),
  },
): Promise<void> {
  const vaultRoot = path.join(projectRoot, 'vault');
  const astroDir = path.join(projectRoot, '.astro');
  const indexFile = path.join(astroDir, 'block-index.json');

  // ── 1. Glob markdown files ─────────────────────────────────────────────────
  const mdFiles = await fg('**/*.md', {
    cwd: vaultRoot,
    absolute: true,
    onlyFiles: true,
    ignore: ['attachments/**'],
  });

  const blockIndex: Record<string, string> = {};
  let blockCount = 0;

  // ── 2. Parse each published note ──────────────────────────────────────────
  for (const filePath of mdFiles) {
    const raw = readFileSync(filePath, 'utf-8');
    const { data: fm, content } = matter(raw);

    if (fm.publish !== true) continue;

    const filename = path.basename(filePath);
    const slug = slugify(filename);

    // Store full note content for full-note embeds
    blockIndex[slug] = content.trim();

    // Store individual blocks
    const noteBlocks = buildNoteBlockIndex(content);
    for (const [blockId, blockContent] of noteBlocks) {
      const key = `${slug}/^${blockId}`;
      blockIndex[key] = blockContent;
      blockCount++;
    }
  }

  // ── 3. Write index ─────────────────────────────────────────────────────────
  mkdirSync(astroDir, { recursive: true });
  writeFileSync(indexFile, JSON.stringify(blockIndex, null, 2), 'utf-8');
  log.info(
    `Wrote block-index.json — ${Object.keys(blockIndex).length} notes, ${blockCount} block IDs`,
  );
}
