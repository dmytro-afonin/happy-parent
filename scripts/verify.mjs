/**
 * Labeled verify pipeline so CI / Vercel logs show which step failed.
 */
import { spawnSync } from "node:child_process"

const steps = [
  {
    name: "format (oxfmt --check)",
    command: "pnpm",
    args: ["exec", "oxfmt", "--check"],
  },
  {
    name: "lint (oxlint --type-aware)",
    command: "pnpm",
    args: ["exec", "oxlint", "--type-aware"],
  },
  {
    name: "test (vitest)",
    command: "pnpm",
    args: ["exec", "vitest", "run", "--passWithNoTests"],
  },
  {
    name: "typecheck (tsc --noEmit)",
    command: "pnpm",
    args: ["exec", "tsc", "--noEmit"],
  },
]

for (const step of steps) {
  console.log(`[verify] ▶ ${step.name}`)
  const result = spawnSync(step.command, step.args, {
    stdio: "inherit",
    shell: false,
  })
  if (result.status !== 0) {
    console.error(`[verify] ✖ ${step.name} failed (exit ${result.status ?? 1})`)
    process.exit(result.status ?? 1)
  }
  console.log(`[verify] ✓ ${step.name}`)
}

console.log("[verify] all checks passed")
