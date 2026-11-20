import { getCollection, type CollectionEntry } from "astro:content"

export type Shayari = CollectionEntry<"shayari">
export type Note = CollectionEntry<"notes">

const newest = <T extends { data: { date: Date } }>(a: T, b: T) => b.data.date.getTime() - a.data.date.getTime()

export async function allShayari(): Promise<Shayari[]> {
  return (await getCollection("shayari", (e) => !e.data.draft)).sort(newest)
}
export async function allNotes(): Promise<Note[]> {
  return (await getCollection("notes", (e) => !e.data.draft)).sort(newest)
}

// Non empty lines stay as lines; a blank line becomes a gap. `alt` marks every second line.
export interface Line { text: string; gap: boolean; alt: boolean }
export function toLines(body: string | undefined, max?: number): Line[] {
  const out: Line[] = []
  let n = 0
  for (const raw of (body ?? "").replace(/\r/g, "").trim().split("\n")) {
    const text = raw.trim()
    if (!text) {
      if (out.length && !out[out.length - 1].gap) out.push({ text: "", gap: true, alt: false })
      continue
    }
    if (max !== undefined && n >= max) break
    out.push({ text, gap: false, alt: n % 2 === 1 })
    n++
  }
  while (out.length && out[out.length - 1].gap) out.pop()
  return out
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
export const fmtDay = (d: Date) => `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`
export const fmtMonth = (d: Date) => `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`

export function readingTime(body: string | undefined): string {
  const words = (body ?? "").split(/\s+/).filter(Boolean).length
  return `${Math.max(1, Math.round(words / 200))} min read`
}
