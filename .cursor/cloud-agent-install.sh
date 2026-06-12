#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

echo "==> Tool versions"
node --version
git --version
pnpm --version

echo "==> Installing dependencies"
pnpm install --frozen-lockfile

echo "==> Typecheck frontend"
pnpm typecheck

echo "==> Bootstrapping Convex (requires CONVEX_AGENT_MODE=anonymous in Cursor Secrets)"
pnpm exec convex dev --once --typecheck enable

echo "==> Cloud agent install complete"
