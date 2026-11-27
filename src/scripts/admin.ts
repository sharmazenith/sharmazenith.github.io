// Admin only: write, edit, unpublish. Nothing here is visible to visitors; it all hangs off a signed token
// that only exists in this browser after signing in at /admin/login. The Worker re-checks every call.

const rail = document.getElementById("rail") as HTMLElement
const api = rail.dataset.api ?? ""
const TOKEN = "admin-token"
const AUTOSAVE = "elsewhere-draft"
const root = document.documentElement
const pane = () => document.getElementById("pane") as HTMLElement
const writeBtn = document.getElementById("write-entry") as HTMLButtonElement
const tpl = document.getElementById("editor-tpl") as HTMLTemplateElement

type Lang = "hi" | "ur" | "en"
type Type = "shayari" | "note" | "essay" | "quote"
interface Fields { type: Type; lang: Lang; date: string; title: string; attribution: string; devanagari: string; roman: string; english: string; draft?: boolean }
const PRIMARY: Record<Lang, "devanagari" | "roman" | "english"> = { hi: "devanagari", ur: "roman", en: "english" }
const SEG: Record<Type, string> = { shayari: "shayari", note: "notes", essay: "essays", quote: "quotes" }

/* ---------- the token ---------- */
function token(): string | null {
  try {
    const t = localStorage.getItem(TOKEN)
    if (!t) return null
    const p = JSON.parse(atob(t.split(".")[0].replace(/-/g, "+").replace(/_/g, "/")))
    if (p.exp * 1000 < Date.now()) { localStorage.removeItem(TOKEN); return null }
    return t
  } catch { return null }
}
export function refreshAdmin() {
  const on = !!token()
  root.toggleAttribute("data-admin", on)
  writeBtn.hidden = !on
  document.querySelectorAll<HTMLElement>(".admin-bar").forEach((e) => (e.hidden = !on))
}

async function call(method: string, path: string, body?: unknown): Promise<{ status: number; data: any }> {
  const t = token()
  if (!t) return { status: 401, data: { error: "unauthorized" } }
  try {
    const res = await fetch(api + path, { method, headers: { authorization: `Bearer ${t}`, ...(body ? { "content-type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined })
    const data = await res.json().catch(() => ({}))
    if (res.status === 401) { try { localStorage.removeItem(TOKEN) } catch { /* ignore */ } refreshAdmin() }
    return { status: res.status, data }
  } catch { return { status: 0, data: { error: "Couldn't reach the publishing service. Nothing was changed." } } }
}
function explain(r: { status: number; data: any }): string {
  if (r.status === 401) return "You're signed out. Open /admin/login to sign in again."
  if (r.status === 409) return "This piece changed elsewhere. Reload to get the latest."
  if (r.status === 422 && Array.isArray(r.data?.errors)) return r.data.errors.join(". ") + "."
  return r.data?.error ?? "Something went wrong. Nothing was changed."
}

/* ---------- the editor ---------- */
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Chicago" }).format(new Date()) // YYYY-MM-DD, Chicago time
const blank = (): Fields => ({ type: "shayari", lang: "hi", date: today(), title: "", attribution: "", devanagari: "", roman: "", english: "" })
let ed: HTMLFormElement | null = null
let mode: { kind: "new" } | { kind: "edit"; slug: string; sha: string } = { kind: "new" }

/* textareas grow with what is typed, so nothing is hidden behind a scrollbar */
function grow(t: HTMLTextAreaElement) { t.style.height = "auto"; t.style.height = `${Math.max(t.scrollHeight + 2, 150)}px` }
const seg = (name: string) => ed!.querySelector<HTMLElement>(`[data-seg="${name}"]`)!
const input = (name: string) => ed!.elements.namedItem(name) as HTMLInputElement | HTMLTextAreaElement
function read(): Fields {
  const on = (name: string) => seg(name).querySelector<HTMLElement>('[aria-pressed="true"]')!.dataset.val!
  return {
    type: on("type") as Type, lang: on("lang") as Lang, date: input("date").value, title: input("title").value,
    attribution: input("attribution").value, devanagari: input("devanagari").value, roman: input("roman").value, english: input("english").value,
  }
}
function write(f: Fields) {
  for (const [name, val] of [["type", f.type], ["lang", f.lang]] as const) seg(name).querySelectorAll<HTMLElement>("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.val === val)))
  for (const k of ["date", "title", "attribution", "devanagari", "roman", "english"] as const) input(k).value = f[k] ?? ""
  layout()
}
/* only the fields that matter for the chosen type and language are shown; the original language's text is required */
function layout() {
  const f = read()
  const prose = f.type === "note" || f.type === "essay"
  for (const k of ["devanagari", "roman", "english"] as const) {
    const row = ed!.querySelector<HTMLElement>(`[data-var="${k}"]`)!
    row.hidden = prose && k !== PRIMARY[f.lang]
    row.querySelector<HTMLElement>(".ed-req")!.hidden = k !== PRIMARY[f.lang]
  }
  ed!.querySelector<HTMLElement>("[data-quote]")!.hidden = f.type !== "quote"
  const tr = ed!.querySelector<HTMLButtonElement>('[data-act="translate"]')!
  tr.disabled = !f.roman.trim()
  ed!.querySelector<HTMLElement>("[data-tr-hint]")!.hidden = !!f.roman.trim()
  ed!.querySelectorAll<HTMLTextAreaElement>("textarea").forEach(grow)
  ed!.querySelector<HTMLElement>("[data-title-hint]")!.textContent = prose ? "required" : "optional"
}
const msg = (text: string, link?: { href: string; label: string }) => {
  const el = ed!.querySelector<HTMLElement>(".ed-msg")!
  el.textContent = text + (link ? " " : "")
  if (link) { const a = document.createElement("a"); a.href = link.href; a.textContent = link.label; el.append(a) }
}

/* the exact published markup, built from the fields (textContent only, so nothing typed can become HTML) */
function preview(f: Fields): HTMLElement {
  const el = (tag: string, cls?: string, text?: string) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e }
  const art = el("article", "piece")
  art.dataset.type = SEG[f.type]
  const prose = f.type === "note" || f.type === "essay"
  if (prose) {
    if (f.title) art.append(el("h1", "ptitle", f.title))
    const body = el("div", "body-text"); body.lang = f.lang
    for (const para of f[PRIMARY[f.lang]].split(/\n{2,}/)) body.append(el("p", undefined, para.trim()))
    art.append(body)
  } else {
    const vs = [
      f.devanagari.trim() && { key: "devanagari", label: "देवनागरी", lang: "hi", text: f.devanagari },
      f.roman.trim() && { key: "roman", label: "Roman", lang: `${f.lang === "ur" ? "ur" : "hi"}-Latn`, text: f.roman },
      f.english.trim() && { key: "english", label: "English", lang: "en", text: f.english },
    ].filter(Boolean) as { key: string; label: string; lang: string; text: string }[]
    if (vs.length > 1) {
      const sw = el("div", "switcher"); sw.setAttribute("role", "group"); sw.setAttribute("aria-label", "script")
      vs.forEach((v, i) => { const b = el("button", undefined, v.label) as HTMLButtonElement; b.type = "button"; b.dataset.script = v.key; b.setAttribute("aria-pressed", String(i === 0)); sw.append(b) })
      art.append(sw)
    }
    const stack = el("div", "stack")
    vs.forEach((v, i) => {
      const d = el("div", `var${i === 0 ? " on" : ""}`); d.dataset.script = v.key; d.lang = v.lang
      let gap = false
      for (const raw of v.text.replace(/\r/g, "").trim().split("\n")) {
        if (!raw.trim()) { if (!gap) d.append(el("p", "gap")); gap = true; continue }
        gap = false; d.append(el("p", undefined, raw.trim()))
      }
      stack.append(d)
    })
    art.append(stack)
    if (f.type === "quote" && f.attribution) art.append(el("p", "attr", f.attribution))
  }
  const [y, m, d] = f.date.split("-").map(Number)
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  art.append(el("p", "rmeta", `${d} ${MONTHS[(m || 1) - 1]} ${y} · ${f.type}`))
  return art
}

function open(prefill: Fields | null, m: typeof mode) {
  const node = tpl.content.firstElementChild!.cloneNode(true) as HTMLFormElement
  pane().replaceChildren(node)
  ed = node
  mode = m
  let start = prefill
  if (!start && m.kind === "new") { try { start = JSON.parse(localStorage.getItem(AUTOSAVE) ?? "null") } catch { start = null } }
  write(start ?? blank())
  if (m.kind === "edit") msg("Editing. Publish saves over the current version.")
  else if (start && start !== prefill) msg("Restored your unsaved writing.")
  void loadDrafts()
  const saver = window.setInterval(() => {
    if (!node.isConnected) { clearInterval(saver); return }
    if (mode.kind !== "new") return
    const f = read()
    if (f.title || f.devanagari || f.roman || f.english || f.attribution) { try { localStorage.setItem(AUTOSAVE, JSON.stringify(f)) } catch { /* storage full */ } }
  }, 4000)
}
async function loadDrafts() {
  const r = await call("GET", "/pieces")
  const drafts = (r.data?.pieces ?? []).filter((p: any) => p.draft)
  if (!ed || drafts.length === 0) return
  const box = ed.querySelector<HTMLElement>(".ed-drafts")!, list = box.querySelector<HTMLElement>(".ed-draft-list")!
  list.replaceChildren(...drafts.map((p: any) => { const b = document.createElement("button"); b.type = "button"; b.dataset.draft = p.slug; b.textContent = p.title || p.slug; return b }))
  box.hidden = false
}
async function openExisting(slug: string) {
  const r = await call("GET", `/piece?slug=${encodeURIComponent(slug)}`)
  if (r.status !== 200) { if (ed) msg(explain(r)); return explain(r) }
  open({ ...r.data.fields, draft: undefined }, { kind: "edit", slug, sha: r.data.sha })
  return null
}

/* Roman in, Devanagari and a plain English translation out. They land in the boxes as drafts to read and fix. */
async function translateRoman(btn: HTMLButtonElement) {
  const roman = input("roman").value.trim()
  if (!roman) { msg("Write something in the Roman box first."); return }
  const filled = input("devanagari").value.trim() || input("english").value.trim()
  if (filled && btn.dataset.armed !== "1") { btn.dataset.armed = "1"; btn.textContent = "Replace the other two?"; msg("This overwrites the Devanagari and English boxes. Press again to confirm."); return }
  btn.dataset.armed = ""; btn.textContent = "Fill Devanagari and English"
  btn.disabled = true; msg("Translating…")
  const r = await call("POST", "/translate", { roman })
  btn.disabled = false
  if (r.status !== 200) { msg(explain(r)); return }
  input("devanagari").value = r.data.devanagari
  input("english").value = r.data.english
  layout()
  input("devanagari").focus()
  msg("Filled in. Read both, fix anything that is off, then press Preview or Publish.")
}

/* point at what is missing instead of making you guess */
function missing(f: Fields): { name: string; text: string } | null {
  const prose = f.type === "note" || f.type === "essay"
  if (prose && !f.title.trim()) return { name: "title", text: "Add a title first. Notes and essays need one." }
  const primary = PRIMARY[f.lang]
  if (!f[primary].trim()) return { name: primary, text: `The ${primary === "devanagari" ? "देवनागरी" : primary === "roman" ? "Roman" : "English"} box is empty. It is the original language, so it is required.` }
  return null
}

async function submit(draft: boolean) {
  const f = { ...read(), draft }
  const gap = draft ? null : missing(f)
  if (gap) { msg(gap.text); input(gap.name).focus(); return }
  const busy = ed!.querySelectorAll<HTMLButtonElement>("[data-act]")
  busy.forEach((b) => (b.disabled = true))
  msg(draft ? "Saving draft…" : "Publishing…")
  const r = mode.kind === "edit" ? await call("PUT", "/piece", { slug: mode.slug, sha: mode.sha, fields: f }) : await call("POST", "/publish", f)
  busy.forEach((b) => (b.disabled = false))
  if (r.status !== 200) { msg(explain(r)); return }
  if (mode.kind === "edit") { mode = { kind: "edit", slug: mode.slug, sha: r.data.sha } } else { try { localStorage.removeItem(AUTOSAVE) } catch { /* ignore */ } }
  const href = `/elsewhere/${SEG[f.type]}/${r.data.slug}/`
  if (draft) msg("Draft saved. It stays private.")
  else msg(mode.kind === "edit" ? "Saved. It'll be live in about a minute." : "Published. It'll be live in about a minute.", { href, label: href })
  if (mode.kind === "new") write(blank()) // clear the editor
}

/* ---------- wiring (delegated, because the middle is swapped and the rail is persisted) ---------- */
writeBtn.addEventListener("click", () => open(null, { kind: "new" }))
document.addEventListener("click", async (e) => {
  const t = e.target as Element
  const segBtn = t.closest<HTMLButtonElement>(".editor .seg button")
  if (segBtn && ed) { segBtn.parentElement!.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b === segBtn))); layout(); return }
  const draftBtn = t.closest<HTMLButtonElement>(".editor [data-draft]")
  if (draftBtn) { await openExisting(draftBtn.dataset.draft!); return }
  const act = t.closest<HTMLButtonElement>(".editor [data-act]")
  if (act && ed) {
    const a = act.dataset.act
    if (a === "publish") await submit(false)
    else if (a === "draft") await submit(true)
    else if (a === "translate") await translateRoman(act)
    else if (a === "close") location.reload() // back to the page as visitors see it
    else if (a === "preview") {
      const box = ed.querySelector<HTMLElement>(".ed-preview")!, form = ed.querySelector<HTMLElement>(".ed-form")!
      const showing = box.hidden
      if (showing) box.replaceChildren(preview(read()))
      box.hidden = !showing
      form.hidden = showing
      act.textContent = showing ? "Edit" : "Preview"
    }
    return
  }
  const bar = t.closest<HTMLButtonElement>(".admin-bar button")
  if (bar) {
    const piece = bar.closest<HTMLElement>(".piece")!, slug = piece.dataset.slug!
    const out = bar.closest(".admin-bar")!.querySelector<HTMLElement>(".admin-msg")!
    if (bar.dataset.admin === "edit") { const err = await openExisting(slug); if (err) out.textContent = err }
    else if (bar.dataset.admin === "unpublish") {
      if (bar.dataset.armed !== "1") { bar.dataset.armed = "1"; bar.textContent = "Confirm unpublish"; return }
      const cur = await call("GET", `/piece?slug=${encodeURIComponent(slug)}`) // the file's current SHA
      if (cur.status !== 200) { out.textContent = explain(cur); return }
      const r = await call("POST", "/unpublish", { slug, sha: cur.data.sha })
      out.textContent = r.status === 200 ? "Unpublished. It will disappear in about a minute." : explain(r)
      bar.dataset.armed = ""; bar.textContent = "Unpublish"
    }
  }
})
document.addEventListener("input", (e) => { if (ed?.isConnected) { layout(); if ((e.target as Element).tagName === "TEXTAREA") grow(e.target as HTMLTextAreaElement) } })

refreshAdmin()
document.addEventListener("astro:after-swap", refreshAdmin)
document.addEventListener("astro:page-load", refreshAdmin)
