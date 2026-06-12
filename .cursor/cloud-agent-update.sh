#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

echo "==> Updating dependencies"
pnpm install --frozen-lockfile

echo "==> Cloud agent update complete"
