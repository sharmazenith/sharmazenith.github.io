// Cloudflare Worker: sign-in and publishing for the Elsewhere section.
// The site itself stays static on GitHub Pages. This Worker is the only part that holds secrets:
//   GITHUB_TOKEN               fine grained token, this one repo only, Contents: read and write
//   GITHUB_OAUTH_CLIENT_SECRET GitHub OAuth app secret
//   SESSION_SECRET             long random string used to sign session tokens
// Plain variables (wrangler.admin.toml): GITHUB_REPO, GITHUB_BRANCH, ADMIN_GITHUB_LOGIN, GITHUB_OAUTH_CLIENT_ID, SITE_ORIGIN
// See worker/ADMIN.md for setup.
//
// Routes
//   GET  /login          start GitHub sign-in
//   GET  /callback       finish sign-in; only ADMIN_GITHUB_LOGIN gets a session (403 otherwise)
//   GET  /me             who the token belongs to
//   GET  /pieces         list pieces (including drafts)
//   GET  /piece?slug=    one piece plus its current file SHA
//   POST /publish        create a piece (commit)
//   PUT  /piece          edit a piece; needs the SHA it was loaded with, else 409 "stale"
//   POST /unpublish      set draft: true; needs the SHA
//
// Why a bearer token and not a cookie: the site (github.io) and this Worker (workers.dev) are different
// sites, so a SameSite=Strict cookie would never be sent. The token is signed, expires in 30 days, and every
// browser request is also checked against SITE_ORIGIN.

const DIR = "src/content/elsewhere"
const TYPES = ["shayari", "note", "essay", "quote"]
const LANGS = ["hi", "ur", "en"]
const PRIMARY = { hi: "devanagari", ur: "roman", en: "english" } // the text the original language requires
const DAY = 86400
const RATE_LIMIT = 20
const rate = new Map() // per isolate fallback; bind a KV namespace named RATE for a limit shared across isolates

const enc = new TextEncoder()
const dec = new TextDecoder()

/* ---------- small helpers ---------- */
const b64url = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
const fromB64url = (s) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0))
const hmacKey = (secret, usage) => crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, usage)
export async function sign(payload, secret) {
  const body = b64url(enc.encode(JSON.stringify(payload)))
  const sig = await crypto.subtle.sign("HMAC", await hmacKey(secret, ["sign"]), enc.encode(body))
  return `${body}.${b64url(sig)}`
}
export async function verify(token, secret) {
  try {
    const [body, sig] = String(token).split(".")
    if (!body || !sig) return null
    const ok = await crypto.subtle.verify("HMAC", await hmacKey(secret, ["verify"]), fromB64url(sig), enc.encode(body))
    if (!ok) return null
    const p = JSON.parse(dec.decode(fromB64url(body)))
    return p.exp > Date.now() / 1000 ? p : null
  } catch { return null }
}
const toBase64 = (text) => { const bytes = enc.encode(text); let s = ""; for (let i = 0; i < bytes.length; i += 8192) s += String.fromCharCode(...bytes.subarray(i, i + 8192)); return btoa(s) }
const fromBase64 = (b64) => dec.decode(Uint8Array.from(atob(b64.replace(/\n/g, "")), (c) => c.charCodeAt(0)))

const allowedOrigins = (env) => [env.SITE_ORIGIN, "http://localhost:3000", "http://localhost:4321"].filter(Boolean)
function cors(request, env) {
  const origin = request.headers.get("Origin")
  const h = { vary: "Origin", "access-control-allow-methods": "GET, POST, PUT, OPTIONS", "access-control-allow-headers": "authorization, content-type", "access-control-max-age": "600" }
  if (origin && allowedOrigins(env).includes(origin)) h["access-control-allow-origin"] = origin
  return h
}
const json = (body, status, headers) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store", ...headers } })

/* ---------- input: validated like the content collection's zod schema, then cleaned to plain text ---------- */
const clean = (s) => String(s ?? "").replace(/\r\n?/g, "\n").replace(/<[^>]*>/g, "").replace(/[<>]/g, "").replace(/\u0000/g, "").trim()
const validDate = (d) => /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(Date.parse(d + "T00:00:00Z"))

export function validate(input) {
  const errors = []
  const f = {
    type: input?.type, lang: input?.lang, date: String(input?.date ?? ""), draft: input?.draft === true,
    title: clean(input?.title), attribution: clean(input?.attribution),
    devanagari: clean(input?.devanagari), roman: clean(input?.roman), english: clean(input?.english),
  }
  if (!TYPES.includes(f.type)) errors.push("type must be shayari, note, essay or quote")
  if (!LANGS.includes(f.lang)) errors.push("language must be hi, ur or en")
  if (!validDate(f.date)) errors.push("date must be YYYY-MM-DD")
  for (const k of ["title", "attribution"]) if (f[k].length > 200) errors.push(`${k} is too long`)
  for (const k of ["devanagari", "roman", "english"]) if (f[k].length > 20000) errors.push(`${k} is too long`)
  if (LANGS.includes(f.lang) && !f[PRIMARY[f.lang]]) errors.push(`the ${PRIMARY[f.lang]} text is required for this language`)
  if ((f.type === "note" || f.type === "essay") && !f.title) errors.push("a title is required for notes and essays")
  if (f.type !== "quote") f.attribution = ""
  return { errors, f }
}

/* ---------- the file: frontmatter plus body, in the shape the content collection expects ---------- */
const block = (key, text) => `${key}: |\n${text.split("\n").map((l) => (l ? "  " + l : "")).join("\n")}\n`
export function toMdx(f) {
  const prose = f.type === "note" || f.type === "essay"
  let out = "---\n"
  if (f.title) out += `title: ${JSON.stringify(f.title)}\n`
  out += `type: ${f.type}\ndate: ${f.date}\nlang: ${f.lang}\n`
  if (f.attribution) out += `attribution: ${JSON.stringify(f.attribution)}\n`
  if (f.draft) out += "draft: true\n"
  let body = ""
  if (prose) {
    // MDX reads { } and < > as code, so plain text is escaped: one stray brace would break the whole site build
    body = f[PRIMARY[f.lang]].replace(/[{}]/g, (c) => "\\" + c)
  } else {
    for (const k of ["devanagari", "roman", "english"]) if (f[k]) out += block(k, f[k])
  }
  return out + "---\n" + (body ? body + "\n" : "")
}
// reads files this Worker wrote, and tolerant enough for hand written ones
export function fromMdx(text) {
  const m = text.replace(/\r/g, "").match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/)
  if (!m) return null
  const f = { type: "", lang: "en", date: "", draft: false, title: "", attribution: "", devanagari: "", roman: "", english: "" }
  const lines = m[1].split("\n")
  for (let i = 0; i < lines.length; i++) {
    const kv = lines[i].match(/^(\w+):\s*(.*)$/)
    if (!kv) continue
    const [, k, v] = kv
    let val = v
    if (v === "|" || v === "|-") {
      const buf = []
      while (i + 1 < lines.length && (/^\s/.test(lines[i + 1]) || lines[i + 1] === "")) buf.push(lines[++i].replace(/^ {2}/, ""))
      val = buf.join("\n").trim()
    } else if (v.startsWith('"')) { try { val = JSON.parse(v) } catch { val = v } }
    else if (k === "draft") val = v.trim() === "true"
    if (k in f) f[k] = val
  }
  const body = m[2].trim()
  if (body && (f.type === "note" || f.type === "essay")) f[PRIMARY[f.lang]] = body.replace(/\\([{}])/g, "$1")
  return f
}

export function slugify(f, taken) {
  const firstLine = (t) => (t || "").split("\n").find((l) => l.trim()) || ""
  const source = f.title || firstLine(f.roman) || firstLine(f.english) || `${f.type}-${f.date}`
  let base = source.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60).replace(/-+$/, "")
  if (!base) base = `${f.type}-${f.date}`
  let slug = base, n = 1
  while (taken.has(slug)) slug = `${base}-${++n}`
  return slug
}

/* ---------- GitHub ---------- */
const gh = (env, path, init = {}) =>
  fetch(`https://api.github.com${path}`, {
    ...init,
    headers: { authorization: `Bearer ${env.GITHUB_TOKEN}`, accept: "application/vnd.github+json", "x-github-api-version": "2022-11-28", "user-agent": "elsewhere-admin", ...(init.headers ?? {}) },
  })
const repoPath = (env, file) => `/repos/${env.GITHUB_REPO}/contents/${DIR}/${file}`
async function listFiles(env) {
  const res = await gh(env, `${repoPath(env, "").replace(/\/$/, "")}?ref=${encodeURIComponent(env.GITHUB_BRANCH)}`)
  if (res.status === 404) return []
  if (!res.ok) throw new Error("list failed")
  return (await res.json()).filter((x) => x.type === "file" && /\.(mdx?|md)$/.test(x.name))
}
const slugOf = (name) => name.replace(/\.mdx?$/, "")
async function readFile(env, slug) {
  for (const ext of ["mdx", "md"]) {
    const res = await gh(env, `${repoPath(env, `${slug}.${ext}`)}?ref=${encodeURIComponent(env.GITHUB_BRANCH)}`)
    if (res.ok) { const j = await res.json(); return { name: `${slug}.${ext}`, sha: j.sha, text: fromBase64(j.content) } }
  }
  return null
}
async function writeFile(env, name, text, message, sha) {
  const res = await gh(env, repoPath(env, name), { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ message, content: toBase64(text), branch: env.GITHUB_BRANCH, ...(sha ? { sha } : {}) }) })
  if (res.ok) return { ok: true, sha: (await res.json()).content?.sha }
  const detail = await res.text()
  return { ok: false, stale: res.status === 409 || (res.status === 422 && /sha/i.test(detail)) }
}
const messageFor = (verb, f) => `elsewhere: ${verb} ${f.type}${f.title ? ` "${f.title.replace(/"/g, "'")}"` : ""}`

/* ---------- auth and limits ---------- */
async function authed(request, env) {
  const m = (request.headers.get("authorization") || "").match(/^Bearer (.+)$/)
  const p = m ? await verify(m[1], env.SESSION_SECRET) : null
  return p && p.login && p.login.toLowerCase() === String(env.ADMIN_GITHUB_LOGIN).toLowerCase() ? p : null
}
async function limited(env, login) {
  const hour = Math.floor(Date.now() / 3_600_000)
  const key = `${login}:${hour}`
  if (env.RATE) {
    const n = Number((await env.RATE.get(key)) || 0)
    if (n >= RATE_LIMIT) return true
    await env.RATE.put(key, String(n + 1), { expirationTtl: 7200 })
    return false
  }
  const n = rate.get(key) || 0
  if (n >= RATE_LIMIT) return true
  rate.set(key, n + 1)
  for (const k of rate.keys()) if (!k.endsWith(`:${hour}`)) rate.delete(k)
  return false
}

/* ---------- routes ---------- */
export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    const h = cors(request, env)
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: h })
    try {
      if (url.pathname === "/login") return login(request, env)
      if (url.pathname === "/callback") return callback(request, env)

      const user = await authed(request, env)
      if (!user) return json({ error: "unauthorized" }, 401, h)
      const origin = request.headers.get("Origin")
      if (origin && !allowedOrigins(env).includes(origin)) return json({ error: "forbidden origin" }, 403, h)

      if (url.pathname === "/me" && request.method === "GET") return json({ login: user.login }, 200, h)
      if (url.pathname === "/pieces" && request.method === "GET") return pieces(env, h)
      if (url.pathname === "/piece" && request.method === "GET") return getPiece(url, env, h)

      if (["POST", "PUT"].includes(request.method) && ["/publish", "/piece", "/unpublish"].includes(url.pathname)) {
        if (await limited(env, user.login)) return json({ error: "Too many publishes this hour. Try again later." }, 429, h)
        const input = await request.json().catch(() => null)
        if (!input) return json({ error: "bad request" }, 400, h)
        if (url.pathname === "/publish" && request.method === "POST") return publish(input, env, h)
        if (url.pathname === "/piece" && request.method === "PUT") return edit(input, env, h)
        if (url.pathname === "/unpublish" && request.method === "POST") return unpublish(input, env, h)
      }
      return json({ error: "not found" }, 404, h)
    } catch {
      return json({ error: "Something went wrong. Nothing was changed." }, 500, h) // never echo internals or the token
    }
  },
}

function login(request, env) {
  const state = crypto.randomUUID()
  const redirect = new URL(request.url); redirect.pathname = "/callback"; redirect.search = ""
  const authorize = new URL("https://github.com/login/oauth/authorize")
  authorize.search = new URLSearchParams({ client_id: env.GITHUB_OAUTH_CLIENT_ID, redirect_uri: redirect.toString(), state, scope: "read:user" }).toString()
  return new Response(null, { status: 302, headers: { location: authorize.toString(), "set-cookie": `oauth_state=${state}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600` } })
}
async function callback(request, env) {
  const url = new URL(request.url)
  const state = url.searchParams.get("state")
  const cookie = (request.headers.get("cookie") || "").match(/(?:^|;\s*)oauth_state=([^;]+)/)?.[1]
  if (!state || !cookie || state !== cookie) return new Response("Bad sign-in state.", { status: 400 })
  const tok = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST", headers: { accept: "application/json", "content-type": "application/json" },
    body: JSON.stringify({ client_id: env.GITHUB_OAUTH_CLIENT_ID, client_secret: env.GITHUB_OAUTH_CLIENT_SECRET, code: url.searchParams.get("code") }),
  }).then((r) => r.json()).catch(() => ({}))
  if (!tok.access_token) return new Response("Sign-in failed.", { status: 400 })
  const me = await fetch("https://api.github.com/user", { headers: { authorization: `Bearer ${tok.access_token}`, "user-agent": "elsewhere-admin", accept: "application/vnd.github+json" } }).then((r) => r.json()).catch(() => ({}))
  if (!me.login || me.login.toLowerCase() !== String(env.ADMIN_GITHUB_LOGIN).toLowerCase()) return new Response("Forbidden.", { status: 403 })
  const session = await sign({ login: me.login, exp: Math.floor(Date.now() / 1000) + 30 * DAY }, env.SESSION_SECRET)
  // the token travels in the URL fragment, which is never sent to a server or written to a log
  return new Response(null, { status: 302, headers: { location: `${env.SITE_ORIGIN}/admin/done/#token=${session}`, "set-cookie": "oauth_state=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax" } })
}

async function pieces(env, h) {
  const files = (await listFiles(env)).slice(0, 100)
  const out = await Promise.all(files.map(async (x) => {
    const file = await readFile(env, slugOf(x.name))
    const f = file && fromMdx(file.text)
    return f ? { slug: slugOf(x.name), title: f.title, type: f.type, date: f.date, draft: f.draft } : null
  }))
  return json({ pieces: out.filter(Boolean).sort((a, b) => b.date.localeCompare(a.date)) }, 200, h)
}
async function getPiece(url, env, h) {
  const slug = (url.searchParams.get("slug") || "").replace(/[^a-z0-9-]/g, "")
  const file = slug && (await readFile(env, slug))
  const f = file && fromMdx(file.text)
  if (!f) return json({ error: "not found" }, 404, h)
  return json({ slug, sha: file.sha, fields: f }, 200, h)
}
async function publish(input, env, h) {
  const { errors, f } = validate(input)
  if (errors.length) return json({ error: "invalid", errors }, 422, h)
  const taken = new Set((await listFiles(env)).map((x) => slugOf(x.name)))
  const slug = slugify(f, taken)
  const res = await writeFile(env, `${slug}.mdx`, toMdx(f), messageFor(f.draft ? "save draft" : "add", f))
  if (!res.ok) return json({ error: res.stale ? "stale" : "Could not commit. Nothing was published." }, res.stale ? 409 : 502, h)
  return json({ slug, type: f.type, draft: f.draft, sha: res.sha }, 200, h)
}
async function edit(input, env, h) {
  const slug = String(input.slug || "").replace(/[^a-z0-9-]/g, "")
  const { errors, f } = validate(input.fields ?? input)
  if (!slug || !input.sha) return json({ error: "slug and sha are required" }, 400, h)
  if (errors.length) return json({ error: "invalid", errors }, 422, h)
  const current = await readFile(env, slug)
  if (!current) return json({ error: "not found" }, 404, h)
  if (current.sha !== input.sha) return json({ error: "stale" }, 409, h) // never overwrite
  const res = await writeFile(env, current.name, toMdx(f), messageFor(f.draft ? "save draft of" : "edit", f), input.sha)
  if (!res.ok) return json({ error: res.stale ? "stale" : "Could not commit. Nothing was changed." }, res.stale ? 409 : 502, h)
  return json({ slug, type: f.type, draft: f.draft, sha: res.sha }, 200, h)
}
async function unpublish(input, env, h) {
  const slug = String(input.slug || "").replace(/[^a-z0-9-]/g, "")
  if (!slug || !input.sha) return json({ error: "slug and sha are required" }, 400, h)
  const current = await readFile(env, slug)
  if (!current) return json({ error: "not found" }, 404, h)
  if (current.sha !== input.sha) return json({ error: "stale" }, 409, h)
  const f = fromMdx(current.text)
  if (!f) return json({ error: "unreadable" }, 422, h)
  f.draft = true
  const res = await writeFile(env, current.name, toMdx(f), messageFor("unpublish", f), input.sha)
  if (!res.ok) return json({ error: res.stale ? "stale" : "Could not commit. Nothing was changed." }, res.stale ? 409 : 502, h)
  return json({ slug, draft: true, sha: res.sha }, 200, h)
}
