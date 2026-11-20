# ZenithPS

Personal site at https://sharmazenith.github.io. Astro, static output, deployed by GitHub Actions on push to `main`.

One quiet room: a fixed frame (header, intro panel, footer) where only the pane changes.

## Change things in one place

- `src/config.ts`: `SPACE_NAME` (section name), name, links, email, timezone, résumé PDF. Empty values are hidden.
- `src/styles/global.css`, top of file: `--font-sans`, `--dark-base` and the color tokens.
- `src/data/resume.ts`: résumé content. Everything marked TODO is a placeholder.

## Write

Shayari: `src/content/shayari/<slug>.md`

```
---
date: 2026-11-12
form: sher        # sher, ghazal, nazm or qita
lang: en          # en, hi or ur (ur is right to left)
---
First line
Second line

Next stanza
```

Notes: `src/content/notes/<slug>.md` with `title`, `date`, optional `excerpt`, then Markdown. Add `draft: true` to hide any entry.

## Run

```
npm install
npm run dev
npm run build
```

Needs Node 22.23.4 or newer.
