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
in batches, then narrow. See `scripts/vercel-build.sh`: production always runs
`migrations:runAll` after deploy; preview only runs it when Convex creates a
new preview (avoid `--preview-create` on every build — it drops deployment
env such as `CLERK_FRONTEND_API_URL`).
