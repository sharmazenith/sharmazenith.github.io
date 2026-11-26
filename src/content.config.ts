import { defineCollection } from "astro:content"
import { glob } from "astro/loaders"
import { z } from "astro/zod"

// Everything written lives in src/content/elsewhere/*.mdx (or .md).
// `lang` is the language of the original. A piece may carry script and translation variants:
// when more than one exists, the reader gets a switcher. With none, the body text is the piece.
const elsewhere = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/elsewhere" }),
  schema: z.object({
    title: z.string().optional(),
    type: z.enum(["shayari", "note", "essay", "quote"]),
    date: z.coerce.date(),
    lang: z.enum(["hi", "ur", "en"]).default("en"),
    excerpt: z.string().optional(),
    attribution: z.string().optional(), // quotes: who said it
    draft: z.boolean().default(false),
    devanagari: z.string().optional(),
    roman: z.string().optional(),
    english: z.string().optional(),
  }),
})

export const collections = { elsewhere }
