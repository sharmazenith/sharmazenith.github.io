import { z } from "astro/zod"
import raw from "../data/home.json"

/* Every piece of homepage copy lives in src/data/home.json and is validated here at build time.
   Empty text is treated as absent, so components render a field only when it has a value. */
const text = z.string().trim().optional().transform((s) => s || undefined)
const list = z.array(z.string().trim()).default([]).transform((a) => a.filter(Boolean))

const entry = z.object({
  dates: z.object({ start: text, end: text }).optional(),
  title: text,
  note: text,
  organization: text,
  city: text,
  bullets: list,
}).transform(({ dates, ...e }) => ({
  ...e,
  when: dates?.start ? (dates.end ? `${dates.start} to ${dates.end}` : dates.start) : undefined,
}))

const schema = z.object({
  intro: list,
  sidebar: z.object({
    tagline: list,
    contactLabel: text,
    openToNewWork: z.boolean().default(false),
  }),
  work: z.array(entry).default([]),
  school: z.array(entry).default([]),
  built: z.array(z.object({ name: text, description: text, href: text })).default([]),
  tools: z.array(z.object({ label: text, items: list })).default([]),
})

const home = schema.parse(raw)

/* a section with nothing to show disappears, header included */
export const intro = home.intro
export const sidebar = home.sidebar
export const work = home.work.filter((e) => e.title)
export const school = home.school.filter((e) => e.title)
export const built = home.built.filter((p) => p.name)
export const tools = home.tools.filter((t) => t.label && t.items.length)
