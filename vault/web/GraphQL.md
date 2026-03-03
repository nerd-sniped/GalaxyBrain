---
publish: true
title: "GraphQL"
tags: [web/graphql, web/api]
graph:
  shape: torus
  color: "#e535ab"
---

# GraphQL

GraphQL is a query language for APIs.

```graphql
query GetNote($id: ID!) {
  note(id: $id) {
    title
    tags
    publish
  }
}
```

See [[REST API Design]] · [[TypeScript]] · [[Web Technologies Hub]].
