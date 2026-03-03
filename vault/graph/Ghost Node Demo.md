---
publish: true
title: "Ghost Node Demo"
tags: [graph/features]
graph:
  shape: torus
  color: "#95a5a6"
---

# Ghost Node Demo

A **ghost node** appears when a `[[wikilink]]` points to a note that hasn't been written yet, or has `publish: false`.

These wikilinks point to unpublished or non-existent notes, creating ghost nodes:

- [[Secret Project]] — has `publish: false`
- [[Someday Maybe]] — file does not exist yet
- [[Future Research Topic]] — placeholder
- [[Unwritten Idea]] — pending

Ghost nodes are transparent wireframe spheres. They show the *shape* of your knowledge even before the content is written.

See [[Graph Features Hub]].
