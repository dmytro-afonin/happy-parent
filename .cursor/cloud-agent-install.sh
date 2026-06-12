#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

echo "==> Tool versions"
node --version
git --version
pnpm --version

echo "==> Installing dependencies"
pnpm install --frozen-lockfile

echo "==> Cloud agent install complete"
