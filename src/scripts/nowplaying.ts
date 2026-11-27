// Now playing: a compact block that exists only while Zenith is actually listening.
// It lives inside the persisted right panel, so this module runs once per session and the poll never restarts.

const np = document.getElementById("np")!
const link = document.getElementById("np-link") as HTMLAnchorElement
const cover = document.getElementById("np-cover") as HTMLImageElement
const titleEl = document.getElementById("np-title")!
const artistEl = document.getElementById("np-artist")!
const marq = document.getElementById("np-marq")!
const track = document.getElementById("np-track")!
const endpoint = np.dataset.endpoint ?? ""
const POLL = 5_000 // the Worker answers from a 4s memo, so this is as fresh as Spotify allows without a push channel
const FADE = 200

interface Playing { isPlaying: boolean; title?: string; artist?: string; url?: string; cover?: string }
let visible = false
let hideTimer = 0
let timer = 0
let misses = 0 // consecutive failed checks; a network blip must not make it flicker away

/* Phone bar: if "Song · Artist" does not fit on its one line, scroll it slowly back and forth (24px/s,
   pausing at both ends). With reduced motion it stays still and ends in an ellipsis instead. */
const SPEED = 24
function fit() {
  marq.classList.remove("scroll")
  if (!matchMedia("(max-width: 767px)").matches || matchMedia("(prefers-reduced-motion: reduce)").matches) return
  const over = track.offsetWidth - marq.clientWidth
  if (over > 1) {
    marq.style.setProperty("--shift", `${-over}px`)
    marq.style.setProperty("--dur", `${Math.max(6, (over / SPEED) * 2 + 3)}s`)
    marq.classList.add("scroll")
  }
}
addEventListener("resize", fit)

function show(p: Playing) {
  link.href = p.url!
  cover.src = p.cover ?? ""
  cover.hidden = !p.cover
  titleEl.textContent = p.title!
  artistEl.textContent = p.artist ?? ""
  clearTimeout(hideTimer)
  if (visible) { requestAnimationFrame(fit); return }
  visible = true
  np.hidden = false
  void np.offsetWidth // let the browser register opacity 0 before fading to 1
  np.classList.add("on")
  requestAnimationFrame(fit)
}
function hide() {
  if (!visible) return
  visible = false
  np.classList.remove("on")
  hideTimer = window.setTimeout(() => { np.hidden = true }, FADE)
}

async function poll() {
  if (document.hidden || !endpoint) return
  try {
    const res = await fetch(endpoint, { cache: "no-store" })
    if (!res.ok) throw new Error(String(res.status))
    const p = (await res.json()) as Playing
    misses = 0
    const ok = p.isPlaying && p.title && typeof p.url === "string" && p.url.startsWith("https://open.spotify.com/")
    if (ok) show({ ...p, cover: p.cover?.startsWith("https://i.scdn.co/") ? p.cover : "" })
    else hide() // it goes away only when nothing is playing
  } catch {
    if (++misses >= 3) hide() // keep what is showing through a brief outage
  }
}

console.info("now-playing: started")
void poll()
timer = window.setInterval(poll, POLL)
document.addEventListener("visibilitychange", () => { if (!document.hidden) void poll() })
addEventListener("focus", () => void poll())
addEventListener("online", () => void poll())
void timer
export {}
