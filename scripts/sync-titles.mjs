/**
 * sync-titles.mjs
 * Validates and auto-repairs frontmatter in every vault/**\/*.md file (excluding attachments/).
 *
 * Repairs applied (in order):
 *   1. Strip leading blank lines before the opening `---` fence.
 *      gray-matter silently returns empty data when the file starts with
 *      whitespace/newlines, causing notes to be treated as unpublished.
 *   2. Inject a minimal frontmatter block when a file has none at all.
 *      Defaults to publish: false so the note doesn't go live accidentally.
 *   3. Force the `title` field to match the filename (without extension).
 *
 * Run with:  node scripts/sync-titles.mjs
 * Or via:    pnpm sync-titles
 */

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fg from 'fast-glob';
import matter from 'gray-matter';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const vaultRoot = path.join(__dirname, '..', 'vault');

const files = await fg('**/*.md', { cwd: vaultRoot, absolute: true, ignore: ['attachments/**'] });

let updated = 0;

for (const filePath of files) {
  const raw = readFileSync(filePath, 'utf-8');
  const filename = path.basename(filePath, '.md');
  const changes = [];

  // ── 1. Strip leading blank lines before the opening `---` fence ──────────
  let current = raw.replace(/^[\r\n]+/, '');
  if (current !== raw) changes.push('stripped leading blank lines');

  // ── 2. Inject minimal frontmatter when none exists ────────────────────────
  //    Use publish: false so the note doesn't accidentally go live.
  if (!current.startsWith('---')) {
    current = `---\npublish: false\ntitle: "${filename}"\ntags: []\n---\n\n${current}`;
    changes.push('added missing frontmatter block');
    writeFileSync(filePath, current, 'utf-8');
    console.log(`Updated: ${filename}.md  [${changes.join(' | ')}]`);
    updated++;
    continue; // title is already correct; skip further checks
  }

  // ── 3. Parse frontmatter ──────────────────────────────────────────────────
  let parsed;
  try {
    parsed = matter(current);
  } catch {
    console.warn(`Skipping (parse error): ${filePath}`);
    continue;
  }

  // ── 4. Sync title to filename ─────────────────────────────────────────────
  let needsSerialize = false;
  if (parsed.data.title !== filename) {
    changes.push(`title: "${parsed.data.title ?? '(none)'}" → "${filename}"`);
    parsed.data.title = filename;
    needsSerialize = true;
  }

  if (changes.length === 0) continue;

  // Write back: use matter.stringify only when data was modified to avoid
  // unnecessarily reformatting YAML keys in files that only had blank lines stripped.
  const output = needsSerialize
    ? matter.stringify(parsed.content, parsed.data)
    : current;

  writeFileSync(filePath, output, 'utf-8');
  console.log(`Updated: ${filename}.md  [${changes.join(' | ')}]`);
  updated++;
}

console.log(`\nDone — ${updated} file(s) updated out of ${files.length} total.`);
