# AGENTS.md

## Cursor Cloud specific instructions

Happy Parent is a single web app (TanStack Start + Vite frontend, Convex backend,
Clerk auth, MapLibre map). See `README.md` for the product overview and the
standard scripts in `package.json` (`dev`, `build`, `lint`, `typecheck`, `test`).

### Services
Both services auto-start from `.cursor/environment.json` terminals; run them
manually with:
- **App**: started via `bash .cursor/dev-app.sh` on http://localhost:3000.
  The script runs `vercel dev` when `VERCEL_TOKEN` is set, otherwise it falls
  back to `pnpm dev` (Vite). `vercel dev` requires Vercel auth + a linked
  project: without credentials it hangs on an interactive OAuth device-login,
  which is why the fallback exists. To use `vercel dev`, set the secrets
  `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID` (the CLI reads the
  ID env vars to link non-interactively). Caveat: `vercel dev` pulls the Vercel
  project's env vars, which can override the local Convex `VITE_CONVEX_URL` from
  `.env.local`; point it at the local anonymous deployment if Convex calls fail.
- **Convex**: `pnpm exec convex dev` — local anonymous backend on port 3210.
  Requires the secret `CONVEX_AGENT_MODE=anonymous` (already configured).

### Non-obvious setup caveats
- **Node 24 is required** (`engines: node >=24`). The cloud image
  (`.cursor/Dockerfile`) ships Node 24; if a shell resolves an older `node`,
  prefer the Node 24 toolchain before running `pnpm`.
- **Convex reads `CLERK_FRONTEND_API_URL` from the deployment env, not the
  shell.** A fresh `convex dev` fails with "Environment variable
  CLERK_FRONTEND_API_URL ... was not set" until you run
  `pnpm exec convex env set CLERK_FRONTEND_API_URL "$CLERK_FRONTEND_API_URL"`.
  `.cursor/cloud-agent-install.sh` does this automatically on VM startup; only
  re-run it manually if the local deployment is recreated.
- Required Clerk secrets (`CLERK_SECRET_KEY`, `VITE_CLERK_PUBLISHABLE_KEY`,
  `CLERK_FRONTEND_API_URL`) are already set as env vars/secrets.
- `IMAGEKIT_*` secrets are NOT set. Only photo upload (admin) needs them; place
  browsing, search, and favourites all work without them.

### Testing the app end to end
- Clerk runs as a **test instance**: sign up / sign in with a `+clerk_test`
  email (e.g. `someone+clerk_test@example.com`) and the fixed verification code
  `424242`.
- Place search (`convex/geocoding.ts`) calls the public Nominatim API, so the
  Convex backend needs outbound internet.
- Core flow to verify the stack: sign in → open map search → search a place →
  save it with the heart icon (persists to the Convex `favouritePlaces` table).

### Known repo state (not environment issues)
- `pnpm lint` reports pre-existing lint errors in `src/`; this is a code-quality
  issue in the repo, not a setup problem.
- There are no automated tests, so `pnpm test` (vitest) exits non-zero with
  "No test files found".
