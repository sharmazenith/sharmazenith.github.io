# Prompt: handwritten margin annotations for shayari and notes

Reference look: a clean typographic piece with small handwritten notes floating
around it in the margins, each with a hand-drawn arrow pointing at the thing it
describes, and one note inside a hand-drawn oval. Two ink colors only (a warm
brown red and a slate blue), a loose script hand, slightly rotated, never
perfectly straight. The notes comment on the text. The text stays the hero.

Paste everything below the line to Claude when you want this built or extended.

---

Add handwritten margin annotations to the [shayari / notes] reader pages of the
Astro site in this folder (ZenithPS). Follow these rules exactly.

**What it looks like**
- Short notes (2 to 6 words, lowercase, plain observations such as "written at
  2am" or "the turn happens here") in a thin handwriting script font, set at
  roughly 60 to 70 percent of body size, rotated between -6 and 6 degrees.
- Each note connects to a word, line or phrase with a hand-drawn SVG arrow. The
  arrow is a single wobbly curved stroke with an open two stroke arrowhead, not
  a perfect bezier and not a stock icon. Vary the curve between notes.
- One optional note can instead circle a word with a loose double ring oval
  that overshoots where it closes, as if drawn with a pen.
- Two ink colors only, from CSS variables: `--ink-a` (warm brown red, about
  #7a3b32) and `--ink-b` (slate blue, about #4a5578). Both need dark mode
  values with enough contrast on `--bg`. Alternate between them.
- Notes sit in the margins around the text, never on top of it, and never
  cover a line of the sher.

**How it works**
- Content drives it. Add an optional `annotations` array to the frontmatter of
  shayari and notes, in `src/content.config.ts`:
  `{ text, target, side: "left"|"right"|"above"|"below", tone: "a"|"b", style: "arrow"|"circle" }`.
  `target` is the exact word or phrase in the body to point at. No annotations
  means the page renders exactly as it does today.
- Render with a small component (for example `Annotation.astro`) plus one
  script that, after fonts load, measures the target text with a Range
  `getBoundingClientRect`, places the note in the margin on the chosen side,
  and draws the arrow from the note to the target. Recompute on resize.
- Draw the arrow and circle in with the same pen style animation the signature
  uses (stroke-dasharray and stroke-dashoffset), one after another, only when
  the page first scrolls into view. Honor `prefers-reduced-motion` by showing
  the finished drawing with no animation.
- Self host the handwriting font as woff2 in `src/assets/fonts`, preloaded the
  way the existing font is. Suggest two or three candidate script fonts and
  pick one with a thin pen like stroke that stays readable at small sizes.

**Constraints**
- Under 1100px wide there is not enough margin: drop the arrows and show each
  note inline directly under its target line, in the same script font and
  color, with a short underline. Never let notes cause horizontal scroll.
- Urdu and Hindi shayari (`lang` of `ur` or `hi`): flip sides for right to
  left, and keep the notes in the script font in English only.
- Notes are decorative commentary. Mark the arrows `aria-hidden`, and expose
  each note's text to screen readers as a visually hidden aside directly after
  its target.
- No new dependencies. Keep the existing hairline, no border radius look of
  the site; the only organic shapes are the pen drawn arrows and circles.
- Verify with `npx astro build`, then check one real shayari at desktop, tablet
  and phone widths, light and dark, before calling it done.

**Deliver**
A short note on which font you chose and why, the frontmatter example, and one
sample shayari annotated with three notes (two arrows, one circle) to prove it.
