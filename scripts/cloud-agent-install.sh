#!/usr/bin/env bash
# Cloud Agent `install` — idempotent dependency bootstrap (must exit).
set -euo pipefail

corepack enable
pnpm install --frozen-lockfile
