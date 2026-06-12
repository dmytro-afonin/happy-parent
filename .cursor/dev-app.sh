#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

# Run the app dev server.
#
# `vercel dev` needs Vercel auth + a linked project. When VERCEL_TOKEN is set
# (and ideally VERCEL_ORG_ID + VERCEL_PROJECT_ID, which the Vercel CLI reads
# from the environment to link non-interactively), use it. Otherwise fall back
# to the plain Vite dev server so this terminal never hangs on Vercel's
# interactive OAuth login flow.
if [ -n "${VERCEL_TOKEN:-}" ]; then
  echo "==> VERCEL_TOKEN detected — starting 'vercel dev' on port 3000"
  exec pnpm dlx vercel dev --listen 3000 --yes --token "$VERCEL_TOKEN"
fi

echo "==> VERCEL_TOKEN not set — starting 'pnpm dev' (Vite) on port 3000"
echo "    (set VERCEL_TOKEN + VERCEL_ORG_ID + VERCEL_PROJECT_ID secrets to use vercel dev)"
exec pnpm dev
