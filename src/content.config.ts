import { defineCollection } from "astro:content"
import { glob } from "astro/loaders"
import { z } from "astro/zod"

// lang picks the typeface: en (Latin), hi (Devanagari), ur (Nastaliq, right to left).
const entry = z.object({
  title: z.string(),
  date: z.coerce.date(),
  lang: z.enum(["en", "hi", "ur"]).default("en"),
  summary: z.string().optional(),
  draft: z.boolean().default(false),
})

const poems = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/poems" }),
  schema: entry.extend({
    kind: z.enum(["shayari", "poem"]).default("poem"),
    translation: z.string().optional(),
  }),
})

const notes = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/notes" }),
  schema: entry,
})

export const collections = { poems, notes }
