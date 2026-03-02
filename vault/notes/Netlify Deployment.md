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

Netlify hosts the built site and automatically rebuilds it every time you push to GitHub. Setup takes about five minutes.

## 1. Create a Netlify Account

Sign up at [app.netlify.com](https://app.netlify.com). The free Starter plan supports unlimited personal sites with 100 GB bandwidth/month — more than enough for a personal knowledge graph.

## 2. Import Your GitHub Repo

1. Click **Add new site → Import an existing project**
2. Choose **Deploy with GitHub** and authorise Netlify to access your repos
3. Select your GalaxyBrain fork/template repo from the list

## 3. Configure Build Settings

GalaxyBrain already includes a `netlify.toml` with the correct settings. Netlify will detect it automatically. Verify the settings match:

| Setting | Value |
|---|---|
| **Build command** | `npm run build` |
| **Publish directory** | `dist` |
| **Node version** | `22` (set via `netlify.toml`) |

Click **Deploy site**.

## 4. Wait for the First Build

The first build takes 1–3 minutes. Netlify will show a build log. A successful build ends with something like:

```
[build] 17 page(s) built in Xs
[build] Complete!
```

## 5. Set a Custom Domain (Optional)

By default Netlify gives you a URL like `random-name-123.netlify.app`. To use a custom domain:

1. Go to **Site configuration → Domain management**
2. Click **Add a domain**
3. Enter your domain and follow the DNS configuration steps

If you don't own a domain, the generated `.netlify.app` URL works fine and can be shared.

## 6. How Auto-Deploy Works

Once connected, the full pipeline is:

```
Edit note in Obsidian
       ↓
Obsidian Git commits & pushes (auto, every N minutes)
       ↓
GitHub receives push → notifies Netlify via webhook
       ↓
Netlify runs `npm run build`
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
| Build fails with `ENOENT vault/notes` | The `vault/notes/` folder is missing from the repo |
| Graph shows 0 nodes | No notes have `publish: true` |
| Images not showing | Run `pnpm build` locally and check for asset-collector warnings |
| 404 on note pages | Netlify's redirect rule catches these — check `netlify.toml` has `/* → /index.html, 404` |

## Next Steps

Your site is live. Now learn how to fill it with content: [[Writing Notes]] and [[Graph Features]].
