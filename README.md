# ZenithPS

Personal site at https://sharmazenith.github.io. Astro, static output, deployed by GitHub Actions on push to `main`.

## Add content

Poems: `src/content/poems/<slug>.md`

```
---
title: Title
date: 2026-11-20
lang: ur        # en, hi or ur (picks the typeface, ur is right to left)
kind: shayari   # shayari or poem
translation: "Optional English line(s)"
draft: false    # true hides it from the build
---
First line
Second line

Next stanza
```

Notes: `src/content/notes/<slug>.md` (same front matter, no kind or translation).

Resume: edit `src/data/resume.ts`. Put a PDF in `public/` and set `pdf` to show a download button.

## Run

```
npm install
npm run dev
```
