---
publish: true
title: "WebSockets"
tags: [web/api, web]
graph:
  shape: sphere
  color: "#8e44ad"
---

# WebSockets

Full-duplex communication over a single TCP connection.

```javascript
const ws = new WebSocket('wss://example.com/socket');
ws.onmessage = (event) => console.log(event.data);
ws.send(JSON.stringify({ type: 'ping' }));
```

See [[REST API Design]] · [[GraphQL]] · [[Web Technologies Hub]].
