import { defineCollection } from "astro:content"
import { glob } from "astro/loaders"
import { z } from "astro/zod"

// lang sets text direction and script. en is left to right, hi is Devanagari, ur is right to left.
const common = {
  date: z.coerce.date(),
  lang: z.enum(["en", "hi", "ur"]).default("en"),
  excerpt: z.string().optional(),
  draft: z.boolean().default(false),
}

const shayari = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/shayari" }),
  schema: z.object({
    ...common,
    title: z.string().optional(),
    form: z.enum(["sher", "ghazal", "nazm", "qita"]).default("sher"),
  }),
})

const notes = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/notes" }),
  schema: z.object({ ...common, title: z.string() }),
})

export const collections = { shayari, notes }
