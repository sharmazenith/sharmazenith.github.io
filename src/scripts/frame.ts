// Persistent frame. The router keeps the header, left rail, right panel and footer as the same DOM nodes;
// this module runs once per session. Anything that depends on the current page is refreshed in update().

import "./sound"
import "./footer"
import "./nowplaying"
import "./admin"

const root = document.documentElement
const reduced = matchMedia("(prefers-reduced-motion: reduce)")
const $ = <T extends HTMLElement>(sel: string) => document.querySelector<T>(sel)

/* proof that the frame is never replaced: each persisted node gets a random id once, and it must never change */
for (const el of document.querySelectorAll("[data-astro-transition-persist]")) {
  if (!(el as HTMLElement).dataset.mountId) (el as HTMLElement).dataset.mountId = Math.random().toString(36).slice(2, 10)
}

/* theme */
const themeBtn = $("#theme") as HTMLButtonElement
const label = () => themeBtn.setAttribute("aria-label", root.dataset.theme === "dark" ? "switch to light theme" : "switch to dark theme")
themeBtn.addEventListener("click", () => {
  const next = root.dataset.theme === "dark" ? "light" : "dark"
  root.dataset.theme = next
  try { localStorage.setItem("theme", next) } catch { /* private mode: choice lasts for this visit */ }
  label()
})

/* write to me */
const writeBtn = $("#write") as HTMLButtonElement
const menu = $("#write-menu") as HTMLElement
const toast = $("#toast") as HTMLElement
let toastTimer = 0
const setMenu = (open: boolean) => { menu.hidden = !open; writeBtn.setAttribute("aria-expanded", String(open)) }
writeBtn.addEventListener("click", () => { toast.hidden = true; setMenu(menu.hidden === true) })
document.addEventListener("click", (e) => { if (!menu.hidden && !(e.target as Element).closest(".write")) setMenu(false) })
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !menu.hidden) { setMenu(false); writeBtn.focus() } })
function say(text: string) {
  toast.textContent = text
  toast.hidden = false
  clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => { toast.hidden = true }, 2400)
}
document.getElementById("copy-email")?.addEventListener("click", async (e) => {
  const email = (e.currentTarget as HTMLElement).dataset.email ?? ""
  setMenu(false)
  try { await navigator.clipboard.writeText(email); say("Copied") }
  catch { say(`Couldn't copy. The email is ${email}`) }
})

/* before that: fold (delegated, because the middle is swapped) */
document.addEventListener("click", (e) => {
  const btn = (e.target as Element).closest<HTMLButtonElement>("[data-fold]")
  if (!btn) return
  const open = btn.getAttribute("aria-expanded") !== "true"
  btn.setAttribute("aria-expanded", String(open))
  document.getElementById(btn.dataset.fold!)?.setAttribute("data-open", String(open))
})

/* nav underline: slides between the two links */
function placeBar(animate: boolean) {
  const bar = document.getElementById("nav-bar") as HTMLElement
  const host = document.getElementById("nav") as HTMLElement
  const active = host.querySelector<HTMLElement>('[aria-current="page"]')
  if (!active) { bar.style.opacity = "0"; return }
  const h = host.getBoundingClientRect()
  const a = active.getBoundingClientRect()
  if (!animate || reduced.matches) bar.style.transition = "none"
  bar.style.width = `${a.width}px`
  bar.style.transform = `translateX(${a.left - h.left}px)`
  bar.style.opacity = "1"
  if (!animate || reduced.matches) { void bar.offsetWidth; bar.style.transition = "" }
}

/* writing index: the URL is the state. /elsewhere/<type>/... shows that filter; anything else shows All.
   The rail is persisted, so after each navigation this re-reads the path and updates it in place. */
const rail = $("#rail") as HTMLElement
const items = () => [...rail.querySelectorAll<HTMLLIElement>(".plist-rail li")]
const parts = () => location.pathname.split("/").filter(Boolean)
function currentFilter() {
  const [section, seg] = parts()
  return section === "elsewhere" && ["shayari", "notes", "essays", "quotes"].includes(seg) ? seg : "all"
}
function applyFilter() {
  const filter = currentFilter()
  let shown = 0
  for (const li of items()) {
    const show = filter === "all" || li.dataset.type === filter
    li.hidden = !show
    if (show) shown++
  }
  rail.querySelectorAll<HTMLAnchorElement>(".filters a").forEach((a) => {
    if (a.dataset.filter === filter) a.setAttribute("aria-current", "page")
    else a.removeAttribute("aria-current")
  })
  rail.querySelector<HTMLElement>(".rail-empty")!.hidden = shown > 0
}
function markSelected() {
  const [section, , slug] = parts()
  rail.querySelectorAll<HTMLAnchorElement>(".plist-rail a").forEach((a) => {
    if (section === "elsewhere" && slug && a.dataset.slug === slug) a.setAttribute("aria-current", "page")
    else a.removeAttribute("aria-current")
  })
}

/* script switcher: one choice, remembered, applied to every piece. All variants share one grid cell, so nothing moves. */
const SCRIPT = "script"
function applyScript() {
  let pref = ""
  try { pref = localStorage.getItem(SCRIPT) ?? "" } catch { /* default to first */ }
  document.querySelectorAll<HTMLElement>(".piece").forEach((piece) => {
    const vars = [...piece.querySelectorAll<HTMLElement>(".var")]
    if (vars.length === 0) return
    const pick = vars.find((v) => v.dataset.script === pref) ?? vars[0]
    vars.forEach((v) => v.classList.toggle("on", v === pick))
    piece.querySelectorAll<HTMLButtonElement>(".switcher button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.script === pick.dataset.script)))
  })
}
document.addEventListener("click", (e) => {
  const b = (e.target as Element).closest<HTMLButtonElement>(".switcher button")
  if (!b) return
  try { localStorage.setItem(SCRIPT, b.dataset.script!) } catch { /* lasts this visit */ }
  applyScript()
})

/* home index: scroll the middle to a section, and highlight the one in view */
rail.addEventListener("click", (e) => {
  const a = (e.target as Element).closest<HTMLAnchorElement>("[data-spy]")
  if (!a) return
  e.preventDefault()
  document.getElementById(a.dataset.spy!)?.scrollIntoView({ behavior: reduced.matches ? "auto" : "smooth", block: "start" })
})
let spy: IntersectionObserver | undefined
function watchSections() {
  spy?.disconnect()
  const mid = document.getElementById("middle")
  const heads = [...document.querySelectorAll<HTMLElement>("#pane h2.sec[id]")]
  if (root.dataset.section !== "home" || !mid || heads.length === 0) return
  const mark = (id: string) => rail.querySelectorAll<HTMLAnchorElement>("[data-spy]").forEach((a) => (a.dataset.spy === id ? a.setAttribute("aria-current", "true") : a.removeAttribute("aria-current")))
  const scroller = innerWidth >= 1280 ? mid : null
  spy = new IntersectionObserver(() => {
    const top = (scroller ? scroller.getBoundingClientRect().top : 0) + 120
    let cur = heads[0].id
    for (const h of heads) if (h.getBoundingClientRect().top <= top) cur = h.id
    mark(cur)
  }, { root: scroller, threshold: [0, 1] })
  heads.forEach((h) => spy!.observe(h))
  ;(scroller ?? window).addEventListener("scroll", () => spy!.takeRecords(), { passive: true })
  mark(heads[0].id)
  const onScroll = () => {
    const top = (scroller ? scroller.getBoundingClientRect().top : 0) + 120
    let cur = heads[0].id
    for (const h of heads) if (h.getBoundingClientRect().top <= top) cur = h.id
    mark(cur)
  }
  ;(scroller ?? window).addEventListener("scroll", onScroll, { passive: true })
}

/* everything that depends on the current page */
function update(animate: boolean) {
  document.querySelectorAll<HTMLAnchorElement>("#nav a[data-section]").forEach((a) => {
    if (a.dataset.section === root.dataset.section) a.setAttribute("aria-current", "page")
    else a.removeAttribute("aria-current")
  })
  label()
  placeBar(animate)
  applyFilter()
  markSelected()
  applyScript()
  watchSections()
}

/* only the middle scrolls, so only the middle is sent back to the top. The window never scrolls on desktop. */
document.addEventListener("astro:after-swap", () => {
  const mid = document.getElementById("middle")
  if (mid) mid.scrollTop = 0
  applyScript() // before first paint, so a remembered script never flashes the wrong one
})
document.addEventListener("astro:page-load", () => update(true))

update(false)
addEventListener("resize", () => placeBar(false))
document.fonts?.ready.then(() => placeBar(false))
