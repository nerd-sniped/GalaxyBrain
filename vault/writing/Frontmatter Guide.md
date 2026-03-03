---
publish: true
title: "Frontmatter Guide"
tags: [writing/features, writing/reference]
aliases: ["frontmatter", "yaml frontmatter"]
graph:
  shape: cylinder
  color: "#7f8c8d"
---

# Frontmatter Guide

All YAML fields supported in note frontmatter:

| Field | Type | Default | Description |
|---|---|---|---|
| `publish` | boolean | false | Whether the note appears on the site |
| `title` | string | filename | Display name |
| `tags` | string[] | [] | Graph tag nodes |
| `aliases` | string[] | [] | Alternate link names |
| `graph.shape` | string | sphere | Node shape |
| `graph.color` | string | — | Node colour (CSS hex) |
| `graph.collapsible` | boolean | false | Start collapsed in graph |
| `graph.callout` | boolean | false | Show badge label |
| `graph.calloutText` | string | — | Badge label text |

See [[Graph Features Hub]] · [[Writing Hub]].

## Full Example

```yaml
---
publish: true
title: "My Note"
tags: [programming/rust, tech]
aliases: [rust note]
graph:
  shape: torusknot
  color: "#F74C00"
  collapsible: false
  callout: true
  calloutText: "Hot!"
---
```
