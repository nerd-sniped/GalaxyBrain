/**
 * link-resolver.ts
 * Obsidian-style shortest-path wikilink resolution.
 *
 * Obsidian resolves [[target]] by:
 *  1. Exact match on filename (without .md extension) — case-insensitive.
 *  2. If target contains a path separator, match by path suffix.
 *  3. Alias match (frontmatter `aliases` list).
 *  4. No match → ghost node (caller handles this).
 */

import type { ParsedNote } from './types';
import { slugify } from './vault-parser';

// ─── Index types ─────────────────────────────────────────────────────────────

/** Pre-built lookup maps for fast resolution. Build once, query many times. */
export interface ResolverIndex {
  /** slug → ParsedNote (primary key) */
  bySlug: Map<string, ParsedNote>;
  /** lowercase filename (no .md) → ParsedNote */
  byName: Map<string, ParsedNote>;
  /** lowercase alias slug → ParsedNote */
  byAlias: Map<string, ParsedNote>;
}

// ─── Index builder ───────────────────────────────────────────────────────────

/**
 * Build a ResolverIndex from an array of ParsedNotes.
 * Call once after parsing all files; reuse for all link resolutions.
 */
export function buildResolverIndex(notes: ParsedNote[]): ResolverIndex {
  const bySlug = new Map<string, ParsedNote>();
  const byName = new Map<string, ParsedNote>();
  const byAlias = new Map<string, ParsedNote>();

  for (const note of notes) {
    bySlug.set(note.id, note);

    // Filename without extension, lowercased
    const nameLower = note.relativePath
      .replace(/\.md$/i, '')
      .split('/')
      .pop()!
      .toLowerCase();
    byName.set(nameLower, note);

    for (const alias of note.aliases) {
      byAlias.set(alias.toLowerCase(), note);
      byAlias.set(slugify(alias), note);
    }
  }

  return { bySlug, byName, byAlias };
}

// ─── Resolver ────────────────────────────────────────────────────────────────

/**
 * Resolve a raw wikilink target string to a ParsedNote, or null (ghost).
 *
 * @param target   Raw link target as it appears inside [[ ]], e.g. "Getting Started"
 *                 or "subfolder/My Note".
 * @param index    Pre-built ResolverIndex.
 * @param _publishedOnly  When true (default), only resolve to published notes.
 */
export function resolveWikilink(
  target: string,
  index: ResolverIndex,
  publishedOnly = true,
): ParsedNote | null {
  const trimmed = target.trim();

  // Strip any heading anchor from target (e.g. "Note#heading")
  const withoutAnchor = trimmed.split('#')[0].trim();

  // Get the leaf name (in case target includes a path prefix)
  const parts = withoutAnchor.replace(/\\/g, '/').split('/');
  const leafName = parts[parts.length - 1];
  const leafSlug = slugify(leafName);
  const leafLower = leafName.toLowerCase();

  const candidates: Array<ParsedNote | undefined> = [
    // 1. Exact slug match on leaf
    index.bySlug.get(leafSlug),
    // 2. Case-insensitive filename match
    index.byName.get(leafLower),
    // 3. Alias match (slug form)
    index.byAlias.get(leafSlug),
    // 4. Alias match (lower form)
    index.byAlias.get(leafLower),
  ];

  // If target includes a path separator, also try full slug resolution
  if (parts.length > 1) {
    const fullSlug = slugify(withoutAnchor);
    candidates.push(index.bySlug.get(fullSlug));
  }

  for (const candidate of candidates) {
    if (!candidate) continue;
    if (publishedOnly && candidate.frontmatter.publish !== true) continue;
    return candidate;
  }

  return null;
}
