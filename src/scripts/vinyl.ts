// Holo Vinyl: a holographic ring of grooves around a spinning record, on one canvas, no dependencies.
// Ported from the React component. The record label shows the album cover when there is one.
//
//   const vinyl = createVinyl(host)
//   vinyl.setState("speaking")      // "idle" | "thinking" | "speaking"
//   vinyl.setCover(url | null)
//
// idle: the record stops, the ring is quiet, a faint glint passes now and then.
// thinking: a comet with a rainbow tail runs round the ring, the record spins faster.
// speaking: two mirrored rainbow spots run round the ring, the record swells with a gentle simulated pulse.
// States blend into each other over 0.7s. Nothing is drawn while off screen, the tab is hidden, or idle and still.

export type VinylState = "idle" | "thinking" | "speaking"
export interface Vinyl { setState(s: VinylState): void; setCover(url: string | null): void }

const TAU = Math.PI * 2
const N = 200 // strokes in the ring
const BLEND = 0.7 // seconds for one state to flow into another
const STATES: VinylState[] = ["idle", "thinking", "speaking"]

const CO = new Float32Array(N), SI = new Float32Array(N), HUE = new Float32Array(N)
for (let i = 0; i < N; i++) {
  const a = (i / N) * TAU - Math.PI / 2
  CO[i] = Math.cos(a)
  SI[i] = Math.sin(a)
  HUE[i] = (i / N) * 720 // two rainbows round the ring
}
const ang = (a: number) => Math.atan2(Math.sin(a), Math.cos(a))
const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2)
const approach = (v: number, to: number, rate: number, dt: number) => v + (to - v) * (1 - Math.exp(-rate * dt)) // same feel at any frame rate
const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

// proportions in a 320 unit box, scaled to the real size
const R = 150, R0 = R * 0.6, R1 = R * 0.92, LR = R * 0.42

interface Bitmaps { grooves: HTMLCanvasElement; label: HTMLCanvasElement; px: number }

function makeCanvas(w: number, h: number) {
  const c = document.createElement("canvas")
  c.width = Math.max(1, Math.ceil(w))
  c.height = Math.max(1, Math.ceil(h))
  return c
}

// grooves and the label are static: drawn once per size, color or cover change
function bake(px: number, ink: string, sub: string, accent: string, cover: HTMLImageElement | null): Bitmaps {
  const GS = 1.1 // a little larger, so the grooves can swell
  const grooves = makeCanvas(320 * px * GS, 320 * px * GS)
  const g = grooves.getContext("2d")
  if (g) {
    g.setTransform(px * GS, 0, 0, px * GS, grooves.width / 2, grooves.height / 2)
    for (let j = 0; j < 20; j++) {
      g.beginPath()
      g.arc(0, 0, R * (0.45 + j * 0.0065), 0, TAU)
      const major = j % 5 === 0
      g.lineWidth = major ? 0.55 : 0.28
      g.strokeStyle = major ? ink : sub
      g.globalAlpha = major ? 0.85 : 0.6
      g.stroke()
    }
  }
  const LS = 1.6 // oversampled, so the cover stays crisp when it swells
  const label = makeCanvas(LR * 2 * px * LS + 4, LR * 2 * px * LS + 4)
  const l = label.getContext("2d")
  if (l) {
    l.setTransform(px * LS, 0, 0, px * LS, label.width / 2, label.height / 2)
    l.save()
    l.beginPath()
    l.arc(0, 0, LR, 0, TAU)
    l.clip()
    if (cover && cover.complete && cover.naturalWidth) l.drawImage(cover, -LR, -LR, LR * 2, LR * 2)
    else { l.fillStyle = accent; l.fillRect(-LR, -LR, LR * 2, LR * 2) }
    l.restore()
    l.beginPath()
    l.arc(0, 0, LR * 0.985, 0, TAU)
    l.lineWidth = 0.6
    l.strokeStyle = "rgba(255,255,255,.55)"
    l.stroke()
    // spindle hole
    l.globalCompositeOperation = "destination-out"
    l.beginPath()
    l.arc(0, 0, R * 0.035, 0, TAU)
    l.fill()
    l.globalCompositeOperation = "source-over"
  }
  return { grooves, label, px }
}

export function createVinyl(host: HTMLElement): Vinyl {
  const cv = document.createElement("canvas")
  cv.style.cssText = "display:block;width:100%;height:100%"
  host.append(cv)
  const ctx = cv.getContext("2d")!
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches

  // probes resolve the site's CSS variables to real colors
  const probe = (v: string) => {
    const s = document.createElement("span")
    s.style.cssText = `position:absolute;width:0;height:0;overflow:hidden;color:var(${v})`
    host.append(s)
    return s
  }
  const pInk = probe("--fg"), pSub = probe("--muted"), pAcc = probe("--accent")

  let css = 0, px = 1, bm: Bitmaps | null = null
  let ink = "#1a1b1f", sub = "#979797", accent = "#89AEE8", hueL = 52, quietA = 0.28
  let cover: HTMLImageElement | null = null, coverToken = 0

  const readColors = () => {
    ink = getComputedStyle(pInk).color
    sub = getComputedStyle(pSub).color
    accent = getComputedStyle(pAcc).color
    const m = sub.match(/\d+(\.\d+)?/g)
    const lum = m ? (0.299 * +m[0] + 0.587 * +m[1] + 0.114 * +m[2]) / 255 : 0.4
    const darkBg = lum > 0.5 // a light grey "muted" means a dark page
    hueL = darkBg ? 62 : 52
    quietA = darkBg ? 0.34 : 0.28
  }
  const rebake = () => {
    if (!css) return
    readColors()
    bm = bake(px, ink, sub, accent, cover)
    dirty = true
    start()
  }
  const resize = () => {
    const w = host.getBoundingClientRect().width
    if (!w) return
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const next = (w / 320) * dpr
    if (w === css && Math.abs(next - px) < 1e-3) return
    css = w
    px = next
    cv.width = Math.round(w * dpr)
    cv.height = Math.round(w * dpr)
    rebake()
  }

  // animation state
  const W: Record<VinylState, number> = { idle: 1, thinking: 0, speaking: 0 }
  let state: VinylState = "idle"
  let t = 0, lastT = -1, raf = 0, onScreen = true, dirty = true
  let lvl = 0, act = 0, eS = 0, core = 1
  let ampS = 0.5, vS = 0.35, Ls = 0, Lc = 0, Li = 0, spin = 0, spinV = 0
  const M = new Float32Array(N)

  const kOf = (s: VinylState, a: number) => {
    if (s === "idle") {
      const g = Math.pow(Math.max(0, Math.sin(t * 0.8)), 6)
      if (g < 0.002) return 0
      const d = ang(a - Li), d2 = ang(a - Li - Math.PI)
      return 0.75 * g * Math.max(Math.exp((-d * d) / 0.03), Math.exp((-d2 * d2) / 0.03))
    }
    if (s === "thinking") {
      const d = ang(a - Lc)
      return d <= 0 ? 0.95 * Math.exp(d * 2.4) : Math.exp((-d * d) / 0.004)
    }
    const sp = ampS * ampS * 0.18, d = ang(a - Ls), d2 = ang(a - Ls - Math.PI)
    return Math.max(Math.exp((-d * d) / sp), Math.exp((-d2 * d2) / sp))
  }

  const draw = () => {
    if (!bm) return
    ctx.setTransform(px, 0, 0, px, 0, 0)
    ctx.clearRect(0, 0, 320, 320)
    const C = 160
    const ks = STATES.filter((s) => W[s] > 0.001), ew = ks.map((s) => ease(W[s])), tw = ew.reduce((x, y) => x + y, 0) || 1
    for (let i = 0; i < N; i++) {
      const a = (i / N) * TAU - Math.PI / 2
      let k = 0
      for (let q = 0; q < ks.length; q++) k += ew[q] * kOf(ks[q], a)
      k = clamp01(k / tw)
      M[i] = k * k * (3 - 2 * k) // smooth, never a hard on or off
    }
    // quiet strokes: one batch
    ctx.beginPath()
    for (let i = 0; i < N; i++) {
      if (M[i] >= 0.02) continue
      ctx.moveTo(C + R0 * CO[i], C + R0 * SI[i])
      ctx.lineTo(C + R1 * CO[i], C + R1 * SI[i])
    }
    ctx.strokeStyle = sub
    ctx.globalAlpha = quietA + 0.25 * act
    ctx.lineWidth = 0.65
    ctx.stroke()
    // lit strokes: color slides from grey to rainbow with the light
    const hs = t * 30, wb = 2.9 + eS * 1.6
    for (let i = 0; i < N; i++) {
      const m = M[i]
      if (m < 0.02) continue
      ctx.beginPath()
      ctx.moveTo(C + R0 * CO[i], C + R0 * SI[i])
      ctx.lineTo(C + R1 * CO[i], C + R1 * SI[i])
      ctx.strokeStyle = `hsl(${(HUE[i] + hs) % 360 | 0},${(3 + 85 * m) | 0}%,${(38 + (hueL - 38) * m) | 0}%)`
      ctx.globalAlpha = quietA + 0.25 * act + (1 - quietA - 0.25 * act) * m
      ctx.lineWidth = (1.3 + m * wb) / 2
      ctx.stroke()
    }
    ctx.globalAlpha = 0.7
    ctx.beginPath()
    ctx.arc(C, C, R * 0.985, 0, TAU)
    ctx.lineWidth = 0.6
    ctx.strokeStyle = sub
    ctx.stroke()
    // grooves and label from bitmaps
    const sc = 1 + eS * 0.06, gw = 320 * 1.1 * sc
    ctx.globalAlpha = 0.55 + 0.45 * act
    ctx.drawImage(bm.grooves, C - gw / 2, C - gw / 2, gw, gw)
    ctx.globalAlpha = 1
    ctx.translate(C, C)
    ctx.rotate(spin)
    const lw = (bm.label.width / bm.px / 1.6) * core
    ctx.drawImage(bm.label, -lw / 2, -lw / 2, lw, lw)
  }

  const tick = (now: number) => {
    raf = 0
    const dt = lastT < 0 ? 1 / 60 : Math.min(0.05, (now - lastT) / 1000) // a long gap never turns into a jump
    lastT = now
    const s = state
    t += dt
    for (const k of STATES) W[k] = k === s ? Math.min(1, W[k] + dt / BLEND) : Math.max(0, W[k] - dt / BLEND)
    // no microphone here: a slow, soft pulse stands in for the voice
    const pulse = clamp01(0.45 + 0.22 * Math.sin(t * 2.3) + 0.15 * Math.sin(t * 5.1 + 1.3) + 0.1 * Math.sin(t * 9.7))
    lvl = approach(lvl, s === "speaking" ? pulse : 0, 11, dt)
    act = approach(act, s === "idle" ? 0 : 1, 2, dt)
    eS = approach(eS, s === "speaking" ? lvl : 0, s === "speaking" ? 8 : 2.5, dt)
    if (s === "speaking") {
      vS = approach(vS, 0.35 + lvl * 1.1, 3, dt)
      ampS = approach(ampS, 0.5 + lvl, 8, dt)
    }
    Ls += dt * vS
    Lc += dt * (reduce ? 1.1 : 2.2)
    Li += dt * 0.22
    const coreT = s === "speaking" ? 1 + lvl * 0.1 : s === "thinking" ? 1 + 0.03 * Math.sin(t * 5) : 1
    core = approach(core, coreT, 7, dt)
    spinV = approach(spinV, reduce || s === "idle" ? 0 : s === "thinking" ? 1.3 : 0.4 + eS * 0.5, 2, dt)
    spin = (spin + dt * spinV) % TAU
    const still =
      s === "idle" && W.idle >= 1 && Math.pow(Math.max(0, Math.sin(t * 0.8)), 6) < 0.002 &&
      spinV < 0.002 && act < 0.002 && Math.abs(core - coreT) < 0.001 && eS < 0.001
    if (!still || dirty) {
      draw()
      dirty = false
    }
    if (onScreen && !document.hidden) raf = requestAnimationFrame(tick)
  }
  function start() {
    if (!raf && onScreen && !document.hidden) {
      lastT = -1
      raf = requestAnimationFrame(tick)
    }
  }
  const stop = () => {
    if (raf) cancelAnimationFrame(raf)
    raf = 0
  }

  resize()
  new ResizeObserver(resize).observe(host)
  new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; onScreen ? start() : stop() }).observe(host)
  document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()))
  // recolor when the page switches between light and dark
  new MutationObserver(rebake).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "class", "style"] })
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", rebake)
  start()

  return {
    setState(s) {
      if (s === state) return
      state = s
      dirty = true
      start()
    },
    setCover(url) {
      const token = ++coverToken
      if (!url) { cover = null; rebake(); return }
      const img = new Image()
      img.decoding = "async"
      img.onload = () => { if (token === coverToken) { cover = img; rebake() } }
      img.onerror = () => { if (token === coverToken) { cover = null; rebake() } }
      img.src = url
    },
  }
}
