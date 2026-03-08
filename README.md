# GalaxyBrain
[![CI](https://github.com/nerd-sniped/GalaxyBrain/actions/workflows/ci.yml/badge.svg)](https://github.com/nerd-sniped/GalaxyBrain/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Built with Astro](https://img.shields.io/badge/built%20with-Astro-ff5d01)](https://astro.build)
[![Support on Patreon](https://img.shields.io/badge/Patreon-Support%20Me-FF424D?logo=patreon&logoColor=white)](https://www.patreon.com/cw/Nerd_Sniped)

<p align="center">
  <img src="public/GalaxyGIF.dark.gif" alt="GalaxyBrain Interactive 3D Knowledge Graph" width="80%">
</p>

<p align="center">
📖 <strong><a href="https://nerd-sniped.com/projects/galaxybrain/">Project article</a></strong> — the how and why behind GalaxyBrain
</p>
<p align="center">
🎥 <strong><a href="https://www.youtube.com/watch?v=dkJ-N9qwhZ8">Install Video</a></strong>How to make your own
</p>
A **starter template** for publishing your Obsidian vault as an interactive 3D knowledge graph website.

Edit notes in Obsidian → push to GitHub → site rebuilds on **Netlify or GitHub Pages** automatically.

**[Check out the Live demo →](https://galaxybrain.netlify.app)**

I'm releasing this for free because fun side projects are better when they aren't hidden behind a paywall — not everything needs to feed the soul-crushing capitalism machine. That said, I still have to pay rent. If you've found this helpful or end up using it yourself, please consider [supporting me on Patreon](https://www.patreon.com/cw/Nerd_Sniped). ❤️

## Overview
Galaxy Brain consists of 3 main components:
1. This codebase which creates a 3D graph based on notes in a `/vault` folder.
2. Obsidian, a closed source (but free to use) note keeping app which we will use as a GUI
3. Netlify (Or Github Pages), this is the service that hosts this codebase (for free) making it accessible on the internet. 

While the intent is to use Obsidian as the User Interface, it's also entirely possible to use **any** Markdown editor. Additionally, there are some steps that require a Github account to connect Obsidian to a git repository. It should be trivial to use a different hosting service if you so desire. 

I've done my best to keep the whole thing as flexible as I can manage, while also making it beginner friendly!  

## Step 1 — Get the Template

1. Click **Use this template** → **Create a new repository** on the GitHub page for this repo
2. Name your repo, set visibility (public or private — both work with Netlify)
3. Clone it locally:
If you're using the CLI 
   ```bash
   git clone https://github.com/your-username/your-repo.git
   cd your-repo
   ```

---

## Step 2 — Install Dependencies

```bash
pnpm install
```

---

## Step 3 — Set Up Obsidian

### 3a. Open the vault

1. Open Obsidian
2. Click **Open folder as vault**
3. Select the **`vault/`** subfolder inside your cloned repo *(not the repo root)*

Obsidian will create a `.obsidian/` folder inside `vault/` with your settings. This is normal and gitignored.

### 3b. Configure Obsidian settings

In **Settings**:

| Section | Setting | Value |
|---|---|---|
| Files & Links | Default location for new notes | `vault` |
| Files & Links | Default location for new attachments | `vault/attachments` |
| Files & Links | Use \[\[Wikilinks\]\] | ✅ On |
| Editor | Strict line breaks | Off |
| Templates | Template folder location | template folder|
| Hotkeys | Templates: Insert template | alt+t (or whatever you want) |

### 3c. Install the Obsidian Git plugin

This plugin auto-commits and pushes your notes to GitHub so the site rebuilds without you opening a terminal.

1. **Settings → Community plugins → Browse**
2. Search **Obsidian Git** → Install → Enable
3. In the plugin's settings:
   - **Auto commit interval**: `5` (minutes, or your preference)
   - **Auto push after commit**: ✅ On
   - **Commit message**: `vault: auto-save {{date}}`

### 3d. Authenticate Git

Obsidian Git needs write access to your remote repo. The easiest way is a **GitHub Personal Access Token (PAT)**:

> Hosting on GitHub Pages does **not** remove this requirement. If Obsidian Git is pushing commits for you, it still needs GitHub auth (PAT or SSH key).

1. Go to **GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens**
2. Create a token with **Contents: Read and Write** on your repo
3. In your local repo, embed the token in the remote URL:

   ```bash
   git remote set-url origin https://YOUR_PAT@github.com/your-username/your-repo.git
   ```

Obsidian Git will use this URL. You won't be prompted for credentials again.

Alternatively, use SSH keys — see [GitHub's SSH docs](https://docs.github.com/en/authentication/connecting-to-github-with-ssh).

---

## Step 4 — Run the Dev Server

```bash
pnpm dev
```

Open [http://localhost:4321](http://localhost:4321). The template notes appear in the graph. Edit or create a note in Obsidian and save — the browser will hot-reload.

---

## Step 5 — Write Your First Note

Create a file in `vault/`, for example `vault/My First Note.md`:

```markdown
---
publish: true
title: "My First Note"
tags: [topic]
---

# My First Note

Hello, graph! This links to [[Another Note]] which doesn't exist yet — it'll appear as a ghost node.
```

Save it. The dev server will reflect the change after a restart (or run `pnpm build` to see the full output).

The pro way to do this is to press `ctrl + N` + `

---

## Step 6 — Deploy to Netlify

### 6a. Push to GitHub

```bash
git add .
git commit -m "initial vault"
git push
```
**OR**
Deploy from inside Obsidian! 

### 6b. Import to Netlify

1. Go to [app.netlify.com](https://app.netlify.com) → **Add new site → Import an existing project**
2. Choose **Deploy with GitHub** and authorize access
3. Select your repo
4. Review build settings — `netlify.toml` pre-configures everything:

   | Setting | Value |
   |---|---|
   | Build command | `pnpm astro clean && node scripts/sync-titles.mjs && pnpm build` |
   | Publish directory | `dist` |

5. Click **Deploy site**

### 6c. First build

The build takes 1–3 minutes. Look for:
```
[build] Complete!
```

Your site is live at `random-name.netlify.app`.
If you'de like to point your GalaxyBrain at a custom domain, follow Netlify's instructions/prompts, it's pretty straight forward.


### 6f. Deploy to GitHub Pages instead (Alternative to Netlify)

This repo includes a ready-to-use workflow at `.github/workflows/deploy-pages.yml`.

> [!note]
> Netlify is the default deployment path. GitHub Pages deployment is opt-in and manual.

1. Push your repo to GitHub
2. Go to **Settings → Pages**
3. Under **Build and deployment**, set **Source = GitHub Actions**
4. Open **Actions → Deploy to GitHub Pages → Run workflow**
5. Set `enablement`:
   - `false` if Pages is already enabled
   - `true` if you want the action to attempt enabling/configuring Pages
6. Run the workflow

#### URLs on GitHub Pages

- If your repo is named `username.github.io`, the site is hosted at the root.
- Any other repo name is hosted at `/repo-name/`.

GalaxyBrain auto-detects this at build time and adjusts links/assets automatically.

---

## Step 7 — Start With a Clean Slate

Once your site is live and you’ve written a few of your own notes, you’ll want to remove all the template content. Here’s exactly what to delete and change.

### Remove the template notes

In Obsidian (or your file manager), delete every file listed in `vault/` folder. Ideally you leave the attachments folder, and template folder, but everything else can go. 

### Turn off the “Build your own” prompt

The CTA that appeared after you first clicked the hub is controlled by a single constant in the source code. Open `src/components/FullGraph.tsx` and find this line near the top:

```ts
const SHOW_BUILD_CTA = true;
```

Change it to:

```ts
const SHOW_BUILD_CTA = false;
```

Save the file. The prompt will never appear again.

### Push and rebuild

Once you’ve deleted the template notes, updated Welcome.md, and flipped the flag:

Push these new changes via Obsidian Git 

Netlify will pick up the push and rebuild. Your graph will show only your notes.

---

## Customizing the Site

### Colors and fonts

Edit `src/styles/global.css`. CSS custom properties at the top of the file control both dark and light themes.

### Landing page layout

Edit `src/pages/index.astro`.

### Note page layout

Edit `src/layouts/NoteLayout.astro`.

### Graph physics

`ForceGraph3D` props in `src/components/FullGraph.tsx` control link distance, charge, particle speed, etc.

---

## Community

| | |
|---|---|
| 🐛 Found a bug? | [Open an issue](https://github.com/nerd-sniped/GalaxyBrain/issues/new?template=bug_report.yml) |
| ✨ Have an idea? | [Request a feature](https://github.com/nerd-sniped/GalaxyBrain/issues/new?template=feature_request.yml) |
| 💬 Just want to chat? | [Start a discussion](https://github.com/nerd-sniped/GalaxyBrain/discussions) |
| 🌟 Built something? | [Show it off](https://github.com/nerd-sniped/GalaxyBrain/discussions/categories/show-and-tell) |

Contributions are welcome! Read [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---
