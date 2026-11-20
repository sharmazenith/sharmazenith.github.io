// Persistent frame: header, intro panel and footer are never replaced.
// Only #pane (or #list inside it, when moving between shayari and notes) changes.

import "./sound"
import "./footer"

const root = document.documentElement
const pane = document.getElementById("pane") as HTMLElement
const reduced = matchMedia("(prefers-reduced-motion: reduce)")
const pages = new Map<string, Document>()
let token = 0

/* underlines that slide along a hairline */
function place(bar: HTMLElement | null, host: HTMLElement | null, animate: boolean) {
  if (!bar || !host) return
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
function placeAll(animate: boolean) {
  place(document.getElementById("nav-bar"), document.getElementById("nav"), animate)
  place(document.getElementById("tab-bar"), document.querySelector<HTMLElement>(".tabset"), animate)
}

/* opacity only fades */
const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, reduced.matches ? 0 : ms))
async function fade(el: HTMLElement, to: 0 | 1, ms: number) {
  el.style.transition = reduced.matches ? "none" : `opacity ${ms}ms var(--ease)`
  el.style.opacity = String(to)
  await wait(ms)
}

async function fetchPage(path: string): Promise<Document | null> {
  const hit = pages.get(path)
  if (hit) return hit
  try {
    const res = await fetch(path, { headers: { accept: "text/html" } })
    if (!res.ok) return null
    const doc = new DOMParser().parseFromString(await res.text(), "text/html")
    pages.set(path, doc)
    return doc
  } catch { return null }
}

async function go(href: string, push: boolean) {
  const url = new URL(href, location.href)
  const me = ++token
  const doc = await fetchPage(url.pathname)
  if (me !== token) return
  if (!doc || !doc.getElementById("pane")) { location.href = url.href; return }

  const listOnly = !!(doc.getElementById("tabs") && document.getElementById("tabs") && doc.getElementById("list"))
  const target = document.getElementById(listOnly ? "list" : "pane") as HTMLElement
  const incoming = doc.getElementById(listOnly ? "list" : "pane") as HTMLElement

  // keep the list at least as tall as it was, so the page height (and scroll position) cannot change
  if (listOnly) target.style.minHeight = `${target.offsetHeight}px`
  await fade(target, 0, 100)
  if (me !== token) { target.style.opacity = "1"; return }

  target.innerHTML = incoming.innerHTML
  if (listOnly) {
    document.querySelectorAll<HTMLAnchorElement>(".tabset .tab").forEach((a) => {
      const next = doc.querySelector(`.tabset .tab[href="${a.getAttribute("href")}"]`)
      if (next?.getAttribute("aria-current")) a.setAttribute("aria-current", "page")
      else a.removeAttribute("aria-current")
    })
  } else {
    pane.dataset.section = doc.getElementById("pane")!.dataset.section ?? "home"
    window.scrollTo(0, 0) // hidden while the pane is at zero opacity
  }

  document.title = doc.title
  const crumbs = document.getElementById("crumbs")
  const nextCrumbs = doc.getElementById("crumbs")
  if (crumbs && nextCrumbs) crumbs.innerHTML = nextCrumbs.innerHTML
  document.querySelectorAll<HTMLAnchorElement>("#nav a[data-section]").forEach((a) => {
    if (a.dataset.section === pane.dataset.section) a.setAttribute("aria-current", "page")
    else a.removeAttribute("aria-current")
  })
  if (push) history.pushState(null, "", url.pathname)

  // the nav underline always slides; the tab underline slides only when the tab bar stayed put
  place(document.getElementById("nav-bar"), document.getElementById("nav"), true)
  place(document.getElementById("tab-bar"), document.querySelector<HTMLElement>(".tabset"), listOnly)
  if (!listOnly) pane.focus({ preventScroll: true })
  await fade(target, 1, 160)
  target.style.transition = ""
}

document.addEventListener("click", (e) => {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
  const a = (e.target as Element).closest("a")
  if (!a || a.target || a.hasAttribute("download") || a.origin !== location.origin) return
  if (a.pathname === location.pathname && a.hash) return
  const rel = a.getAttribute("href") ?? ""
  if (rel.startsWith("#") || /\.[a-z0-9]+$/i.test(a.pathname)) return // in-page anchors and files (pdf) load natively
  e.preventDefault()
  if (a.pathname === location.pathname) return
  void go(a.pathname, true)
})
addEventListener("popstate", () => void go(location.pathname, false))
history.scrollRestoration = "manual"

/* theme */
const themeBtn = document.getElementById("theme") as HTMLButtonElement
const label = () => themeBtn.setAttribute("aria-label", root.dataset.theme === "dark" ? "switch to light theme" : "switch to dark theme")
label()
themeBtn.addEventListener("click", () => {
  const next = root.dataset.theme === "dark" ? "light" : "dark"
  root.dataset.theme = next
  try { localStorage.setItem("theme", next) } catch { /* private mode: choice lasts for this visit */ }
  label()
})

/* before that: fold */
document.addEventListener("click", (e) => {
  const btn = (e.target as Element).closest<HTMLButtonElement>("#before-btn")
  if (!btn) return
  const open = btn.getAttribute("aria-expanded") !== "true"
  btn.setAttribute("aria-expanded", String(open))
  document.getElementById("before")?.setAttribute("data-open", String(open))
})

/* write to me */
const writeBtn = document.getElementById("write") as HTMLButtonElement
const menu = document.getElementById("write-menu") as HTMLElement
const toast = document.getElementById("toast") as HTMLElement
let toastTimer = 0
const setMenu = (open: boolean) => {
  menu.hidden = !open
  writeBtn.setAttribute("aria-expanded", String(open))
}
writeBtn.addEventListener("click", () => { toast.hidden = true; setMenu(menu.hidden === true) })
document.addEventListener("click", (e) => {
  if (!menu.hidden && !(e.target as Element).closest(".write")) setMenu(false)
})
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !menu.hidden) { setMenu(false); writeBtn.focus() }
})
function say(text: string) {
  toast.textContent = text
  toast.hidden = false
  clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => { toast.hidden = true }, 2400)
}
document.getElementById("copy-email")?.addEventListener("click", async (e) => {
  const email = (e.currentTarget as HTMLElement).dataset.email ?? ""
  setMenu(false)
  try { await navigator.clipboard.writeText(email); say("copied") }
  catch { say(`couldn't copy. the email is ${email}`) }
})

/* first placement without animation, then keep it right on resize and font load */
placeAll(false)
addEventListener("resize", () => placeAll(false))
document.fonts?.ready.then(() => placeAll(false))
