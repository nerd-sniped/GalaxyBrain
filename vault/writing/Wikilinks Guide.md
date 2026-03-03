---
publish: true
title: "Wikilinks Guide"
tags: [writing/features]
aliases: ["wikilinks", "links"]
graph:
  shape: sphere
  color: "#3498db"
---

# Wikilinks Guide

`[[wikilinks]]` are the primary navigation mechanism. They become **edges** in the graph.

## Basic Link

```markdown
See [[Another Note]].
```

## Aliased Link

```markdown
See [[Another Note|this note]] for details.
```

The display text changes, but the target stays `Another Note`.

## Cross-cluster links

This note links to: [[Block IDs Guide]] · [[Transclusion Guide]] · [[Aliases Guide]] · [[Writing Hub]] · [[Index]].

## Ghost Links

Linking to [[Unwritten Note Wikilinks Example]] creates a ghost node. ^wikilinks-ghost
