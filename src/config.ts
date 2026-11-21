// Single place to rename the section. Every label, link and title reads from here.
// Alternatives: "baithak", "diary", "margins".
export const SPACE_NAME = "Kalam"

// Drives the footer place, temperature and clock.
export const CITY = { name: "Papillion", lat: 41.1544, lon: -96.042, tz: "America/Chicago" }

// Cloudflare Worker URL that returns { isPlaying, title, artist, url }. See worker/README.md.
// While empty, the footer says Zenith is not live on Spotify.
export const NOW_PLAYING_ENDPOINT = "https://now-playing.znthshrm.workers.dev"

export const SITE = {
  name: "Zenith Sharma",
  github: "https://github.com/sharmazenith",
  // TODO: add before publishing. Empty values are hidden everywhere they would appear.
  linkedin: "",
  email: "",
  resumePdf: "", // e.g. "/zenith-sharma-resume.pdf" after placing the file in public/
}
