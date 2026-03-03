---
publish: true
title: "Docker Overview"
tags: [devops/containers, devops]
graph:
  shape: box
  color: "#2496ed"
---

# Docker Overview

Docker packages applications into portable containers.

```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package*.json .
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["node", "server.js"]
```

See [[Kubernetes Overview]] · [[GitHub Actions]] · [[DevOps Hub]].
