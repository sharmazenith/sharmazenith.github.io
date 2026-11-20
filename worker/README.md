# now playing worker

A small Cloudflare Worker (free tier) that reads Spotify's "currently playing" and returns
`{ isPlaying, title, artist, url }`. The site fetches it from the footer. It is not part of the
Astro build and is not deployed by the GitHub workflow.

## One time setup

1. Spotify: create an app at https://developer.spotify.com/dashboard. Add a redirect URI you control
   (for example `http://127.0.0.1:8888/callback`). Note the client id and client secret.
2. Get a refresh token once, with scope `user-read-currently-playing` (authorization code flow).
3. Cloudflare: create a Worker, paste `now-playing.js`, and add three secrets:
   `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `SPOTIFY_REFRESH_TOKEN`.
4. Put the Worker URL in `NOW_PLAYING_ENDPOINT` in `src/config.ts`. Also delete the mock use by leaving
   that constant set. Never put the secrets in the repo.

The Worker only allows requests from `https://sharmazenith.github.io` (and `localhost:4321` for dev).
On any error it returns `{ "isPlaying": false }`, so the footer falls back to `not playing`.
