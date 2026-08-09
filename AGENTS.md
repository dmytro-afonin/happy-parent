# AGENTS.md

## Cursor Cloud specific instructions

Happy Parent is a single TanStack Start (React 19 + Vite) web app backed by Convex
(database/server functions) and Clerk (auth). Standard commands live in `README.md`
and `package.json` scripts; this section only covers non-obvious caveats.

### Node version

- `package.json` requires Node `>=24.15` (matches current Vercel Node 24.x images).
  The VM's default `node` (`/exec-daemon/node`) is often older and ahead of nvm on
  `PATH`, so plain `node`/`pnpm dev` may not match the engine. Prefer Node 24 via nvm
  and prepend it for dev/build/test:
  `export PATH="$HOME/.nvm/versions/node/v24.19.0/bin:$PATH"` (or `nvm use 24`).

### Two long-running processes (run in separate terminals/tmux sessions)

- Backend: `CONVEX_AGENT_MODE=anonymous pnpm dlx convex dev` — starts a **local**
  anonymous Convex deployment (no login/account needed) on `http://127.0.0.1:3210` and
  writes `CONVEX_DEPLOYMENT`, `VITE_CONVEX_URL`, `VITE_CONVEX_SITE_URL` into `.env.local`.
  `CONVEX_AGENT_MODE=anonymous` is already provided as an env var in this environment.
- Frontend: `pnpm dev` → http://localhost:3000 (must start after Convex has written
  `VITE_CONVEX_URL`, otherwise the client falls back to a placeholder URL and data won't load).

### Gotchas

- `pnpm dlx convex dev` is interactive on first run: it asks "Set up Convex AI files?"
  — answer `n` (do not commit AI files). It also halts function push until
  `CLERK_FRONTEND_API_URL` is set **on the Convex deployment**:
  `pnpm dlx convex env set CLERK_FRONTEND_API_URL "$CLERK_FRONTEND_API_URL"` (the value
  is available as an env var here). `convex/auth.config.ts` reads `CLERK_FRONTEND_API_URL`.
- `.env.local` is gitignored. Clerk keys (`VITE_CLERK_PUBLISHABLE_KEY` or Marketplace
  `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, plus `CLERK_SECRET_KEY`, `CLERK_FRONTEND_API_URL`)
  are injected as env vars; copy them into `.env.local` for the Vite/SSR server. The app
  aliases `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` → `VITE_`/`CLERK_PUBLISHABLE_KEY`.
- Map tiles (`tiles.openfreemap.org`) and place search (`nominatim.openstreetmap.org`)
  require outbound internet; both work from this VM. ImageKit (admin photo upload) is
  optional and unconfigured by default — its config gracefully returns null.

### Lint / test status

- Lint/format use Oxlint + Oxfmt (`pnpm lint` / `pnpm format` / `pnpm check`).
- `pnpm typecheck` should pass. `pnpm test` (vitest) currently finds no test files.
