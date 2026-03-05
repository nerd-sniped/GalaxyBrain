/**
 * remark-wikilinks
 *
 * Converts Obsidian-style [[wikilinks]] into standard HTML anchor tags.
 * Supports:
 *   [[Note Name]]             → <a href="/notes/note-name" data-wikilink="note-name">Note Name</a>
 *   [[Note Name|Display text]] → <a href="/notes/note-name" data-wikilink="note-name">Display text</a>
 *   [[Note Name#Heading]]     → links to /notes/note-name, display as "Note Name"
 *
 * Ghost detection (links to unpublished notes) is handled client-side
 * via the NoteLayout script that cross-references graph.json.
 */

import { visit } from 'unist-util-visit';
import type { Plugin } from 'unified';
import type { Root, Text, PhrasingContent, Link } from 'mdast';
import { detectGitHubPagesBase, withBasePath } from './hosting';

const basePath = detectGitHubPagesBase();

/** Convert a note name like "My Note" → "my-note" */
function toSlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

const WIKILINK_RE = /\[\[([^\]]+)\]\]/g;

const remarkWikilinks: Plugin<[], Root> = () => {
  return (tree) => {
    visit(tree, 'text', (node: Text, index, parent) => {
      if (!parent || index == null) return;

      const parts: PhrasingContent[] = [];
      let lastIndex = 0;
      let match: RegExpExecArray | null;

      WIKILINK_RE.lastIndex = 0;
      while ((match = WIKILINK_RE.exec(node.value)) !== null) {
        // Text before the match
        if (match.index > lastIndex) {
          parts.push({ type: 'text', value: node.value.slice(lastIndex, match.index) });
        }

        const inner = match[1];
        // Split on pipe for optional display text: [[path|display]]
        const pipeIdx = inner.indexOf('|');
        const pathPart = pipeIdx === -1 ? inner : inner.slice(0, pipeIdx);
        const displayText = pipeIdx === -1 ? inner : inner.slice(pipeIdx + 1);

        // Strip heading fragments (#...) from the path portion for slug
        const slugSource = pathPart.split('#')[0].trim();
        const slug = toSlug(slugSource);
        // Preserve heading fragment in href so anchor links work
        const fragment = pathPart.includes('#') ? '#' + pathPart.split('#')[1].trim().toLowerCase().replace(/\s+/g, '-') : '';

        const link: Link = {
          type: 'link',
          url: withBasePath(`/notes/${slug}${fragment}`, basePath),
          title: null,
          data: {
            hProperties: {
              'data-wikilink': slug,
            },
          },
          children: [{ type: 'text', value: displayText }],
        };

        parts.push(link);
        lastIndex = WIKILINK_RE.lastIndex;
      }

      if (parts.length === 0) return; // no wikilinks in this text node

      if (lastIndex < node.value.length) {
        parts.push({ type: 'text', value: node.value.slice(lastIndex) });
      }

      // Replace the single text node with our array of nodes
      parent.children.splice(index, 1, ...parts);
    });
  };
};

export default remarkWikilinks;
