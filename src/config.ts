// Single place to rename the writing section. The nav, page titles, routes and metadata all read from here.
// Changing `slug` also needs the folder src/pages/<slug>/ renamed to match, and the redirects in astro.config.mjs.
// Backup names: "The Other Room", "After Hours", "Off the Clock".
export const SECTION = { label: "ELSEWHERE", slug: "elsewhere" } as const

// Drives the footer place, temperature and clock.
export const CITY = { name: "Papillion", lat: 41.1544, lon: -96.042, tz: "America/Chicago" }

// Cloudflare Worker URL that returns { isPlaying, title, artist, url }. See worker/README.md.
// While empty, the footer says Zenith is not live on Spotify.
export const NOW_PLAYING_ENDPOINT = "https://now-playing.znthshrm.workers.dev"

// Cloudflare Worker that signs you in with GitHub and commits new writing to the repo. See worker/ADMIN.md.
// Visitors never see anything for it: there is no link, and every call needs your signed token.
export const ADMIN_API = "https://elsewhere-admin.znthshrm.workers.dev"

export const SITE = {
  name: "Zenith Sharma",
  github: "https://github.com/sharmazenith",
  spotify: "https://open.spotify.com/user/31e5fsjkhevmaekqphvkuzhwaqwm",
  // TODO: add before publishing. Empty values are hidden everywhere they would appear.
  linkedin: "",
  email: "",
  resumePdf: "", // e.g. "/zenith-sharma-resume.pdf" after placing the file in public/
}
