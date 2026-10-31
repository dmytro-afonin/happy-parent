# Happy Parent

Public map of family places in Warsaw. Next.js App Router on Vercel, Convex for
data, Clerk for sign-in, MapLibre + OpenFreeMap for the map.

Places, catalog (categories/attributes), comments, photos, and favourites live
in Convex. Copy is multilingual (pl/en/uk/ru/be). User contributions go through
an admin moderation queue before they become public.

## Stack

- Next.js (App Router), Node 26, pnpm
- Convex (data + file storage for photos), Clerk, Sentry (optional), PostHog (optional)
- MapLibre + OpenFreeMap; Terra Draw on `/admin` for area geometry
- Optional `LOCATIONIQ_API_KEY` for Warsaw address search (`/api/geocode`)

## Local development

```bash
# Node 26 with Corepack. packageManager pins pnpm@12.16.1.
corepack enable
pnpm install --frozen-lockfile

# Terminal 1 — Convex (writes NEXT_PUBLIC_CONVEX_URL into .env.local)
CONVEX_AGENT_MODE=anonymous pnpm exec convex dev
# When prompted about AI files: answer n
pnpm exec convex env set CLERK_FRONTEND_API_URL "$CLERK_FRONTEND_API_URL"

# Terminal 2 — Next.js
pnpm dev
```

Open http://localhost:3000. Seed demo places:

```bash
pnpm exec convex run seed:run
```

To become admin locally (anonymous Convex has no shared dashboard user list),
set your Clerk **user id** (Dashboard → Users → `user_…`):

```bash
pnpm exec convex env set ADMIN_CLERK_USER_IDS "user_xxxxxxxx"
pnpm exec convex run seed:promoteAdminsFromEnv   # after you’ve signed in once
```

Cloud Agents: secret `ADMIN_CLERK_USER_IDS`; `scripts/cloud-agent-start.sh`
copies it onto Convex. Email allowlists are not used (JWT omits email claims).

Cloud Agents use `scripts/cloud-agent-install.sh` and `scripts/cloud-agent-start.sh`
(anonymous Convex + Next on ports 3210 / 3000).

## Scripts

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Next.js on port 3000 |
| `pnpm typecheck` | TypeScript |
| `pnpm lint` | ESLint |
| `pnpm build` | Production build |

## Convex migrations

Schema changes that rename or require fields must go through
**expand → migrate → contract** (see `convex/migrations.ts` and `AGENTS.md`).
Do not clear production tables to unblock a deploy.

```bash
# After defining migrations.define(...) and deploying:
pnpm dlx convex run migrations:myMigration '{"dryRun":true}' --prod
pnpm dlx convex run migrations:myMigration --prod
pnpm dlx convex run --component migrations lib:getStatus --prod
```

Migrations run from [`scripts/vercel-build.sh`](scripts/vercel-build.sh):

- **Preview** — `--preview-run migrations:runAll` on newly created previews
  only (reused branch previews skip it; do not `--preview-create` every
  build — that wipes Clerk env on the Convex deployment)
- **Production** — after deploy, `convex run migrations:runAll` (always)

Production `CONVEX_DEPLOY_KEY` must include run/write permissions
(`deployment:functions:runInternalMutations`, `deployment:data:write`).
Set Convex project **preview** env defaults for `CLERK_FRONTEND_API_URL`.

Register migrations in `POST_DEPLOY_MIGRATIONS` inside `convex/migrations.ts`.
Manual: `pnpm migrate:prod` (includes `--prod`).

## Env

See `.env.example`. Required for a working map + auth:

- `NEXT_PUBLIC_CONVEX_URL` (from `convex dev`)
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `CLERK_FRONTEND_API_URL` on the **Convex deployment**
