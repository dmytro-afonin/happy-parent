import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { requireUser } from "./users";

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [] as Id<"places">[];

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier),
      )
      .unique();
    if (!user) return [] as Id<"places">[];

    const rows = await ctx.db
      .query("favorites")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    return rows.map((row) => row.placeId);
  },
});

export const toggle = mutation({
  args: { placeId: v.id("places") },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx);
    const place = await ctx.db.get(args.placeId);
    if (!place) throw new Error("Place not found");

    const existing = await ctx.db
      .query("favorites")
      .withIndex("by_user_place", (q) =>
        q.eq("userId", userId).eq("placeId", args.placeId),
      )
      .unique();

    if (existing) {
      await ctx.db.delete(existing._id);
      return { saved: false as const };
    }

    await ctx.db.insert("favorites", {
      userId,
      placeId: args.placeId,
      createdAt: Date.now(),
    });
    return { saved: true as const };
  },
});
