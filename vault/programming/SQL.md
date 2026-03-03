---
publish: true
title: "SQL"
tags: [programming/sql, programming, databases]
graph:
  shape: cylinder
  color: "#e38c00"
---

# SQL

SQL (Structured Query Language) is the standard for relational databases.

```sql
SELECT
  title,
  tags,
  publish
FROM notes
WHERE publish = true
ORDER BY title;
```

See [[Data Structures Overview]] · [[Programming Hub]].
