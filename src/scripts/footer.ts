// Footer widgets: place, temperature and time on the left, now playing in the middle.
// The footer is part of the persistent frame, so this runs once.

const footer = document.querySelector<HTMLElement>(".footer")!
const reduced = matchMedia("(prefers-reduced-motion: reduce)")
const { lat, lon, tz, endpoint, mock } = footer.dataset

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

/* now playing */
interface Playing { isPlaying: boolean; title?: string; artist?: string; url?: string }
const np = document.getElementById("np")!
const win = np.querySelector<HTMLElement>(".np-win")!
const track = document.getElementById("np-track")!
let shown = ""

function render(p: Playing | null) {
  const playing = !!(p && p.isPlaying && p.title)
  const text = playing ? `${p!.title}${p!.artist ? ` · ${p!.artist}` : ""}` : "Not playing"
  const key = `${playing}|${text}|${p?.url ?? ""}`
  if (key === shown) return
  shown = key
  np.dataset.state = playing ? "playing" : "idle"
  win.classList.remove("run")
  track.style.removeProperty("--shift")
  track.textContent = ""
  const label = () => {
    if (playing && p!.url && /^https:\/\//.test(p!.url)) {
      const a = document.createElement("a")
      a.href = p!.url
      a.target = "_blank"
      a.rel = "noopener"
      a.textContent = text
      return a
    }
    const s = document.createElement("span")
    s.textContent = text
    return s
  }
  track.append(label())
  if (reduced.matches) return // static, truncated by CSS
  requestAnimationFrame(() => {
    if (track.scrollWidth <= win.clientWidth) return
    const gap = document.createElement("span")
    gap.className = "np-gap"
    gap.setAttribute("aria-hidden", "true")
    const copy = label()
    copy.setAttribute("aria-hidden", "true")
    copy.setAttribute("tabindex", "-1")
    const first = track.firstElementChild as HTMLElement
    track.style.setProperty("--shift", `${first.offsetWidth + 40}px`)
    track.append(gap, copy)
    win.classList.add("run")
  })
}

async function nowPlaying() {
  try {
    if (!endpoint) { render(JSON.parse(mock ?? "null")); return } // TODO mock until the endpoint is set
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
  npTimer = window.setInterval(() => { if (!document.hidden) void nowPlaying() }, 30000)
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
