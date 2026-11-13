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

Open http://localhost:3000. Seed demo places (dev and preview only):

```bash
pnpm exec convex run seed:run
```

`seed:run` is insert-only and idempotent: a second run does not add duplicate
places and does not delete anything. It inserts the catalog when those slugs
are missing, then about 110 public Warsaw places (points and polygons) across
every category and label, with coordinates, addresses, and descriptions.
OpenStreetMap names, coordinates, and addresses are © OpenStreetMap
contributors under the ODbL (https://www.openstreetmap.org/copyright).
Descriptions and labels are synthetic. Google Maps and Google Places are not
a source.

A few favourites are stored for the seed user (`seed@happyparent.local`) only.
Recent searches live in the browser (`localStorage`) and are not seeded.

The function refuses to run when `CONVEX_CLOUD_URL` is the production
deployment `https://calculating-lark-523.convex.cloud`. Do not point it at
production. If that production deployment is ever replaced, update
`PRODUCTION_CONVEX_HOST` in `convex/lib/seedGuard.ts`.

**Preview.** A newly created Convex preview runs `previewSeed:previewBootstrap`
from [`scripts/vercel-build.sh`](scripts/vercel-build.sh) (`--preview-run`).
That runs migrations, then `seed:run`. Convex skips `--preview-run` when the
preview deployment already exists. Preview deploy keys cannot `convex run`
(`ServiceTokenNotAllowed`). To fill a reused preview, open that deployment in
the Convex dashboard and run the internal function `seed:run`. No extra
Vercel, Clerk, or Convex env var is required for the public map to show the
seed. Sign-in still needs the existing Clerk preview setup
(`CLERK_FRONTEND_API_URL` on the Convex preview).

**Clear.** Clearing is a separate command. It deletes places created by the
seed user, favourites on those places (and the seed user's favourites), and
comments, photos, and moderation rows for those places. It does not delete
the catalog or places created by anyone else. It uses the same production
refusal. `seed:run` never calls it.

```bash
pnpm exec convex run seed:clearDemo
```

On a preview deployment, run `seed:clearDemo` from the Convex dashboard.
Do not run either function on production.

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

- **Preview** — `--preview-run previewSeed:previewBootstrap` on newly created
  previews only (migrations, then the demo seed; reused branch previews skip
  it; do not `--preview-create` every build — that wipes Clerk env on the
  Convex deployment). The seed refuses production.
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
- `CLERK_FRONTEND_API_URL` on the **Convex deployment**, no trailing slash. The MCP role lookup builds `tokenIdentifier` as `<issuer>|<clerk user id>`.
- `GEOCODE_PROXY_SECRET` on Vercel (Preview and Production) and on Convex (same value). Generate with `openssl rand -base64 32`. `/api/geocode` fails closed without it.
- `MCP_RESOURCE_URL` — exact public URL of `/mcp`, no query and no trailing slash. Production: `https://parent.labdm.dev/mcp`. Local: `http://localhost:3000/mcp`. Register that same URL in the Clerk Dashboard (Agents → MCP servers) on the matching instance.
- `MCP_ROLE_SECRET` on Vercel and on Convex (same value). Generate with `openssl rand -base64 32`. Not a Convex deploy key. `/mcp` returns 503 and names the variable when it is missing.

## MCP

`/mcp` is a remote MCP server for Happy Parent admins. Sign in once with Clerk OAuth. The access token is checked on this route (`aud` must be `MCP_RESOURCE_URL`) and is not sent to Convex. The client refreshes it. Clerk’s authorization server already advertises `refresh_token` and `offline_access`; this server’s protected-resource metadata lists only `profile`, so the client has to request `offline_access` itself.

Admin access is `users.role === "admin"`. The route signs the Clerk user id from the verified token with `MCP_ROLE_SECRET` and calls `mcpAuth.roleForClerkUser`. There is no Convex session JWT and no per-user API key. A person with no `users` row gets 403 until they have signed in to the site once. Promotion stays on `ADMIN_CLERK_USER_IDS` inside `users.ensure`. MCP does not promote anyone.

No token → 401. Signed-in non-admin → 403. Missing config → 503, and the body names what is missing. The only tool in this slice is `whoami`.

Connect with the MCP URL:

- Cursor: Settings → MCP → remote server URL
- Claude: custom connector URL
- Grok Agent SDK: `defineConnection({ url, oauth: true })` where `url` is `MCP_RESOURCE_URL`

Clerk, by hand, on the production `parent` instance: Agents → MCP servers → add `https://parent.labdm.dev/mcp` and allow public clients. That turns on the `aud` claim and client-id metadata documents. Localhost is a separate resource on the development instance. Do not point a preview deployment at the production URL.
