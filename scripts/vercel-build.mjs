/**
 * Vercel build entry.
 *
 * Production: deploy Convex functions/schema, then build the frontend
 * (convex deploy sets VITE_CONVEX_URL for the build).
 *
 * Preview / Development: build the frontend only. Point Vercel Preview env
 * vars at the production Convex + Clerk so previews show production data.
 * Do not run `convex deploy` here — that would either spawn empty preview
 * backends or overwrite production functions from an unmerged branch.
 */
import { spawnSync } from "node:child_process"

const env = process.env.VERCEL_ENV ?? "development"

function run(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit", shell: false })
  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

if (env === "production") {
  run("pnpm", [
    "dlx",
    "convex",
    "deploy",
    "--cmd",
    "pnpm run build",
  ])
} else {
  console.log(
    `[vercel-build] VERCEL_ENV=${env}: skipping convex deploy; building against VITE_CONVEX_URL=${process.env.VITE_CONVEX_URL ?? "(unset)"}`,
  )
  run("pnpm", ["run", "build"])
}
