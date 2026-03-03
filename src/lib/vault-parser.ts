/**
 * vault-parser.ts
 * Extracts structured data from Obsidian-flavoured Markdown strings.
 * Pure functions — no file I/O; callers supply the raw string and file path.
 */

import matter from 'gray-matter';
import path from 'node:path';
import type { NoteFrontmatter, ParsedNote } from './types';

// ─── Slugify ─────────────────────────────────────────────────────────────────

/**
 * Convert a display name or filename (with or without .md) to a URL slug.
 * e.g. "Getting Started" → "getting-started"
 *      "Programming/Systems" → "programming-systems"
 */
export function slugify(name: string): string {
  return name
    .replace(/\.md$/i, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// ─── Body pre-processing ─────────────────────────────────────────────────────

/** Strip fenced code blocks and inline code so regexes don't hit code content. */
function stripCode(src: string): string {
  return src
    .replace(/```[\s\S]*?```/g, ' ')   // fenced blocks
    .replace(/`[^`\n]*`/g, ' ');       // inline code
}

// ─── Extraction helpers ───────────────────────────────────────────────────────

/**
 * Extract [[wikilink]] targets from a markdown body.
 * Captures the target filename, ignoring heading anchors (#) and aliases (|).
 * Returns deduplicated list.
 */
export function extractWikilinks(body: string): string[] {
  const clean = stripCode(body);
  // [[Target#heading|alias]] → capture "Target"
  const regex = /\[\[([^\]|#\n]+?)(?:#[^\]|]*)?(?:\|[^\]]+)?\]\]/g;
  const targets = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = regex.exec(clean)) !== null) {
    const t = m[1].trim();
    if (t) targets.add(t);
  }
  return [...targets];
}

/**
 * Extract inline #tags from a markdown body (not inside code, not frontmatter).
 * Tag must start on a word boundary (whitespace or start of line).
 * Returns deduplicated list (without leading #).
 */
export function extractTags(body: string): string[] {
  const clean = stripCode(body);
  // Lookahead: # not preceded by a non-whitespace char (prevents #123 hex etc.)
  const regex = /(?:^|[ \t])#([a-zA-Z][\w/-]*)/gm;
  const tags = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = regex.exec(clean)) !== null) {
    tags.add(m[1]);
  }
  return [...tags];
}

/**
 * Extract ^block-id markers from markdown content.
 * Block IDs are ^ followed by alphanumeric/hyphen chars at end of a line.
 */
export function extractBlockIds(body: string): string[] {
  const regex = /\^([a-zA-Z0-9-]+)\s*$/gm;
  const ids: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = regex.exec(body)) !== null) {
    ids.push(m[1]);
  }
  return ids;
}

/**
 * Generate a plain-text excerpt from markdown body (max 120 chars).
 * Strips markdown syntax before truncating.
 */
export function makeExcerpt(body: string): string {
  const text = body
    .replace(/```[\s\S]*?```/g, '')        // fenced blocks
    .replace(/`[^`\n]*`/g, '')             // inline code
    .replace(/!\[\[[^\]]*\]\]/g, '')       // transclusions
    .replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, '$2$1') // wikilinks → label
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // links → label
    .replace(/^#+\s/gm, '')               // headings
    .replace(/[*_~`>|]/g, '')             // emphasis / tables
    .replace(/\s+/g, ' ')
    .trim();
  return text.slice(0, 120);
}

// ─── Main parser ──────────────────────────────────────────────────────────────

/**
 * Parse a single .md file's raw string into a structured ParsedNote.
 *
 * @param rawContent  Full file contents (including frontmatter block).
 * @param absolutePath  Absolute path on disk; used for id/relativePath.
 * @param vaultRoot  Absolute path to `vault/`; used to compute relative path.
 */
export function parseNote(
  rawContent: string,
  absolutePath: string,
  vaultRoot: string,
): ParsedNote {
  // ── Strip leading blank lines ──────────────────────────────────────────────
  // gray-matter silently returns empty data ({}) when a file starts with
  // whitespace / newlines before the opening `---` fence.  This is a common
  // artefact of the Obsidian → git workflow and causes notes to be treated as
  // unpublished even when they have `publish: true` in their frontmatter.
  const sanitised = rawContent.replace(/^[\r\n]+/, '');

  // Gracefully handle malformed / missing frontmatter: gray-matter may throw on
  // certain malformed YAML strings. Falling back to an empty frontmatter object
  // means the note will be treated as publish: false (filtered out by graph-builder).
  let parsed: ReturnType<typeof matter>;
  try {
    parsed = matter(sanitised);
  } catch {
    console.warn(`[vault-parser] Failed to parse frontmatter in ${absolutePath} — treating as unpublished`);
    parsed = matter('');
    parsed.content = sanitised;
  }
  // An empty frontmatter data object means publish is undefined → treated as false.
  const fm = (parsed.data ?? {}) as NoteFrontmatter;

  // Compute relative path from vault/ root
  const relativePath = path
    .relative(vaultRoot, absolutePath)
    .replace(/\\/g, '/');

  // Derive slug from filename (without .md)
  const filename = path.basename(absolutePath);
  const id = slugify(filename);

  // The Obsidian filename (without .md) is the canonical note title.
  // It always overrides whatever is in the frontmatter `title` field so that
  // renaming a note in Obsidian is consistently reflected in the graph and on
  // the rendered page — Obsidian already enforces unique filenames, so this is safe.
  fm.title = path.basename(absolutePath, '.md');

  const body = parsed.content;

  // Merge frontmatter tags with inline tags (deduplicated)
  const fmTags: string[] = Array.isArray(fm.tags)
    ? fm.tags.map(String)
    : fm.tags
    ? [String(fm.tags)]
    : [];
  const inlineTags = extractTags(body);
  const tags = [...new Set([...fmTags, ...inlineTags])];

  const aliases: string[] = Array.isArray(fm.aliases)
    ? fm.aliases.map(String)
    : fm.aliases
    ? [String(fm.aliases)]
    : [];

  return {
    id,
    filePath: absolutePath.replace(/\\/g, '/'),
    relativePath,
    frontmatter: fm,
    content: body,
    wikilinks: extractWikilinks(body),
    tags,
    aliases,
    blockIds: extractBlockIds(body),
    excerpt: makeExcerpt(body),
  };
}
