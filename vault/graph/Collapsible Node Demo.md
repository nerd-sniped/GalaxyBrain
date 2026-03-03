---
publish: true
title: "Collapsible Node Demo"
tags: [graph/features]
graph:
  shape: dodecahedron
  color: "#8e44ad"
  collapsible: true
---

# Collapsible Node Demo

A **collapsible** node starts with all its downstream wikilink targets hidden behind a `+` badge. Click the badge to expand; Shift+click to re-collapse.

```yaml
graph:
  collapsible: true
```

This node is itself collapsible. Its children are:

- [[Child Note Alpha]]
- [[Child Note Beta]]
- [[Child Note Gamma]]
- [[Child Note Delta]]
- [[Child Note Epsilon]]

See [[Graph Features Hub]].
