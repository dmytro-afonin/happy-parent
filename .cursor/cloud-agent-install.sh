#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

echo "==> Tool versions"
node --version
git --version
pnpm --version

echo "==> Installing dependencies"
pnpm install --frozen-lockfile

# Bootstrap the local anonymous Convex deployment (requires
# CONVEX_AGENT_MODE=anonymous in Cursor Secrets). These steps are best-effort:
# they must never hard-fail the install and block the VM from starting.
if [ "${CONVEX_AGENT_MODE:-}" = "anonymous" ]; then
  echo "==> Bootstrapping Convex (anonymous agent mode)"

  # First run provisions the local deployment. It exits non-zero when the
  # deployment env vars below are not yet set, which is expected here.
  pnpm exec convex dev --once --typecheck disable || true

  # convex/auth.config.ts reads CLERK_FRONTEND_API_URL from the *deployment*
  # environment, not the shell, so mirror the secret into the deployment.
  if [ -n "${CLERK_FRONTEND_API_URL:-}" ]; then
    pnpm exec convex env set CLERK_FRONTEND_API_URL "$CLERK_FRONTEND_API_URL" || true
  fi

  # Push schema + functions now that the deployment env var is configured.
  pnpm exec convex dev --once --typecheck disable || true
else
  echo "==> Skipping Convex bootstrap (set CONVEX_AGENT_MODE=anonymous to enable)"
fi

echo "==> Cloud agent install complete"
