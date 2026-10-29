# Convex backend

Local anonymous deployment:

```bash
CONVEX_AGENT_MODE=anonymous pnpm dlx convex dev
pnpm dlx convex env set CLERK_FRONTEND_API_URL "$CLERK_FRONTEND_API_URL"
pnpm dlx convex run seed:run
```

## Migrations

See [`migrations.ts`](./migrations.ts). Component is registered in
[`convex.config.ts`](./convex.config.ts).

Never wipe tables to fix schema mismatches. Widen the schema, migrate documents
in batches, then narrow. See `scripts/vercel-build.sh`: preview recreates the
branch deployment so `--preview-run` always runs; production uses
`convex run` with a prod deploy key that has run/write permissions.
