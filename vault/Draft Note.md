---
publish: false
title: Draft Note
tags:
  - meta/draft
---

# Draft Note

This note has `publish: false` — it is completely invisible to the site.

It won't appear as a node in the graph, its links won't create edges, and there will be no page built for it. Even if another published note links to it with a `[[wikilink]]`, that will create a **ghost node** (transparent wireframe) rather than a real node.

Use notes like this for:
- Work in progress that isn't ready to publish
- Personal notes you want to keep in the vault but not expose publicly
- Scratch space and captures that are still being processed

When you're ready to publish a draft, just change `publish: false` to `publish: true` and push — it will appear on the next build.


