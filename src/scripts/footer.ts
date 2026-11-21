// Footer widgets: place, temperature and time on the left, now playing in the middle.
// The footer is part of the persistent frame, so this runs once.

import { createVinyl } from "./vinyl"

const footer = document.querySelector<HTMLElement>(".footer")!
const reduced = matchMedia("(prefers-reduced-motion: reduce)")
const { lat, lon, tz, endpoint } = footer.dataset

/* time: 12 hour, am/pm in capitals, updated on the minute boundary */
const timeEl = document.getElementById("time")!
const fmt = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: tz })
let clockTimer = 0
function clock() {
  timeEl.textContent = fmt.format(new Date())
  clearTimeout(clockTimer)
  clockTimer = window.setTimeout(clock, 60000 - (Date.now() % 60000) + 250)
}

/* temperature in °f from Open-Meteo, cached 15 minutes, silently hidden on any failure */
const tempEl = document.getElementById("temp")!
const tempDot = document.getElementById("dot-temp")!
const TEMP_KEY = "temp"
const FIFTEEN = 15 * 60 * 1000
const showTemp = (f: number | null) => {
  const ok = f !== null && Number.isFinite(f)
  tempEl.hidden = tempDot.hidden = !ok
  if (ok) tempEl.textContent = `${Math.round(f as number)}°f`
}
async function temperature() {
  try {
    const cached = JSON.parse(sessionStorage.getItem(TEMP_KEY) ?? "null") as { f: number; at: number } | null
    if (cached && Date.now() - cached.at < FIFTEEN) { showTemp(cached.f); return }
  } catch { /* ignore bad cache */ }
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m&temperature_unit=fahrenheit`
    const res = await fetch(url)
    if (!res.ok) throw new Error(String(res.status))
    const f = (await res.json()).current?.temperature_2m
    if (typeof f !== "number") throw new Error("bad shape")
    showTemp(f)
    try { sessionStorage.setItem(TEMP_KEY, JSON.stringify({ f, at: Date.now() })) } catch { /* storage blocked */ }
  } catch { showTemp(null) }
}

/* now playing: label, title (scrolls only when it does not fit), artist, a moving progress line, and Spotify's own player on request */
interface Playing { isPlaying: boolean; title?: string; artist?: string; url?: string; cover?: string; progressMs?: number; durationMs?: number; ageMs?: number }
const IDLE_TEXT = "Zenith is not listening right now"
const np = document.getElementById("np")!
const npLabel = document.getElementById("np-label")!
const win = np.querySelector<HTMLElement>(".np-win")!
const track = document.getElementById("np-track")!
const artistEl = document.getElementById("np-artist")!
const progress = document.getElementById("np-progress")!
const fill = document.getElementById("np-fill")!
const timeEl2 = document.getElementById("np-time")!
const vinyl = createVinyl(document.getElementById("np-vinyl")!)
const listen = document.getElementById("np-listen") as HTMLButtonElement
const embed = document.getElementById("np-embed")!
let shown = ""
let playing = false
let trackId = ""
let base = 0, dur = 0, t0 = 0 // position (ms) when last heard from the Worker, the song length, and the clock then

function setLabel() {
  npLabel.textContent = !playing ? IDLE_TEXT : embed.hidden === false ? "Listening with Zenith" : "Zenith is listening now"
}

/* the position keeps moving between checks, so the line never waits on the network */
const mmss = (ms: number) => { const s = Math.max(0, Math.floor(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}` }
function tickProgress() {
  if (!playing || !dur) return
  const pos = Math.min(dur, base + (performance.now() - t0))
  fill.style.transform = `scaleX(${(pos / dur).toFixed(4)})`
  timeEl2.textContent = `${mmss(pos)} / ${mmss(dur)}`
}
setInterval(() => { if (!document.hidden) tickProgress() }, 500)

/* Listen with Zenith: Spotify's own player, loaded only when asked (a full song for logged in listeners, a preview for everyone else) */
function setPlayer(open: boolean) {
  listen.setAttribute("aria-expanded", String(open))
  listen.textContent = open ? "Close player" : "Listen with Zenith"
  embed.hidden = !open
  embed.textContent = ""
  setLabel()
  if (!open || !trackId) return
  const f = document.createElement("iframe")
  f.src = `https://open.spotify.com/embed/track/${trackId}?theme=0` // the dark card in both themes: neutral, not tinted by the album
  f.title = "Spotify player"
  f.allow = "encrypted-media; clipboard-write"
  f.loading = "lazy"
  embed.append(f)
}
listen.addEventListener("click", () => setPlayer(embed.hidden === true))

function render(p: Playing | null) {
  const live = !!(p && p.isPlaying && p.title)
  if (live && p!.durationMs) { base = (p!.progressMs ?? 0) + (p!.ageMs ?? 0); dur = p!.durationMs; t0 = performance.now(); tickProgress() }
  const art = live && /^https:\/\/i\.scdn\.co\//.test(p!.cover ?? "") ? p!.cover! : ""
  const key = `${live}|${p?.title}|${p?.artist}|${p?.url ?? ""}|${art}`
  if (key === shown) return
  shown = key
  playing = live
  np.dataset.state = live ? "playing" : "idle"
  win.hidden = !live
  win.classList.remove("run")
  artistEl.hidden = !live || !p?.artist
  artistEl.textContent = live ? (p!.artist ?? "") : ""
  progress.hidden = !live || !dur
  if (!live) fill.style.transform = "scaleX(0)"
  trackId = live ? (/^https:\/\/open\.spotify\.com\/track\/([A-Za-z0-9]+)/.exec(p!.url ?? "")?.[1] ?? "") : ""
  listen.hidden = !trackId
  if (!embed.hidden) setPlayer(!!trackId) // the song changed: reload the player, or close it if nothing is playing
  setLabel()
  vinyl.setState(live ? "speaking" : "idle")
  vinyl.setCover(art || null)
  track.textContent = ""
  track.classList.remove("static")
  track.style.removeProperty("--shift")
  if (!live) return
  const item = () => {
    const link = !!p!.url && /^https:\/\//.test(p!.url)
    const el = document.createElement(link ? "a" : "span")
    el.className = "np-item"
    el.textContent = p!.title!
    if (link) { const a = el as HTMLAnchorElement; a.href = p!.url!; a.target = "_blank"; a.rel = "noopener" }
    return el
  }
  track.append(item())
  if (reduced.matches) { track.classList.add("static"); return } // still, truncated by CSS
  requestAnimationFrame(() => {
    const unit = (track.firstElementChild as HTMLElement).offsetWidth
    if (!unit || unit - 56 <= win.clientWidth) { track.classList.add("static"); return } // fits: it stays still
    win.classList.add("run")
    // enough copies that the strip always covers the window, so the loop has no gap
    for (let i = 1; i < Math.ceil(win.clientWidth / unit) + 1; i++) {
      const copy = item()
      copy.setAttribute("aria-hidden", "true")
      copy.setAttribute("tabindex", "-1")
      track.append(copy)
    }
    track.style.setProperty("--shift", `${unit}px`)
    track.style.setProperty("--dur", `${Math.max(8, unit / 45)}s`) // steady speed, about 45px a second
  })
}

async function nowPlaying() {
  try {
    if (!endpoint) { render(null); return } // not connected to Spotify yet
    const ctl = new AbortController()
    const timer = setTimeout(() => ctl.abort(), 6000)
    const res = await fetch(endpoint, { signal: ctl.signal, headers: { accept: "application/json" } })
    clearTimeout(timer)
    if (!res.ok) throw new Error(String(res.status))
    render(await res.json())
  } catch { render(null) }
}

/* schedule, and catch up after a tab sleeps */
let npTimer = 0
function pollNowPlaying() {
  clearInterval(npTimer)
  void nowPlaying()
  npTimer = window.setInterval(() => { if (!document.hidden) void nowPlaying() }, 5000)
}
document.addEventListener("visibilitychange", () => {
  if (document.hidden) return
  clock()
  void temperature()
  pollNowPlaying()
})

clock()
void temperature()
pollNowPlaying()

export {}
