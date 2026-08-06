# Happy Parent

Discover and save family-friendly places on an interactive map.

## Stack

| Layer | Choice |
| --- | --- |
| Framework | [TanStack Start](https://tanstack.com/start) |
| UI | [shadcn/ui](https://ui.shadcn.com) + Tailwind CSS |
| Auth | [Clerk](https://clerk.com) (`@clerk/tanstack-react-start`) |
| Backend | [Convex](https://convex.dev) (database + file storage) |
| Map | [MapLibre GL JS](https://maplibre.org) |
| Hosting | [Vercel](https://vercel.com) via Nitro Vite plugin |

## Prerequisites

- Node.js 20+
- [pnpm](https://pnpm.io)
- [Convex](https://convex.dev) account
- [Clerk](https://clerk.com) account
- [Vercel](https://vercel.com) account (for deployment)

## Setup

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Copy environment variables:

   ```bash
   cp .env.example .env.local
   ```

3. Start Convex (creates a dev deployment and writes `VITE_CONVEX_URL`):

   ```bash
   pnpm dlx convex dev
   ```

4. Configure Clerk:
   - Create an application in the [Clerk Dashboard](https://dashboard.clerk.com)
   - Add `VITE_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` to `.env.local`
   - Create a JWT template named exactly **`convex`**
   - Copy the template Issuer URL into `CLERK_JWT_ISSUER_DOMAIN` in `.env.local`
   - Set the same Issuer in `convex/auth.config.ts` via the env var above

5. Run the app (two terminals):

   ```bash
   pnpm dev
   pnpm dlx convex dev
   ```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Description |
| --- | --- |
| `pnpm dev` | Start TanStack Start dev server |
| `pnpm build` | Production build (Nitro + TanStack) |
| `pnpm lint` | ESLint (includes `@convex-dev/eslint-plugin`) |
| `pnpm typecheck` | TypeScript check |
| `pnpm format` | Prettier format |

## Deploy to Vercel

1. Import the GitHub repo on Vercel
2. Set environment variables from `.env.example`
3. Build command: `pnpm build` (configured in `vercel.json`)
4. Ensure Nitro plugin is present in `vite.config.ts`

### Preview deployments (branch previews)

With a preview-scoped `CONVEX_DEPLOY_KEY`, every branch build creates a
**fresh Convex preview deployment** that starts with no environment variables
and no data. Two things are required for previews to work while signed in:

1. In the Convex dashboard → project settings → **Default Environment
   Variables**, add `CLERK_FRONTEND_API_URL` (enabled for *Preview*
   deployments) pointing at the **same Clerk instance whose keys are used in
   the Vercel Preview environment** (development keys `pk_test_…` →
   `https://<slug>.clerk.accounts.dev`). If this is missing or points at a
   different Clerk instance, Convex rejects the browser's auth token and the
   client reconnects in a loop — signed-in pages hang on "Loading map…".
2. Seed data: `vercel.json` passes `--preview-run 'migrations:seedLabels'` to
   `convex deploy`, which seeds place types and translations on every fresh
   preview deployment (production deploys are unaffected).

## Deferred (not in initial scaffold)

- Place search (Photon / Nominatim)
- Routing (OSRM / Valhalla)
- Photo upload UI and moderation admin
- Production map tile API keys

## Repository

https://github.com/dmytro-afonin/happy-parent
