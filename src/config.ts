// Single place to rename the section. Every label, link and title reads from here.
// Alternatives: "baithak", "diary", "margins".
export const SPACE_NAME = "Kalam"

// TODO: confirm. Omaha was assumed. Drives the footer place, temperature and clock.
export const CITY = { name: "Omaha", lat: 41.26, lon: -95.93, tz: "America/Chicago" }

// Cloudflare Worker URL that returns { isPlaying, title, artist, url }. See worker/README.md.
// While empty, the footer says Zenith is not live on Spotify.
export const NOW_PLAYING_ENDPOINT = ""

export const SITE = {
  name: "Zenith Sharma",
  employer: "Forte Opening Solutions",
  github: "https://github.com/sharmazenith",
  // TODO: add before publishing. Empty values are hidden everywhere they would appear.
  linkedin: "",
  email: "",
  resumePdf: "", // e.g. "/zenith-sharma-resume.pdf" after placing the file in public/
}
