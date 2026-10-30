/**
 * Online migrations for schema/data changes.
 *
 * Rules (do not break these):
 * - Never wipe or clear a table here. No collect-all + delete loops.
 * - Never turn off schema validation to force a deploy. Use expand → migrate → contract.
 * - Always dry-run on prod first:
 *     `pnpm dlx convex run migrations:<name> '{"dryRun":true}' --prod`
 * - Append finished migrations to `POST_DEPLOY_MIGRATIONS` so deploys replay
 *   safely (already-done migrations are skipped).
 * - Preview CI (`scripts/vercel-build.sh`): `--preview-run` only when Convex
 *   creates a new preview (reuse skips it). Do not `--preview-create` every
 *   build — that drops deployment env (Clerk) and wipes data. Preview keys
 *   cannot bare-`convex run`.
 * - Production CI: after deploy, `convex run migrations:runAll` (prod deploy
 *   key must allow runInternalMutations). Manual: `pnpm migrate:prod`.
 *
 * Expand → migrate → contract:
 * 1. Widen schema (optional/union) + dual-read/write in app code; deploy.
 * 2. Add `migrations.define({...})` below; deploy; dry-run; then run for real.
 * 3. Narrow schema + code to the new shape only; deploy
 *    (Convex refuses the push if existing docs still mismatch).
 */
import { Migrations } from "@convex-dev/migrations";
import type { MigrationFunctionReference } from "@convex-dev/migrations";
import { components, internal } from "./_generated/api";
import { internalMutation } from "./_generated/server";
import { withPlaceCopy } from "./lib/copy";
import schema from "./schema";

export const migrations = new Migrations(components.migrations, {
  schema,
  migrationsLocationPrefix: "migrations:",
});

/** Run one migration by short name: `pnpm dlx convex run migrations:run '{"fn":"backfillThing"}'` */
export const run = migrations.runner();

/**
 * Copy legacy single-language fields into `copy` / `publishStatus`.
 * Catalog IDs are filled when matching slugs already exist (seed catalog first).
 */
export const backfillPlacesV2 = migrations.define({
  table: "places",
  migrateOne: async (ctx, doc) => {
    const patch: Record<string, unknown> = {};

    if (!doc.copy) {
      patch.copy = withPlaceCopy({
        en: {
          name: doc.name ?? "",
          description: doc.description ?? "",
          address: doc.address ?? "",
        },
      });
    }

    if (!doc.publishStatus) {
      patch.publishStatus =
        doc.status === "approved" ? ("public" as const) : ("draft" as const);
    }

    if (doc.categoryIds === undefined) {
      const categoryIds = [];
      if (doc.type) {
        const cat = await ctx.db
          .query("catalogItems")
          .withIndex("by_slug", (q) => q.eq("slug", doc.type as string))
          .unique();
        if (cat) categoryIds.push(cat._id);
      }
      patch.categoryIds = categoryIds;
    }

    if (doc.attributeIds === undefined) {
      const attributeIds = [];
      for (const slug of doc.attributes ?? []) {
        const attr = await ctx.db
          .query("catalogItems")
          .withIndex("by_slug", (q) => q.eq("slug", slug))
          .unique();
        if (attr) attributeIds.push(attr._id);
      }
      patch.attributeIds = attributeIds;
    }

    if (Object.keys(patch).length === 0) return;
    return patch;
  },
});

/**
 * Ordered migrations applied after each production Convex deploy.
 * Only idempotent transforms. Never wipe/clear helpers.
 */
const POST_DEPLOY_MIGRATIONS: MigrationFunctionReference[] = [
  internal.migrations.backfillPlacesV2,
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
