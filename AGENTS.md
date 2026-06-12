# AGENTS.md

## Cursor Cloud specific instructions

**Project:** Happy Parent — a single TanStack Start (React 19, SSR) web app for discovering and saving family-friendly places on an interactive MapLibre map. Backend is Convex (database + file storage + serverless functions); auth is Clerk; geocoding uses public Nominatim; photo storage is ImageKit (optional). Standard scripts live in `package.json` and the README; prefer those rather than re-deriving commands.

### Services

Two long-running processes are needed for local development (both defined as terminals in `.cursor/environment.json`):

- **Convex backend** — `pnpm exec convex dev` (local anonymous deployment on `http://127.0.0.1:3210`). Must be running for the app to load data/auth.
- **App dev server** — `pnpm dev` (Vite on `http://localhost:3000`).

### Non-obvious caveats

- **Convex runs in anonymous mode.** The `CONVEX_AGENT_MODE=anonymous` secret makes `convex dev` create a local, login-free deployment. Each fresh VM gets a brand-new anonymous deployment, so Convex data does **not** persist across sessions (you start with empty `places`, `users`, etc.).
- **Clerk env var must be mirrored into the Convex deployment.** `convex/auth.config.ts` reads `CLERK_FRONTEND_API_URL` from the *Convex deployment* env, which is separate from the shell/Cursor secrets. A new anonymous deployment does not have it, so the first `convex dev` push fails with "Environment variable CLERK_FRONTEND_API_URL is used in auth config file but its value was not set." Fix: `pnpm exec convex env set CLERK_FRONTEND_API_URL "$CLERK_FRONTEND_API_URL"` (the deployment must already exist, i.e. run `convex dev --once` once first). `.cursor/cloud-agent-start.sh` now does this automatically.
- **Clerk keys** (`VITE_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `CLERK_FRONTEND_API_URL`) are injected as Cursor secrets and read from the environment — they are not in `.env.local`. Only the Convex URLs are written to `.env.local` (by `convex dev`).
- **No test files exist.** `pnpm test` (vitest) exits non-zero with "No test files found" — this is expected, not a setup failure.
- **`pnpm lint` reports pre-existing source lint errors** (type-only import style, unnecessary conditionals, etc.). The linter itself works; these are existing code issues, not environment problems.
- **Node version:** `package.json` engines wants Node `>=24` and the build Dockerfile uses `node:24`. The live VM may run Node 22, which only emits an "Unsupported engine" warning; typecheck/build/dev all work.
- **ImageKit is optional** — only photo upload/display needs `IMAGEKIT_*` set via `pnpm exec convex env set ...`. Map browsing, search, and favourites work without it.

### Verifying the environment

Map place search exercises frontend → Convex action → Nominatim end-to-end without login:
`pnpm exec convex run geocoding:search '{"query":"Central Park New York","limit":3}'` should return a result. In the UI: open `http://localhost:3000`, click "Explore the map", open search, type a place, select a result, and the map flies to it.
