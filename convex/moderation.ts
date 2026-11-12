import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { clonePlaceCopy } from "./lib/copy";
import { LANG_LABELS } from "./lib/langs";
import { normalizePlace } from "./lib/placeDoc";
import { requireAdmin } from "./users";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const me = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier),
      )
      .unique();
    if (!me || me.role !== "admin") return null;

    const items = await ctx.db.query("moderationQueue").collect();
    const out = [];
    for (const item of items) {
      const placeDoc = await ctx.db.get(item.placeId);
      const place = placeDoc ? normalizePlace(placeDoc) : null;
      const who = await ctx.db.get(item.submittedBy);
      let photoUrl: string | null = null;
      if (item.photoId) {
        const photo = await ctx.db.get(item.photoId);
        if (photo) photoUrl = await ctx.storage.getUrl(photo.storageId);
      }
      out.push({
        _id: item._id,
        kind: item.kind,
        placeId: item.placeId,
        placeName: place
          ? place.copy.pl.name ||
            place.copy.en.name ||
            place.copy.uk.name ||
            place.copy.ru.name ||
            place.copy.be.name ||
            "Untitled place"
          : "Missing place",
        who: who?.name ?? "Parent",
        detail: item.detail,
        body: item.body,
        language: item.language,
        field: item.field,
        photoId: item.photoId,
        photoUrl,
        commentId: item.commentId,
        createdAt: item.createdAt,
      });
    }
    return out.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const approve = mutation({
  args: { id: v.id("moderationQueue") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const item = await ctx.db.get(args.id);
    if (!item) throw new Error("Queue item not found");

    const placeDoc = await ctx.db.get(item.placeId);
    if (!placeDoc) {
      await ctx.db.delete(args.id);
      throw new Error("Place missing");
    }
    const place = normalizePlace(placeDoc);
    const now = Date.now();

    if (item.kind === "place") {
      await ctx.db.patch(item.placeId, {
        publishStatus: "public",
        updatedAt: now,
      });
    } else if (
      (item.kind === "edit" || item.kind === "translation") &&
      item.language &&
      item.body &&
      item.field
    ) {
      const copy = clonePlaceCopy(place.copy);
      copy[item.language] = {
        ...copy[item.language],
        [item.field]: item.body,
      };
      await ctx.db.patch(item.placeId, { copy, updatedAt: now });
    } else if (item.kind === "photo" && item.photoId) {
      const photo = await ctx.db.get(item.photoId);
      if (photo) {
        await ctx.db.patch(item.photoId, { status: "approved" });
      }
      await ctx.db.patch(item.placeId, { updatedAt: now });
    } else if (item.kind === "comment" && item.commentId) {
      const comment = await ctx.db.get(item.commentId);
      if (comment) {
        await ctx.db.patch(item.commentId, { status: "approved" });
      }
      await ctx.db.patch(item.placeId, { updatedAt: now });
    }

    await ctx.db.delete(args.id);
    return { ok: true as const };
  },
});

export const reject = mutation({
  args: { id: v.id("moderationQueue") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const item = await ctx.db.get(args.id);
    if (!item) throw new Error("Queue item not found");

    if (item.kind === "photo" && item.photoId) {
      const photo = await ctx.db.get(item.photoId);
      if (photo) {
        await ctx.storage.delete(photo.storageId);
        await ctx.db.delete(item.photoId);
      }
    } else if (item.kind === "comment" && item.commentId) {
      const comment = await ctx.db.get(item.commentId);
      if (comment) {
        await ctx.db.patch(item.commentId, { status: "rejected" });
      }
    } else if (item.kind === "place") {
      // Leave as draft; admin can publish later or delete manually.
    }

    await ctx.db.delete(args.id);
    return { ok: true as const };
  },
});

export const kindLabel = LANG_LABELS;
