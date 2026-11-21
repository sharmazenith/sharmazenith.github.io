# Now playing worker

A small Cloudflare Worker (free tier) that reads Spotify's "currently playing" and returns
`{ isPlaying, title, artist, url }`. The site fetches it from the footer every 30 seconds while the tab
is visible. It is not part of the Astro build and is not deployed by the GitHub workflow.
It shows what is playing. It cannot play audio on the site.

## One time setup

1. **Spotify app.** At https://developer.spotify.com/dashboard create an app. Set the redirect URI to
   `http://127.0.0.1:8888/callback` and tick "Web API". Copy the Client ID and Client secret.
2. **Refresh token, once.** Open this in a browser while logged in to Spotify, with your Client ID
   in place of `CLIENT_ID`:

   `https://accounts.spotify.com/authorize?client_id=CLIENT_ID&response_type=code&redirect_uri=http%3A%2F%2F127.0.0.1%3A8888%2Fcallback&scope=user-read-currently-playing`

   Approve. The browser then goes to a page that fails to load. That is expected. Copy the value after
   `code=` in the address bar and run this in your own terminal (not in chat):

   ```
   curl -s -X POST https://accounts.spotify.com/api/token \
     -u "CLIENT_ID:CLIENT_SECRET" \
     -d grant_type=authorization_code -d code=THE_CODE \
     -d redirect_uri=http://127.0.0.1:8888/callback
   ```

   Keep the `refresh_token` from the reply. The code works once and expires in minutes.
3. **Deploy.** From this folder:

   ```
   npx wrangler login
   npx wrangler deploy
   npx wrangler secret put SPOTIFY_CLIENT_ID
   npx wrangler secret put SPOTIFY_CLIENT_SECRET
   npx wrangler secret put SPOTIFY_REFRESH_TOKEN
   ```

   Deploy prints the Worker URL, like `https://now-playing.YOURNAME.workers.dev`.
4. **Connect the site.** Put that URL in `NOW_PLAYING_ENDPOINT` in `src/config.ts`. Never put the
   secrets in the repo.

The Worker only allows requests from `https://sharmazenith.github.io` (and `http://localhost:3000` for dev).
On any error, or when nothing is playing, it returns `{ "isPlaying": false }` and the footer shows
NOT PLAYING. Paused music and Spotify private sessions also count as not playing.
