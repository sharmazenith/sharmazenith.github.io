// Footer widgets: place, temperature and time.
// The footer is part of the persistent frame, so this runs once.

const footer = document.querySelector<HTMLElement>(".footer")!
const { lat, lon, tz } = footer.dataset

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

document.addEventListener("visibilitychange", () => {
  if (document.hidden) return
  clock()
  void temperature()
})

clock()
void temperature()

export {}
