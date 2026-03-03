---
publish: true
title: "Hierarchical Tags Demo"
tags: [graph/tags, graph/features, demo/tags]
graph:
  shape: sphere
  color: "#27ae60"
---

# Hierarchical Tags Demo

Tags with `/` create hierarchical families. All notes sharing a tag prefix share a colour family in the graph.

```yaml
tags:
  - programming/rust
  - programming/js
  - programming/python
```

Both `#programming/rust` and `#programming/js` are grouped under `#programming`.

This note uses:
- `graph/tags` — graph demos cluster
- `graph/features` — features cluster
- `demo/tags` — demo cluster

See [[Tag Node Demo]] · [[Frontmatter Guide]] · [[Graph Features Hub]].
