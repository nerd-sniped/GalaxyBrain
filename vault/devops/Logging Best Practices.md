---
publish: true
title: "Logging Best Practices"
tags: [devops/logging, devops]
graph:
  shape: sphere
  color: "#7f8c8d"
---

# Logging Best Practices

- Structured logs (JSON): easier to query
- Include: timestamp, level, service, trace ID, message
- Levels: DEBUG, INFO, WARN, ERROR, FATAL
- Ship logs to a central aggregator (ELK, Datadog)

See [[Monitoring Overview]] · [[Observability]] · [[DevOps Hub]].
