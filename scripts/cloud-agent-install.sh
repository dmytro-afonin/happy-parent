#!/usr/bin/env bash
# Cloud Agent `install` — idempotent dependency bootstrap (must exit).
set -euo pipefail

# Node 25+ no longer bundles corepack, so `corepack enable` fails until it is installed.
npm i -g corepack@latest
corepack enable
pnpm install --frozen-lockfile
