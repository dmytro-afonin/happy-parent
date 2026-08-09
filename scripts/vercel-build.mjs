/**
 * Vercel build entry.
 *
 * With CONVEX_DEPLOY_KEY set (Vercel ↔ Convex integration):
 *   - Production key → deploy functions to production, then build
 *   - Preview key → create/update a branch Convex preview backend, then build
 *   In both cases `convex deploy` injects VITE_CONVEX_URL for the frontend build.
 *
 * Without CONVEX_DEPLOY_KEY: build against an existing VITE_CONVEX_URL (must be set).
 *
 * --preview-run only runs on Convex preview deployments (not production).
 */
import { spawnSync } from "node:child_process"

// Mirror src/lib/clerk-env.ts — Marketplace NEXT_PUBLIC_* → Vite/Clerk names.
const publishable =
  process.env.VITE_CLERK_PUBLISHABLE_KEY ||
  process.env.CLERK_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
if (publishable) {
  process.env.VITE_CLERK_PUBLISHABLE_KEY ??= publishable
  process.env.CLERK_PUBLISHABLE_KEY ??= publishable
}

const vercelEnv = process.env.VERCEL_ENV ?? "development"

function run(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit", shell: false })
  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

if (process.env.CONVEX_DEPLOY_KEY) {
  console.log(
    `[vercel-build] VERCEL_ENV=${vercelEnv}: running convex deploy (sets VITE_CONVEX_URL)`
  )
  run("pnpm", [
    "dlx",
    "convex",
    "deploy",
    "--cmd",
    "pnpm run build",
    "--preview-run",
    "migrations:seedLabels",
  ])
} else {
  const url = process.env.VITE_CONVEX_URL ?? ""
  if (!url || url.includes("placeholder.convex")) {
    console.error(
      "[vercel-build] CONVEX_DEPLOY_KEY is unset and VITE_CONVEX_URL is missing or placeholder. " +
        "Set a Preview/Production CONVEX_DEPLOY_KEY (Convex ↔ Vercel integration) or a real VITE_CONVEX_URL."
    )
    process.exit(1)
  }
  console.log(
    `[vercel-build] VERCEL_ENV=${vercelEnv}: no CONVEX_DEPLOY_KEY; building against VITE_CONVEX_URL=${url}`
  )
  run("pnpm", ["run", "build"])
}
