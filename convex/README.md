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
in batches, then narrow. Preview deploys use `--preview-run migrations:runAll`;
production runs `pnpm dlx convex run migrations:runAll --prod` as a team member
(deploy keys cannot call `convex run`).
