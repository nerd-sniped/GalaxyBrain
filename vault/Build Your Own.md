---
publish: true
title: "Build Your Own"
tags: []
aliases: []
graph:
  shape: dodecahedron
  color: "#e74c3c"
  pinned: true
---

# Build Your Own Galaxy

This site is a template. Everything you see the graph is yours to fork and fill with your own notes. The full setup takes about 15 minutes.

> [!tip] Free & open — please consider supporting
> I'm releasing this for free because fun side projects are better when they aren't hidden behind a paywall — not everything needs to feed the soul-crushing capitalism machine. That said, I still have to pay rent. If you've found this helpful or end up using it yourself, please consider [supporting me on Patreon](https://www.patreon.com/cw/Nerd_Sniped). ❤️

---

## Step 1 — Get the Template

1. Go to the [GalaxyBrain GitHub repo](https://github.com/nerd-sniped/GalaxyBrain)
2. Click **Use this template → Create a new repository**
3. Name your repo and set visibility (public or private — both work with Netlify)
4. Clone it locally:

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

### Open the vault

1. Open [Obsidian](https://obsidian.md)
2. Click **Open folder as vault**
3. Select the **`vault/`** subfolder inside your cloned repo *(not the repo root)*

Obsidian will create a `.obsidian/` folder inside `vault/` — this is normal and gitignored.

### Configure Obsidian settings

Go to **Settings** and set the following:

| Section | Setting | Value |
|---|---|---|
| Files & Links | Default location for new notes | `vault` |
| Files & Links | Default location for new attachments | `vault/attachments` |
| Files & Links | Use \[\[Wikilinks\]\] | ✅ On |
| Editor | Strict line breaks | Off |
| Templates | Template folder location | `template` |
| Hotkeys | Templates: Insert template | `alt+t` (or whatever you prefer) |

### Install the Obsidian Git plugin

This plugin auto-commits and pushes your notes to GitHub so the site rebuilds without opening a terminal.

1. **Settings → Community plugins → Browse**
2. Search **Obsidian Git** → Install → Enable
3. In the plugin's settings:
   - **Auto commit interval**: `5` (minutes)
   - **Auto push after commit**: ✅ On
   - **Commit message**: `vault: auto-save {{date}}`

### Authenticate Git

Obsidian Git needs write access to your remote repo. The easiest way is a **GitHub Personal Access Token (PAT)**:

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

Open [http://localhost:4321](http://localhost:4321). The template notes appear in the graph. Edit a note in Obsidian and save the browser will hot-reload.

---

## Step 5 — Write Your First Note

Create `vault/My First Note.md`:

```markdown
---
publish: true
title: "My First Note"
tags: [topic]
---

# My First Note

Hello, graph! This links to [[Another Note]] which doesn't exist yet —
it'll appear as a ghost node.
```

Use `ctrl+N` in Obsidian to create new notes, and `alt+t` to insert the frontmatter template so you don't have to type it by hand.

Notes without `publish: true` are completely hidden — no node, no edges, no page.

---

## Step 6 — Deploy to Netlify

### Push to GitHub
If using Obisidan, open the Git Panel and hit commit and sync, if using VS code, open your source manager and hit commit and push, otherwise follow the terminal command below.

```bash
git add .
git commit -m "initial vault"
git push
```

### Import to Netlify

1. Go to [app.netlify.com](https://app.netlify.com) → **Add new site → Import an existing project**
2. Choose **Deploy with GitHub** and authorise access
3. Select your repo
4. `netlify.toml` pre-configures everything — just click **Deploy site**

The first build takes 1–3 minutes. Your site will be live at `random-name.netlify.app`.

### Set a custom domain (optional)

**Site configuration → Domain management → Add a domain**, then follow the DNS instructions for your registrar.

---

## The Auto-Deploy Flow

Once everything is connected, publishing a note is just saving it in Obsidian:

```
Edit note in Obsidian
        │
        ▼  Obsidian Git commits + pushes (every N minutes)
GitHub receives push
        │
        ▼  Netlify webhook fires
pnpm build
        │
        ▼
dist/  →  live on CDN  (~60–90 seconds)
```

---

## Staying Up to Date

GalaxyBrain ships with a `.github/workflows/sync-upstream.yml` workflow that opens a pull request whenever this template receives improvements. It runs weekly on Mondays, or you can trigger it manually from **Actions → Sync from upstream template → Run workflow**.

It will never touch your `vault/` notes — only source code and config files.

---

## Customising the Site

| What | Where |
|---|---|
| Colours and fonts | `src/styles/global.css` |
| Landing page layout | `src/pages/index.astro` |
| Note page layout | `src/layouts/NoteLayout.astro` |
| Graph physics | `ForceGraph3D` props in `src/components/FullGraph.tsx` |

---

## Community

| | |
|---|---|
| 🐛 Bug? | [Open an issue](https://github.com/nerd-sniped/GalaxyBrain/issues/new?template=bug_report.yml) |
| ✨ Feature idea? | [Request a feature](https://github.com/nerd-sniped/GalaxyBrain/issues/new?template=feature_request.yml) |
| 💬 Chat? | [Start a discussion](https://github.com/nerd-sniped/GalaxyBrain/discussions) |
| 🌟 Built something? | [Show it off](https://github.com/nerd-sniped/GalaxyBrain/discussions/categories/show-and-tell) |

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

```bash
git add .
git commit -m "vault: replace template content with my notes"
git push
```

Netlify will pick up the push and rebuild. Your graph will show only your notes.
