---
publish: true
title: "Frontmatter Reference"
tags: [meta/authoring, meta/reference]
aliases: [frontmatter, yaml, fields]
graph:
  shape: box
  color: "#7f8c8d"
  pinned: true
---

# Frontmatter Reference

Every note in `vault/` can include a YAML frontmatter block between `---` delimiters at the very top of the file. All fields are optional except `publish`.

## Full Example

```yaml
---
publish: true
title: "My Note"
tags:
  - programming/rust
  - tech
aliases:
  - my note
  - rust note
graph:
  shape: dodecahedron
  color: "#F74C00"
  collapsible: false
  callout: false
  calloutText: "Start Here!"
---
```

## Field Reference

### `publish`

```yaml
publish: true
```

**Required to appear on the site.** Without this field (or with `publish: false`), the note is completely invisible — no graph node, no page, no edges, no tag nodes from this note's tags.

Default: `false`

---

### `title`

```yaml
title: "My Note"
```

Display name shown in the graph node label, the page `<title>`, and the note page heading. If omitted, the filename (without `.md`) is used.

---

### `tags`

```yaml
tags:
  - programming/rust
  - tech
```

Or inline: `tags: [programming/rust, tech]`

Tags become octahedron nodes in the graph. Use `/` for hierarchy: `#programming/rust` and `#programming/js` are both under the `#programming` family and share a colour.

Inline `#tags` in the note body are also detected.

---

### `aliases`

```yaml
aliases:
  - alternate name
  - short name
```

Alternative names for this note. If another note has `[[alternate name]]`, it resolves to this note. Useful for notes with long titles.

---

### `graph.shape`

```yaml
graph:
  shape: sphere
```

The shape of this note's node in the 3D graph. See the **Graph Features** note for the full list of valid values and a usage guide.

Default: `sphere`

---

### `graph.color`

```yaml
graph:
  color: "#e74c3c"
```

Hex colour for the node. Any valid CSS hex string.

Default: `#3498db`

---

### `graph.collapsible`

```yaml
graph:
  collapsible: true
```

When `true`, the node starts with all its downstream wikilink targets hidden. A `+` badge is shown on the node. Clicking expands the subtree; Shift+clicking an expanded node re-collapses it.

Default: `false`

---

### `graph.callout` and `graph.calloutText`

```yaml
graph:
  callout: true
  calloutText: "Start Here!"
```

When `callout: true`, an animated arrow and floating label appear on the landing page pointing to this node, inviting first-time visitors to click it as their entry point into the graph.

- `calloutText` sets the text shown in the bubble. Defaults to `"Click to get started"` if omitted.
- Only one note should have `callout: true` at a time.
- The callout auto-dismisses when the user clicks the node or the bubble, or after 30 seconds.
- Once dismissed it does not reappear for the rest of that browser session (`sessionStorage`).
- The pulsing rings and arrow colour match the node's `graph.color`.

Default: `false`

---

## Notes on Frontmatter Parsing

- YAML must be valid. An invalid frontmatter block (unclosed quotes, bad indentation) will cause the note to be treated as `publish: false` — a warning is logged but the build continues.
- The `---` delimiters must be the **very first characters** in the file with no blank line or BOM before them.
- Gray-matter is the YAML parser used internally.
