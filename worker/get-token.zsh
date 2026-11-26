#!/bin/zsh
# One time helper: trades your Spotify approval for a refresh token and copies it to the clipboard.
# Run it in your own terminal:  zsh worker/get-token.zsh
# The secret is typed hidden, the token is never printed, and nothing is saved to disk.
REDIRECT="http://127.0.0.1:8888/callback"

read "CID?Client ID: "
open "https://accounts.spotify.com/authorize?client_id=${CID}&response_type=code&redirect_uri=http%3A%2F%2F127.0.0.1%3A8888%2Fcallback&scope=user-read-currently-playing"
echo "Approve in the browser. It will then show a page that fails to load. That is expected."
read "URL?Paste the full address from the browser bar: "
CODE="${URL#*code=}"; CODE="${CODE%%&*}"
read -s "SECRET?Client secret (hidden): "; echo

curl -s -X POST https://accounts.spotify.com/api/token \
  -u "${CID}:${SECRET}" \
  -d grant_type=authorization_code -d code="${CODE}" -d redirect_uri="${REDIRECT}" |
python3 -c '
import sys, json
d = json.load(sys.stdin)
t = d.get("refresh_token")
if t:
    sys.stdout.write(t)
else:
    sys.stderr.write("Spotify said: " + str(d.get("error_description") or d.get("error") or d) + "\n")
' | pbcopy

if [ -n "$(pbpaste)" ] && [ "$(pbpaste | wc -c)" -gt 40 ]; then
  echo "Done. The refresh token is on your clipboard. Paste it when wrangler asks for SPOTIFY_REFRESH_TOKEN."
else
  echo "No token. Read the message above, then run this again (the approval code works only once)."
fi
unset SECRET CID CODE URL
