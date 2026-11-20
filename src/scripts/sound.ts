// Link sounds, synthesized with Web Audio. No audio files. Quiet and short, like a mechanical key.
// If it feels loud, lower the master gain, never the duration.

const KEY = "sound"
const reduced = matchMedia("(prefers-reduced-motion: reduce)")
const finePointer = matchMedia("(hover: hover) and (pointer: fine)")

function readPref(): boolean {
  try {
    const v = localStorage.getItem(KEY)
    if (v === "on") return true
    if (v === "off") return false
  } catch { /* storage blocked: fall through to the default */ }
  return !reduced.matches
}

let on = readPref()
let ctx: AudioContext | null = null
let lastTick = 0

// Browsers block audio until the user interacts, so the context is created on first interaction.
function wake() {
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return
    ctx = new Ctor()
  }
  if (ctx.state === "suspended") void ctx.resume()
}
for (const ev of ["pointerdown", "keydown", "touchstart"]) addEventListener(ev, wake, { passive: true })

interface Voice { dur: number; tau: number; band: number; q: number; noise: number; blipHz: number; blip: number; blipDur: number; master: number }
const TICK: Voice = { dur: 0.014, tau: 0.0016, band: 5400, q: 1.8, noise: 0.12, blipHz: 2600, blip: 0.018, blipDur: 0.012, master: 0.38 }
const TAP: Voice = { dur: 0.022, tau: 0.0022, band: 4800, q: 1.4, noise: 0.18, blipHz: 1900, blip: 0.045, blipDur: 0.025, master: 0.42 }

function play(v: Voice) {
  if (!on || !ctx || ctx.state !== "running") return
  const c = ctx
  const t = c.currentTime
  const out = c.createGain()
  out.gain.value = v.master
  out.connect(c.destination)

  const n = Math.max(1, Math.floor(c.sampleRate * v.dur))
  const buf = c.createBuffer(1, n, c.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-(i / c.sampleRate) / v.tau)
  const src = c.createBufferSource()
  src.buffer = buf
  const band = c.createBiquadFilter()
  band.type = "bandpass"
  band.frequency.value = v.band
  band.Q.value = v.q
  const ng = c.createGain()
  ng.gain.value = v.noise
  src.connect(band)
  band.connect(ng)
  ng.connect(out)
  src.start(t)

  const osc = c.createOscillator()
  osc.type = "sine"
  osc.frequency.value = v.blipHz
  const og = c.createGain()
  og.gain.setValueAtTime(v.blip, t)
  og.gain.exponentialRampToValueAtTime(0.0001, t + v.blipDur)
  osc.connect(og)
  og.connect(out)
  osc.start(t)
  osc.stop(t + v.blipDur + 0.01)
}

const hit = (el: EventTarget | null) => (el as Element | null)?.closest?.("a, button") ?? null

// hover tick: mouse only, once per entry into an element, at most one per 90ms
document.addEventListener("pointerover", (e) => {
  if (e.pointerType !== "mouse" || !finePointer.matches) return
  const el = hit(e.target)
  if (!el || hit(e.relatedTarget) === el) return
  const now = performance.now()
  if (now - lastTick < 90) return
  lastTick = now
  play(TICK)
})

// click tap: primary button, on pointerdown. The sound toggle itself stays silent.
document.addEventListener("pointerdown", (e) => {
  if (e.button !== 0 || !e.isPrimary) return
  const el = hit(e.target)
  if (!el || el.id === "sound") return
  play(TAP)
  if (on) try { navigator.vibrate?.(8) } catch { /* unsupported */ }
})

const toggle = document.getElementById("sound") as HTMLButtonElement | null
function paint() {
  if (!toggle) return
  toggle.textContent = on ? "sound on" : "sound off"
  toggle.setAttribute("aria-pressed", String(on))
}
paint()
toggle?.addEventListener("click", () => {
  on = !on
  try { localStorage.setItem(KEY, on ? "on" : "off") } catch { /* private mode: lasts this visit */ }
  paint()
})

export {}
