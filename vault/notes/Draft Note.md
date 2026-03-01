---
publish: false
title: "Draft Note (Unpublished)"
tags: [meta, draft]
---

# Draft Note

This note has `publish: false` and should **not** appear in the graph or on the site.

It is used to verify that the graph-builder correctly filters unpublished notes.

## Links in Drafts

Even though this note links to [[Welcome]] and [[Astro]], those links should NOT create edges in graph.json because this note is excluded.

Tags #meta and #draft should not appear as tag nodes either (unless other published notes share them).
