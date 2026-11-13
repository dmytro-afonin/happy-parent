import { internal } from "./_generated/api";
import { internalMutation } from "./_generated/server";
import { assertDemoSeedAllowed } from "./lib/seedGuard";

type MigrationsResult = { ran: number; message?: string };

type SeedResult = {
  catalogInserted: number;
  placesInserted: number;
  favoritesInserted: number;
  catalogTotal: number;
  placesTotal: number;
};

/**
 * New Convex preview deployments only (`--preview-run`).
 * Runs migrations, then the insert-only seed. Production deploys do not
 * call this, and the seed refuses the production deployment anyway.
 */
export const previewBootstrap = internalMutation({
  args: {},
  handler: async (ctx): Promise<{
    migrations: MigrationsResult;
    seed: SeedResult;
  }> => {
    assertDemoSeedAllowed(process.env.CONVEX_CLOUD_URL);
    const migrationsResult: MigrationsResult = await ctx.runMutation(
      internal.migrations.runAll,
      {},
    );
    const seedResult: SeedResult = await ctx.runMutation(internal.seed.run, {});
    return { migrations: migrationsResult, seed: seedResult };
  },
});
