---
publish: true
title: "Graph Theory"
tags: [math, programming]
graph:
  shape: octahedron
  color: "#1abc9c"
---

# Graph Theory

Graph theory is the study of graphs — mathematical structures used to model pairwise relations between objects.

## Fundamentals

A **graph** G = (V, E) consists of:
- **Vertices** (nodes) V — the entities
- **Edges** E — the relationships between entities ^graph-definition

This garden is itself a graph: notes are vertices, wikilinks are directed edges.

## Types of Graphs

| Type | Description |
|---|---|
| Undirected | Edges have no direction |
| Directed (digraph) | Edges have direction (like wikilinks) |
| Weighted | Edges have a numeric weight |
| Bipartite | Vertices split into two groups |

## Key Algorithms

- **BFS / DFS** — graph traversal (used in link resolution)
- **Dijkstra's algorithm** — shortest paths (see [[Dijkstra]] — not yet written) ^dijkstra-ref
- **PageRank** — node importance by link structure
- [[Minimum Spanning Tree]] — another ghost node example

## Connection to This Project

The graph visualisation on the landing page is a **force-directed graph** — each edge acts like a spring, and nodes repel each other until the system reaches equilibrium.

See [[Programming]] for software context.

#math topics like graph theory increasingly overlap with #programming in the era of large-scale networked systems.
