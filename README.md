# Happy Parent

Discover and save family-friendly places on an interactive map.

## Stack

| Layer         | Choice                                                                                                          |
| ------------- | --------------------------------------------------------------------------------------------------------------- |
| Framework     | [TanStack Start](https://tanstack.com/start)                                                                    |
| UI            | [shadcn/ui](https://ui.shadcn.com) + Tailwind CSS                                                               |
| Auth          | [Clerk](https://clerk.com) (`@clerk/tanstack-react-start`)                                                      |
| Backend       | [Convex](https://convex.dev) (database + file storage)                                                          |
| Map           | [MapLibre GL JS](https://maplibre.org)                                                                          |
| Hosting       | [Vercel](https://vercel.com) via Nitro Vite plugin                                                              |
| Lint / format | [Oxlint](https://oxc.rs/docs/guide/usage/linter.html) + [Oxfmt](https://oxc.rs/docs/guide/usage/formatter.html) |

## Prerequisites

- Node.js 24+
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
   - Create an application in the [Clerk Dashboard](https://dashboard.clerk.com) (or connect the Vercel Marketplace Clerk integration)
   - Local: add `VITE_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` to `.env.local`
   - Vercel + Marketplace: integration syncs `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` for Preview/Production — enough for this app (we alias `NEXT_PUBLIC_*` to the Vite names). You can remove any old manual `VITE_CLERK_PUBLISHABLE_KEY` on Vercel
   - Create a JWT template named exactly **`convex`**
   - Set `CLERK_FRONTEND_API_URL` on the Convex deployment to the Clerk Frontend API URL (Dashboard → API keys)

5. Run the app (two terminals):

   ```bash
   pnpm dev
   pnpm dlx convex dev
   ```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command          | Description                                                              |
| ---------------- | ------------------------------------------------------------------------ |
| `pnpm dev`       | Start TanStack Start dev server                                          |
| `pnpm build`     | Production build (Nitro + TanStack)                                      |
| `pnpm lint`      | Oxlint (type-aware; includes `@convex-dev/eslint-plugin` via JS plugins) |
| `pnpm typecheck` | TypeScript check                                                         |
| `pnpm format`    | Oxfmt format                                                             |
| `pnpm check`     | Oxfmt check (CI-friendly)                                                |

## Deploy to Vercel

Build command is `pnpm vercel-build` (via `vercel.json`). With the Convex ↔ Vercel
integration, `CONVEX_DEPLOY_KEY` is synced per environment:

| Vercel env | `CONVEX_DEPLOY_KEY`   | Build behavior                                                                            |
| ---------- | --------------------- | ----------------------------------------------------------------------------------------- |
| Production | Production deploy key | `convex deploy` → prod backend, then frontend build                                       |
| Preview    | Preview deploy key    | `convex deploy` → branch preview backend (+ `migrations:seedLabels`), then frontend build |

`convex deploy` injects `VITE_CONVEX_URL` for the frontend build. If that URL is
missing, the client falls back to `placeholder.convex.cloud` and the browser shows
`Couldn't parse deployment name placeholder`.

### Clerk (Vercel Marketplace)

Marketplace maps Clerk **Development** → Vercel Preview and Clerk **Production** →
Vercel Production. The app aliases `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` to the Vite
names, so you do not need a manual `VITE_CLERK_PUBLISHABLE_KEY` on Vercel.

Set `CLERK_FRONTEND_API_URL` on each Convex deployment (project defaults for
Preview and Production deployment env) to the matching Clerk Frontend API URL so
signed-in WebSocket auth works.

## Deferred (not in initial scaffold)

- Place search (Photon / Nominatim)
- Routing (OSRM / Valhalla)
- Photo upload UI and moderation admin
- Production map tile API keys

## Repository

https://github.com/dmytro-afonin/happy-parent
