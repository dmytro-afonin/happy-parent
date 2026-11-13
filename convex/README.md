# Convex backend

Local anonymous deployment:

```bash
CONVEX_AGENT_MODE=anonymous pnpm dlx convex dev
pnpm dlx convex env set CLERK_FRONTEND_API_URL "$CLERK_FRONTEND_API_URL"
pnpm dlx convex run seed:run
```

To remove seeded places (not the catalog, and not on production):

```bash
pnpm dlx convex run seed:clearDemo
```

`seed:run` inserts catalog slugs (if missing) and Warsaw demo places. It does
not delete. Both commands refuse the production deployment
(`calculating-lark-523.convex.cloud`). New Convex previews run
`previewSeed:previewBootstrap` (migrations, then `seed:run`) via `--preview-run`.
See the repo README for ODbL attribution and how to fill a reused preview.

## Migrations

See [`migrations.ts`](./migrations.ts). Component is registered in
[`convex.config.ts`](./convex.config.ts).

Never wipe tables to fix schema mismatches. Widen the schema, migrate documents
in batches, then narrow. See `scripts/vercel-build.sh`: production always runs
`migrations:runAll` after deploy and does not seed. A new preview runs
`previewSeed:previewBootstrap` (migrations, then `seed:run`). Reused previews skip
that. Avoid `--preview-create` on every build — it drops deployment env such
as `CLERK_FRONTEND_API_URL`.
