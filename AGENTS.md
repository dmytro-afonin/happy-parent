<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# AGENTS.md

## Cursor Cloud specific instructions

Happy Parent is a Next.js App Router (React 19) web app on Vercel, backed by
Convex (data) and Clerk (auth). MapLibre + OpenFreeMap power the public map;
Terra Draw is admin-only. Standard commands live in `README.md` and
`package.json` scripts.

### Node and pnpm

- Runtime pin is `devEngines.runtime` in `package.json` (Node `^24.15.0`, downloaded when the shell Node does not match). There is no `.nvmrc`.
- `packageManager` is `pnpm@12.15.0`. On Node 24, `corepack enable` makes `pnpm` use that version. Build-script approval lives in `pnpm-workspace.yaml` `allowBuilds`.
- A login shell on this VM can still print Node 22: nvm's default alias is `22.*`, and that bin is ahead of Node 24. `nvm alias default 24` then a new shell selects the installed Node 24. Project scripts follow `devEngines.runtime` either way.

### Two long-running processes (separate terminals/tmux sessions)

1. Backend: `CONVEX_AGENT_MODE=anonymous pnpm dlx convex dev` — local anonymous
   Convex on `http://127.0.0.1:3210`. Writes `CONVEX_DEPLOYMENT`,
   `NEXT_PUBLIC_CONVEX_URL` into `.env.local`. Answer `n` if asked to set up
   Convex AI files.
2. After Convex is up, set Clerk on the deployment:
   `pnpm dlx convex env set CLERK_FRONTEND_API_URL "$CLERK_FRONTEND_API_URL"`
   (`convex/auth.config.ts` reads that env var).
3. Frontend: `pnpm dev` → http://localhost:3000 (start only after
   `NEXT_PUBLIC_CONVEX_URL` exists).

### Gotchas

- `.env.local` is gitignored. Copy Clerk keys (`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`,
  `CLERK_SECRET_KEY`) and optional Sentry/PostHog keys from the environment.
  `LOCATIONIQ_API_KEY` is reserved and unused in this slice.
- Missing `NEXT_PUBLIC_SENTRY_DSN` or PostHog keys skips those clients; the map
  still runs.
- OpenFreeMap tiles require outbound internet.
- Seed demo places from the CLI: `pnpm dlx convex run seed:run`. `seed:run` and
  `seed:promoteMeAdmin` are internal mutations, so the public client cannot call them.
- Promote a signed-in user to admin locally by setting `users.role` to `admin`
  in the Convex dashboard Data tab.

### Lint / typecheck

- `pnpm lint` (eslint) and `pnpm typecheck` (`tsc --noEmit`) should pass.
