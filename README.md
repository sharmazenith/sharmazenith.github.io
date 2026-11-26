# ZenithPS

Personal site at https://sharmazenith.github.io. Astro, static output, deployed by GitHub Actions on push to `main`.

One quiet room: an app shell (header, left rail, right panel, footer) kept in place by Astro's client router (`transition:persist`), where only the middle column changes. Only the middle scrolls.

## Change things in one place

- `src/config.ts`: `SECTION` (the writing section's name and slug), `CITY` (footer place, weather, clock), `NOW_PLAYING_ENDPOINT`, links, email, résumé PDF. Empty values are hidden. Renaming the section's slug also means renaming `src/pages/<slug>/` and the redirects in `astro.config.mjs`.
- `src/layouts/Shell.astro`: the one shared frame. `Rail.astro` (left index) and `Panel.astro` (ID card and now playing) are persisted with it.
- `src/components/Logo.astro`: the ZENITH wordmark, inline SVG in `currentColor` (black on light, white on dark). `public/favicon.svg` is the Z alone.
- `src/styles/global.css`, top of file: shell geometry (`--header`, `--rail`, `--panel`, `--pad-top`) and the color tokens.
- `src/data/home.json`: homepage copy.
- `worker/`: Cloudflare Worker for now playing. Not deployed by CI. See `worker/README.md`.

## Write

Everything lives in `src/content/elsewhere/<slug>.mdx` (or `.md`):

```
---
title: "Optional for shayari"
type: shayari        # shayari, note, essay or quote
date: 2026-11-12
lang: hi             # language of the original: en, hi or ur
attribution: "Quotes only"
devanagari: |        # optional script and translation variants; with two or more, readers get a switcher
  First line
  Second line

  Next couplet
roman: |
  ...
english: |
  ...
---
Notes and essays: the body below the frontmatter is the piece. Shayari and quotes with no variants use the body as their text.
```

Add `draft: true` to hide a piece.

## Publish from the site

Writing and publishing from the page runs in a separate Cloudflare Worker, because GitHub Pages is static. Setup, secrets, the GitHub OAuth app settings and how it works: `worker/ADMIN.md`. Env vars are listed in `.env.example`.

## Run

```
npm install
npm run dev      # http://localhost:3000
npm run build
```

Needs Node 22.23.4 or newer.

## Type

`src/styles/typography.css` is the type standard: Neue Montreal at one weight (500), four sizes (Display 28, Section 20, Body 16, Small 11 uppercase), mobile steps down to 24, 18 and 15. Use the `--type-*` shorthands, never raw font sizes or weights. Colors: ink `#1a1b1f`, soft `#555`, muted `#979797`, rule `#d9d9d9`. To change the typeface, edit `--font-brand` and the `@font-face` at the top of that file. The font file is licensed, so confirm the web license covers embedding.
