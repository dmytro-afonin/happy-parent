#!/usr/bin/env bash
# Vercel build: deploy Convex + Next, then run migrations on production.
#
# Preview: reuse the branch preview and pass --preview-run. Convex only
#   executes --preview-run when the preview is *newly created*, not reused.
#   Do NOT use --preview-create here: recreating drops per-deployment env
#   (e.g. CLERK_FRONTEND_API_URL) and wipes preview data, so backfills would
#   have nothing to migrate. Set project-level preview env defaults in Convex
#   for Clerk. Production is the path that must always migrate.
# Production: deploy, then convex run (prod deploy keys work as admin keys).
set -euo pipefail

if [ "${VERCEL_ENV:-}" = "production" ]; then
  pnpm exec convex deploy --cmd 'pnpm run build'
  pnpm exec convex run migrations:runAll
else
  pnpm exec convex deploy \
    --cmd 'pnpm run build' \
    --preview-run 'migrations:runAll'
fi
