#!/usr/bin/env bash
# Vercel build: deploy Convex + Next, then run migrations.
# Preview: --preview-create so --preview-run always fires (Convex only runs
#   --preview-run when the preview deployment is newly created, not reused).
# Production: deploy, then convex run (prod deploy keys work as admin keys).
set -euo pipefail

if [ "${VERCEL_ENV:-}" = "production" ]; then
  pnpm exec convex deploy --cmd 'pnpm run build'
  pnpm exec convex run migrations:runAll
else
  preview_name="${VERCEL_GIT_COMMIT_REF:-${VERCEL_GIT_COMMIT_SHA:-preview}}"
  pnpm exec convex deploy \
    --cmd 'pnpm run build' \
    --preview-create "$preview_name" \
    --preview-run 'migrations:runAll'
fi
