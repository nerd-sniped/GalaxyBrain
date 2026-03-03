---
publish: true
title: "GitHub Setup"
tags: [meta/setup]
aliases: [git, github, version control]
graph:
  shape: cylinder
  color: "#27ae60"
---

# GitHub Setup

This note explains how to host the GalaxyBrain repo on GitHub so that Netlify can auto-deploy your site whenever you push a change.

## 1. Create a GitHub Account

If you don't have one, sign up at [github.com](https://github.com). The free plan is sufficient.

## 2. Fork or Use This Template

**Option A — Use as template (recommended for new sites):**
1. Go to the GalaxyBrain GitHub repo
2. Click **Use this template** → **Create a new repository**
3. Name it and set visibility (public or private both work with Netlify)
4. Clone your new repo locally: `git clone https://github.com/your-username/your-repo.git`

**Option B — Fork (keeps a connection to the upstream template):**
1. Click **Fork** on the GalaxyBrain repo
2. Clone your fork: `git clone https://github.com/your-username/galaxybrain.git`

## 3. Connect Your Local Vault

If you cloned a fresh copy, open the `vault/` folder in Obsidian as described in the Obsidian Setup note.

## 4. Authenticate Git in Obsidian

The **Obsidian Git** plugin needs write access to your remote repo. The easiest path depends on your OS.

### Git Credential Manager — recommended (Windows & macOS)

**Git Credential Manager (GCM)** ships bundled with [Git for Windows](https://git-scm.com/download/win) (and is available via Homebrew on macOS). It handles GitHub authentication through a browser OAuth flow — no tokens to copy or URLs to edit.

1. Make sure you have [Git for Windows](https://git-scm.com/download/win) installed (GCM is included by default — no separate install needed)
2. Clone your repo normally: `git clone https://github.com/your-username/your-repo.git`
3. The first time Obsidian Git tries to push, a browser window opens asking you to sign in to GitHub
4. Authorize the app — credentials are saved in Windows Credential Manager automatically
5. All future pushes are silent; no further prompts

> [!tip] Already installed Git without GCM?
> Run `git credential-manager --version` in a terminal. If it errors, re-install Git for Windows and ensure **Git Credential Manager** is checked in the installer.

### Using SSH (alternative — all platforms)

1. [Generate an SSH key](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/generating-a-new-ssh-key-and-adding-it-to-the-ssh-agent) and add it to your GitHub account
2. Set your remote to the SSH URL: `git remote set-url origin git@github.com:your-username/your-repo.git`

### Using a Personal Access Token (PAT) — fallback

If neither GCM nor SSH is an option (e.g. a restricted environment):

1. Go to **GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens**
2. Create a token with **Repository: Contents (Read and Write)** permission
3. Embed it in the remote URL so Obsidian Git can authenticate:
   ```
   git remote set-url origin https://YOUR_TOKEN@github.com/your-username/your-repo.git
   ```

## 5. Test a Push

Make a small change in Obsidian (edit any note). Wait for the auto-commit interval, or manually trigger it via **Open command palette → Obsidian Git: Commit all changes**. Check GitHub — your commit should appear within a minute.

## 6. What Gets Committed (and What Doesn't)

The `.gitignore` in this repo intentionally excludes:

| Excluded | Why |
|---|---|
| `dist/` | Netlify builds this — no need to commit |
| `public/graph.json` | Built from your notes at deploy time |
| `public/graph/` | Same |
| `.astro/` | Build-time cache |
| `vault/.obsidian/workspace.json` | Per-machine Obsidian state |

Your Markdown notes, frontmatter, and attachments **are** committed and pushed.

## Next: Deploy on Netlify

With the repo on GitHub, the next step is **Netlify Deployment** — connect it to Netlify and get a live URL.
