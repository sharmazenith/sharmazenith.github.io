# Writing and publishing from the site

The site is static on GitHub Pages, so it cannot run server code. Publishing therefore runs in a second
Cloudflare Worker, `elsewhere-admin` (this folder: `admin.js`), next to the existing `now-playing` Worker.
The editor lives on the static page, appears only when you are signed in, and talks to the Worker.
Publishing commits a file to `src/content/elsewhere/` on `main`; the normal GitHub Pages workflow rebuilds on that push.

## One time setup

1. **GitHub OAuth app** (GitHub, Settings, Developer settings, OAuth Apps, New):
   - Homepage URL: `https://sharmazenith.github.io`
   - Authorization callback URL: `https://elsewhere-admin.znthshrm.workers.dev/callback`
   - Copy the Client ID, generate a Client secret.
2. **Fine grained token** (Settings, Developer settings, Fine-grained tokens): repository access to **only**
   `sharmazenith/sharmazenith.github.io`, permission **Contents: Read and write**. Nothing else.
3. **Deploy the Worker** from the project folder:
   ```
   cd worker
   # put the OAuth Client ID into wrangler.admin.toml (GITHUB_OAUTH_CLIENT_ID)
   npx wrangler secret put GITHUB_TOKEN -c wrangler.admin.toml
   npx wrangler secret put GITHUB_OAUTH_CLIENT_SECRET -c wrangler.admin.toml
   openssl rand -hex 32     # paste the result when asked for SESSION_SECRET
   npx wrangler secret put SESSION_SECRET -c wrangler.admin.toml
   npx wrangler deploy -c wrangler.admin.toml
   ```
   If the deployed URL differs from `https://elsewhere-admin.znthshrm.workers.dev`, update `ADMIN_API` in
   `src/config.ts` and the OAuth callback URL.
4. Merge this branch into `main` so the site ships the editor. Publishing commits to `main`.

## Using it

- Open `https://sharmazenith.github.io/admin/login` (not linked anywhere). Sign in with GitHub. Only the account in
  `ADMIN_GITHUB_LOGIN` is accepted. The session lasts 30 days in this browser.
- In Elsewhere a small **WRITE** label appears above the filters. It opens the editor in the middle column.
  Visitors never see it.
- **Preview** shows the exact published rendering. **Save draft** commits with `draft: true` (private, excluded from
  every public list and page). **Publish** commits; it is live after the Pages build, about a minute.
- On any piece, **Edit** and **Unpublish** appear for you. Both send the file's SHA; if the file changed in the
  meantime you get "This piece changed elsewhere. Reload to get the latest." and nothing is overwritten.
- In progress writing autosaves in this browser every few seconds and is cleared after a successful publish.

## Translate Roman (optional)

In the editor, type romanized Hindi or Urdu in the **Roman** box and press **Translate Roman**. Claude fills the
Devanagari box and a plain, unsoftened English translation (same line breaks, no padding). Both are drafts to read and
fix before publishing. It needs one more secret:

```
npx wrangler secret put ANTHROPIC_API_KEY -c wrangler.admin.toml
npx wrangler deploy -c wrangler.admin.toml
```

The key is from console.anthropic.com. Calls are limited to 60 per hour, require your signed token, and the model and
the translation rules live in `worker/admin.js` (`MODEL`, `TRANSLATE_SYSTEM`). Change the rules there to change the tone.

## Security notes

- Every request except sign-in needs a signed, expiring token for the admin account; anything else gets 401.
  Requests from other origins get 403. The token is carried in an `Authorization` header, not a cookie, because the
  site and the Worker are on different domains, where a `SameSite=Strict` cookie would never be sent. Because it is
  a header, a malicious site cannot make your browser send it (the cross site request problem cookies have).
- Rate limit: 20 publishes per hour. Add the optional KV namespace in `wrangler.admin.toml` for a limit shared
  across all Cloudflare servers; without it the limit is per server instance.
- Submitted text is reduced to plain text: HTML tags are removed, and `{ }` are escaped so one stray brace cannot
  break the MDX build.
- The token never reaches client code and is never logged; the Worker returns generic errors.
