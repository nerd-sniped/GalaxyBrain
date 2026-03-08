---
publish: true
title: "Netlify Deployment"
tags: [meta/setup]
aliases: [netlify, deploy, hosting]
graph:
  shape: cylinder
  color: "#00ad9f"
---

# Netlify Deployment

Installation and deployment steps are maintained in the GitHub README:

- [GalaxyBrain README (Installation Guide)](https://github.com/nerd-sniped/GalaxyBrain#readme)

This note is reference-only for deployment behavior and troubleshooting.

## Build Configuration Reference

GalaxyBrain already includes `netlify.toml`; Netlify reads build settings from it.

Current key settings:

| Setting | Value |
|---|---|
| **Build command** | `pnpm astro clean && node scripts/sync-titles.mjs && pnpm build` |
| **Publish directory** | `dist` |
| **Node version** | `22` |

## 6. How Auto-Deploy Works

Once connected, the full pipeline is:

```
Edit note in Obsidian
       ↓
Obsidian Git commits & pushes (auto, every N minutes)
       ↓
GitHub receives push → notifies Netlify via webhook
       ↓
Netlify runs the build command from `netlify.toml`
       ↓
New static site replaces old one on CDN (~1–2 min)
```

No manual action needed after initial setup.

## 7. Triggering a Manual Rebuild

If you need to force a rebuild without pushing a new commit:

1. Go to **Netlify → Deploys**
2. Click **Trigger deploy → Deploy site**

## Environment Variables

GalaxyBrain doesn't require any environment variables. If you add features that need API keys, set them in **Site configuration → Environment variables** on Netlify — never commit secrets to the repo.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| Build fails with `ENOENT vault` | The `vault/` folder is missing from the repo |
| Graph shows 0 nodes | No notes have `publish: true` |
| Images not showing | Run `pnpm build` locally and check for asset-collector warnings |
| 404 on note pages | Netlify's redirect rule catches these — check `netlify.toml` has `/* → /index.html, 404` |

## Next Steps

After deploying via README, learn how to fill your site with content: [[Writing Notes]] and [[Graph Features]].
