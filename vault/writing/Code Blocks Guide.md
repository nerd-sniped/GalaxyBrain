---
publish: true
title: "Code Blocks Guide"
tags: [writing/features]
aliases: ["code blocks", "syntax highlighting"]
graph:
  shape: box
  color: "#2c3e50"
---

# Code Blocks Guide

Fenced code blocks with syntax highlighting via **Shiki**.

```typescript
interface Note {
  title: string;
  tags: string[];
  publish: boolean;
}

function publishNote(note: Note): void {
  if (note.publish) {
    console.log(`Publishing: ${note.title}`);
  }
}
```

```python
def fibonacci(n: int) -> int:
    if n <= 1:
        return n
    return fibonacci(n - 1) + fibonacci(n - 2)
```

```bash
pnpm install
pnpm run build
pnpm run dev
```

Themes: `github-dark` in dark mode, `github-light` in light mode. Bound to `html.dark` / `html.light`.

See [[Writing Hub]] · [[TypeScript]] · [[Python]].
