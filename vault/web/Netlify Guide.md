---
publish: true
title: "Netlify Deployment"
tags: [web/deployment, web]
graph:
  shape: cone
  color: "#00c7b7"
---

# Netlify Deployment

Connect your GitHub repo to Netlify for automatic deploys on every push.

1. Go to netlify.com and create an account
2. Click **Add new site → Import from GitHub**
3. Select your repo
4. Build command: `npm run build` (already in `netlify.toml`)
5. Publish directory: `dist`

This site is deployed on Netlify. See [[GitHub Setup]] · [[Web Technologies Hub]].
