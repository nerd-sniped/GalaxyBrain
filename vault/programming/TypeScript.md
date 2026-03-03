---
publish: true
title: "TypeScript"
tags: [programming/typescript, programming, web]
graph:
  shape: box
  color: "#3178c6"
---

# TypeScript

TypeScript adds static types to JavaScript.

```typescript
interface User {
  id: number;
  name: string;
  email?: string;
}

function getUser(id: number): User {
  return { id, name: "Alice" };
}
```

See [[JavaScript]] · [[React]] · [[Astro Framework]] · [[Programming Hub]].
