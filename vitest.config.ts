import { defineConfig } from "vitest/config"

// Keep Vitest off the TanStack Start / Nitro Vite plugin graph so `pnpm test`
// does not boot an SSR environment when no tests are present.
export default defineConfig({
  test: {
    passWithNoTests: true,
    environment: "node",
    pool: "threads",
  },
})
