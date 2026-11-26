import { getCollection, type CollectionEntry } from "astro:content"

export type Piece = CollectionEntry<"elsewhere">
export type PieceType = Piece["data"]["type"]

/* filter keys, labels and the plural each is counted under */
export const TYPES = [
  { key: "shayari", seg: "shayari", label: "Shayari", empty: "No shayari yet." },
  { key: "note", seg: "notes", label: "Notes", empty: "No notes yet." },
  { key: "essay", seg: "essays", label: "Essays", empty: "No essays yet." },
  { key: "quote", seg: "quotes", label: "Quotes", empty: "No quotes yet." },
] as const
export type Seg = (typeof TYPES)[number]["seg"]
export const segOf = (t: PieceType): Seg => TYPES.find((x) => x.key === t)!.seg
export const hrefOf = (e: Piece) => `/elsewhere/${segOf(e.data.type)}/${e.id}/`

export async function getPieces(): Promise<Piece[]> {
  return (await getCollection("elsewhere", (e) => !e.data.draft)).sort((a, b) => b.data.date.getTime() - a.data.date.getTime())
}

// Non empty lines stay as lines; a blank line becomes a gap between couplets.
export interface Line { text: string; gap: boolean }
export function toLines(body: string | undefined): Line[] {
  const out: Line[] = []
  for (const raw of (body ?? "").replace(/\r/g, "").trim().split("\n")) {
    const text = raw.trim()
    if (!text) { if (out.length && !out[out.length - 1].gap) out.push({ text: "", gap: true }); continue }
    out.push({ text, gap: false })
  }
  while (out.length && out[out.length - 1].gap) out.pop()
  return out
}

/* script and translation variants of a poem or quote, with the lang tag each needs for correct shaping */
export interface Variant { key: "devanagari" | "roman" | "english"; label: string; lang: string; text: string }
export function variantsOf(e: Piece): Variant[] {
  const { devanagari, roman, english, lang } = e.data
  const list: Variant[] = []
  if (devanagari?.trim()) list.push({ key: "devanagari", label: "देवनागरी", lang: "hi", text: devanagari })
  if (roman?.trim()) list.push({ key: "roman", label: "Roman", lang: `${lang === "ur" ? "ur" : "hi"}-Latn`, text: roman })
  if (english?.trim()) list.push({ key: "english", label: "English", lang: "en", text: english })
  if (list.length === 0 && (e.body ?? "").trim()) {
    list.push({ key: lang === "en" ? "english" : "devanagari", label: lang === "en" ? "English" : "Original", lang, text: e.body ?? "" })
  }
  return list
}

/* the row label: the title, or for untitled shayari and quotes the first line of the first variant */
export function labelOf(e: Piece): string {
  if (e.data.title) return e.data.title
  const first = variantsOf(e)[0]
  return toLines(first?.text).find((l) => !l.gap)?.text ?? "Untitled"
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
export const fmtDay = (d: Date) => `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`
