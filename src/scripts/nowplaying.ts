// Now playing: a compact block that exists only while Zenith is actually listening.
// It lives inside the persisted right panel, so this module runs once per session and the poll never restarts.

const np = document.getElementById("np")!
const link = document.getElementById("np-link") as HTMLAnchorElement
const cover = document.getElementById("np-cover") as HTMLImageElement
const titleEl = document.getElementById("np-title")!
const artistEl = document.getElementById("np-artist")!
const closeBtn = document.getElementById("np-x")!
const endpoint = np.dataset.endpoint ?? ""
const POLL = 30_000
const FADE = 200

interface Playing { isPlaying: boolean; title?: string; artist?: string; url?: string; cover?: string }
let visible = false
let hideTimer = 0
let timer = 0
const dismissed = () => { try { return sessionStorage.getItem("np-x") === "1" } catch { return false } }

function show(p: Playing) {
  link.href = p.url!
  cover.src = p.cover ?? ""
  cover.hidden = !p.cover
  titleEl.textContent = p.title!
  artistEl.textContent = p.artist ?? ""
  clearTimeout(hideTimer)
  if (visible) return
  visible = true
  np.hidden = false
  void np.offsetWidth // let the browser register opacity 0 before fading to 1
  np.classList.add("on")
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
    const ok = p.isPlaying && p.title && typeof p.url === "string" && p.url.startsWith("https://open.spotify.com/")
    if (ok) show({ ...p, cover: p.cover?.startsWith("https://i.scdn.co/") ? p.cover : "" })
    else hide()
  } catch { hide() } // any failure means nothing is shown, never a placeholder
}

closeBtn.addEventListener("click", () => {
  try { sessionStorage.setItem("np-x", "1") } catch { /* lasts until reload */ }
  np.classList.add("dismissed")
})
if (dismissed()) np.classList.add("dismissed")

console.info("now-playing: started")
void poll()
timer = window.setInterval(poll, POLL)
document.addEventListener("visibilitychange", () => { if (!document.hidden) void poll() })
void timer
export {}
