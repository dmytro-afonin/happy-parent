# Happy Parent

Public map of family places in Warsaw. Next.js App Router on Vercel, Convex for
data, Clerk for sign-in, MapLibre + OpenFreeMap for the map.

## Stack

- Next.js (App Router), Node 24, pnpm
- Convex, Clerk, Sentry (optional), PostHog (optional)
- MapLibre + OpenFreeMap; Terra Draw on `/admin` only

## Local development

```bash
# Node 24
export PATH="$HOME/.nvm/versions/node/v24.19.0/bin:$PATH"

pnpm install

# Terminal 1 — Convex (writes NEXT_PUBLIC_CONVEX_URL into .env.local)
CONVEX_AGENT_MODE=anonymous pnpm dlx convex dev
# When prompted about AI files: answer n
pnpm dlx convex env set CLERK_FRONTEND_API_URL "$CLERK_FRONTEND_API_URL"

# Terminal 2 — Next.js
pnpm dev
```

Open http://localhost:3000. Seed demo places:

```bash
pnpm dlx convex run seed:run
```

## Scripts

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Next.js on port 3000 |
| `pnpm typecheck` | TypeScript |
| `pnpm lint` | ESLint |
| `pnpm build` | Production build |

## Env

See `.env.example`. Required for a working map + auth:

- `NEXT_PUBLIC_CONVEX_URL` (from `convex dev`)
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `CLERK_FRONTEND_API_URL` on the **Convex deployment**
