// Cloudflare Worker: returns what is playing on Spotify as { isPlaying, title, artist, url }.
// Secrets live in the Worker, never in this repo or the site:
//   SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, SPOTIFY_REFRESH_TOKEN
// See worker/README.md for setup.

const ORIGIN = "https://sharmazenith.github.io"
const IDLE = { isPlaying: false }

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin")
    const headers = {
      "content-type": "application/json",
      "cache-control": "public, max-age=15",
      "access-control-allow-origin": origin === ORIGIN || origin === "http://localhost:3000" ? origin : ORIGIN,
      vary: "Origin",
    }
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers })
    if (request.method !== "GET") return new Response("method not allowed", { status: 405, headers })

    try {
      const token = await accessToken(env)
      const res = await fetch("https://api.spotify.com/v1/me/player/currently-playing", {
        headers: { authorization: `Bearer ${token}` },
      })
      if (res.status === 204 || res.status > 400) return json(IDLE, headers)
      const data = await res.json()
      if (!data.is_playing || data.currently_playing_type !== "track" || !data.item) return json(IDLE, headers)
      return json(
        {
          isPlaying: true,
          title: data.item.name,
          artist: data.item.artists.map((a) => a.name).join(", "),
          url: data.item.external_urls?.spotify ?? "",
        },
        headers,
      )
    } catch {
      return json(IDLE, headers) // never leak errors to the page
    }
  },
}

const json = (body, headers) => new Response(JSON.stringify(body), { headers })

async function accessToken(env) {
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      authorization: `Basic ${btoa(`${env.SPOTIFY_CLIENT_ID}:${env.SPOTIFY_CLIENT_SECRET}`)}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: env.SPOTIFY_REFRESH_TOKEN }),
  })
  if (!res.ok) throw new Error("token refresh failed")
  return (await res.json()).access_token
}
