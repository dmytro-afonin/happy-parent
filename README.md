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

Build command is `pnpm vercel-build` (via `vercel.json`):

| `VERCEL_ENV` | Behavior |
| --- | --- |
| `production` | `convex deploy` (push functions/schema) then `pnpm build` |
| `preview` / `development` | `pnpm build` only — uses `VITE_CONVEX_URL` from the Vercel env |

### Recommended split: keep current project for dev, separate project for prod

1. **Dev (current Convex project)** — local `convex dev`, Vercel Development if you use it, Clerk Development keys.
2. **Prod (new Convex project)** — create a second Convex project; deploy once with a production deploy key; set `CLERK_FRONTEND_API_URL` (and other Convex env vars) on that project's **Production** deployment; use Clerk **Production** keys.
3. **Vercel Production** — `CONVEX_DEPLOY_KEY` for the **prod** project; Clerk Production keys; leave Convex deploy to `vercel-build`.
4. **Vercel Preview** — same production data and auth as prod:
   - Set `VITE_CONVEX_URL` (and `VITE_CONVEX_SITE_URL` if used) to the **prod** Convex URLs
   - Set Clerk Preview env to the **same Production** Clerk keys as prod
   - Do **not** attach a preview-scoped `CONVEX_DEPLOY_KEY` (or disconnect Preview from the Convex marketplace integration’s preview deploys). Preview builds must not create empty Convex backends or push branch code onto production.

Preview therefore shows production data. Mutations from a preview URL hit production — that is intentional with this model.

## Deferred (not in initial scaffold)

- Place search (Photon / Nominatim)
- Routing (OSRM / Valhalla)
- Photo upload UI and moderation admin
- Production map tile API keys

## Repository

https://github.com/dmytro-afonin/happy-parent
