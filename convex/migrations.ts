/**
 * Online migrations for schema/data changes.
 *
 * Rules (do not break these):
 * - Never wipe or clear a table here. No collect-all + delete loops.
 * - Never turn off schema validation to force a deploy. Use expand → migrate → contract.
 * - Always dry-run on prod first:
 *     `pnpm dlx convex run migrations:<name> '{"dryRun":true}' --prod`
 * - Append finished migrations to `POST_DEPLOY_MIGRATIONS` so preview deploys
 *   (via `--preview-run`) and manual prod runs replay safely (already-done skip).
 * - Do not chain `convex run` after `convex deploy` in Vercel CI: deploy keys
 *   get ServiceTokenNotAllowed on `provision_and_authorize`. Use `--preview-run`
 *   for previews; run prod migrations with a logged-in member CLI.
 *
 * Expand → migrate → contract:
 * 1. Widen schema (optional/union) + dual-read/write in app code; deploy.
 * 2. Add `migrations.define({...})` below; deploy; dry-run; then run for real.
 * 3. Narrow schema + code to the new shape only; deploy
 *    (Convex refuses the push if existing docs still mismatch).
 *
 * Define a migration:
 *   export const backfillThing = migrations.define({
 *     table: "places",
 *     migrateOne: async (ctx, doc) => {
 *       if (doc.newField === undefined) return { newField: "default" };
 *     },
 *   });
 * Then append `internal.migrations.backfillThing` to `POST_DEPLOY_MIGRATIONS`.
 */
import { Migrations } from "@convex-dev/migrations";
import type { MigrationFunctionReference } from "@convex-dev/migrations";
import { components } from "./_generated/api";
import { internalMutation } from "./_generated/server";
import schema from "./schema";

export const migrations = new Migrations(components.migrations, {
  schema,
  migrationsLocationPrefix: "migrations:",
});

/** Run one migration by short name: `pnpm dlx convex run migrations:run '{"fn":"backfillThing"}'` */
export const run = migrations.runner();

/**
 * Ordered migrations applied after each production Convex deploy.
 * Only idempotent transforms. Never wipe/clear helpers.
 */
const POST_DEPLOY_MIGRATIONS: MigrationFunctionReference[] = [
  // internal.migrations.backfillThing,
];

/** Post-deploy entrypoint. No-ops when the list is empty. */
export const runAll = internalMutation({
  args: {},
  handler: async (ctx) => {
    if (POST_DEPLOY_MIGRATIONS.length === 0) {
      return { ran: 0 as const, message: "No migrations registered" };
    }
    await migrations.runSerially(ctx, POST_DEPLOY_MIGRATIONS);
    return { ran: POST_DEPLOY_MIGRATIONS.length };
  },
});
