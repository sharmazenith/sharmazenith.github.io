# ZenithPS

Personal site at https://sharmazenith.github.io. Astro, static output, deployed by GitHub Actions on push to `main`.

One quiet room: a fixed frame (header, intro panel, footer) where only the pane changes.

## Change things in one place

- `src/config.ts`: `SPACE_NAME` (section name), `CITY` (footer place, weather, clock), `NOW_PLAYING_ENDPOINT`, links, email, résumé PDF. Empty values are hidden.
- `src/assets/signature.svg`: the traced signature artwork. `src/data/signature-strokes.json`: the pen strokes (writing order and timing) that reveal it once per session, then the mask is removed so the exact artwork shows. Delete the SVG to fall back to a plain wordmark.
- `worker/`: Cloudflare Worker for the footer's now playing. Not deployed by CI. See `worker/README.md`.
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
