#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

echo "==> Typecheck frontend"
pnpm typecheck

# Ensure the local/anonymous Convex deployment exists (this also writes
# VITE_CONVEX_URL to .env.local). On a brand-new deployment this first push can
# fail because convex/auth.config.ts reads CLERK_FRONTEND_API_URL from the Convex
# *deployment* env (separate from the shell), which isn't set yet — tolerate it.
echo "==> Bootstrapping Convex deployment (first push may fail until auth env is set)"
pnpm exec convex dev --once --typecheck enable || true

# Mirror the injected Clerk secret into the Convex deployment env so the auth
# config can be pushed. Requires the deployment created above to exist.
if [ -n "${CLERK_FRONTEND_API_URL:-}" ]; then
  echo "==> Setting CLERK_FRONTEND_API_URL in Convex deployment env"
  pnpm exec convex env set CLERK_FRONTEND_API_URL "$CLERK_FRONTEND_API_URL"
else
  echo "==> WARNING: CLERK_FRONTEND_API_URL not set; Convex auth config push may fail"
fi

echo "==> Pushing Convex functions"
pnpm exec convex dev --once --typecheck enable

echo "==> Cloud agent start complete"
