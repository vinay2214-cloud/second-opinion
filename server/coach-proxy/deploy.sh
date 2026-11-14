#!/usr/bin/env bash
# Deploys the coach Worker, then uploads COACH_API_KEY from .dev.vars as a
# Cloudflare secret. Run it yourself, in your own terminal, after
# `npx wrangler login`. The key is never printed, echoed or passed as a
# command argument. Do not add `set -x` to this file.
set -euo pipefail
cd "$(dirname "$0")"

if [ ! -f .dev.vars ]; then
  echo "error: server/coach-proxy/.dev.vars is missing. Copy .dev.vars.example to .dev.vars and fill in COACH_API_KEY." >&2
  exit 1
fi

# First COACH_API_KEY line; drop a trailing CR and optional surrounding quotes.
key="$(sed -n 's/^COACH_API_KEY=//p' .dev.vars | head -n 1 | tr -d '\r')"
key="${key%\"}"; key="${key#\"}"
key="${key%\'}"; key="${key#\'}"
if [ -z "$key" ]; then
  echo "error: COACH_API_KEY in server/coach-proxy/.dev.vars is empty." >&2
  exit 1
fi

# The deploy output holds no secret; it is shown only if the deploy fails.
if ! out="$(npx wrangler deploy 2>&1)"; then
  printf '%s\n' "$out" >&2
  echo "error: wrangler deploy failed (not logged in? run: npx wrangler login)." >&2
  exit 1
fi

# printf is a shell builtin, so the key never appears in a process list.
# Wrangler reads the value from stdin when stdin is not a terminal.
if ! printf '%s' "$key" | npx wrangler secret put COACH_API_KEY >/dev/null 2>&1; then
  unset key
  echo "error: the Worker is deployed but the secret upload failed. Run: npx wrangler secret put COACH_API_KEY" >&2
  exit 1
fi
unset key

echo "deployed"
printf '%s\n' "$out" | grep -Eo 'https://[A-Za-z0-9.-]+\.workers\.dev' | head -n 1 \
  || echo "(no workers.dev URL in the wrangler output; see the Cloudflare dashboard)"
