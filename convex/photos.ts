import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { normalizePlace } from "./lib/placeDoc";
import { requireAdmin, requireUser } from "./users";

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireUser(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

/** Signed-in user submits a photo → pending + moderation queue. */
export const submit = mutation({
  args: {
    placeId: v.id("places"),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const { user, userId } = await requireUser(ctx);
    const placeDoc = await ctx.db.get(args.placeId);
    if (!placeDoc) throw new Error("Place not found");
    const place = normalizePlace(placeDoc);
    if (place.publishStatus !== "public") {
      throw new Error("Place is not public yet");
    }

    const meta = await ctx.storage.getMetadata(args.storageId);
    if (!meta) throw new Error("Upload not found");

    const alreadyUsed = await ctx.db
      .query("photos")
      .filter((q) => q.eq(q.field("storageId"), args.storageId))
      .first();
    if (alreadyUsed) throw new Error("Photo already submitted");

    const now = Date.now();
    const photoId = await ctx.db.insert("photos", {
      placeId: args.placeId,
      userId,
      storageId: args.storageId,
      status: "pending",
      createdAt: now,
    });

    await ctx.db.insert("moderationQueue", {
      kind: "photo",
      placeId: args.placeId,
      submittedBy: userId,
      detail: "1 photo",
      photoId,
      createdAt: now,
    });

    return { photoId, who: user.name ?? "You" };
  },
});

export const listApprovedForPlace = query({
  args: { placeId: v.id("places") },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("photos")
      .withIndex("by_place_status", (q) =>
        q.eq("placeId", args.placeId).eq("status", "approved"),
      )
      .collect();

    const out: Array<{ _id: string; url: string | null; createdAt: number }> =
      [];
    for (const row of rows) {
      out.push({
        _id: row._id,
        url: await ctx.storage.getUrl(row.storageId),
        createdAt: row.createdAt,
      });
    }
    return out;
  },
});

/** Admin may attach an approved photo directly while editing. */
export const adminAdd = mutation({
  args: {
    placeId: v.id("places"),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const place = await ctx.db.get(args.placeId);
    if (!place) throw new Error("Place not found");
    return await ctx.db.insert("photos", {
      placeId: args.placeId,
      userId: admin._id,
      storageId: args.storageId,
      status: "approved",
      createdAt: Date.now(),
    });
  },
});
