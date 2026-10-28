# giuskywalker.sh

Personal cybersecurity blog — HackTheBox writeups, security research and field notes.
Hacker + Star Wars (Imperial / dark-side) theme. Built with [Astro](https://astro.build),
deployed to GitHub Pages.

## Stack

- **Astro** static site, zero client JS by default.
- Content as Markdown in `src/content/` (two collections: `writeups`, `articles`).
- Syntax highlighting via built-in Shiki (`tokyo-night`).
- Theme: `src/styles/global.css` (Terminal / Sith — black & red).

## Local development

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # -> dist/
npm run preview    # serve the built site
```

## Adding content

### A writeup

Create `src/content/writeups/<machine>.md`:

```yaml
---
title: "HackTheBox — Boxname"
machine: "Boxname"
platform: "HackTheBox"
difficulty: "Easy"      # Easy | Medium | Hard | Insane
os: "Linux"
season: "Season 12"     # optional
points: 20               # optional
date: 2026-10-28
tags: ["web", "privesc"]
summary: "One-line teaser shown on cards."
repo: "https://github.com/giuskywalkerxyz/htb-writeups-retired/tree/main/Boxname"  # optional
draft: false             # true = hidden from the site
---

## Overview
...
```

> **Rule:** only publish **retired / out-of-season** boxes. Active-season boxes stay
> `draft: true` (or out of the repo) until they retire — the attack chain is the spoiler.

### An article

Create `src/content/articles/<slug>.md` with `title`, `date`, `tags`, `summary`, `draft`.

## Deployment (GitHub Pages)

`.github/workflows/deploy.yml` builds and deploys on every push to `main`.

1. Push this repo to GitHub.
2. Repo **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. For a **user site** repo named `giuskywalkerxyz.github.io`, it serves at the root and
   `astro.config.mjs` is already correct. For a **project repo** (e.g. `blog`), set
   `base: '/blog'` and `site` accordingly in `astro.config.mjs`.
