#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

echo "==> Typecheck frontend"
pnpm typecheck

echo "==> Bootstrapping Convex (requires CONVEX_AGENT_MODE=anonymous in Cursor Secrets)"
pnpm exec convex dev --once --typecheck enable

echo "==> Cloud agent start complete"
