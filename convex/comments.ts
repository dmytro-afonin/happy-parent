import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { isLang } from "./lib/langs";
import { normalizePlace } from "./lib/placeDoc";
import { requireUser } from "./users";

const MAX_COMMENT = 1_000;

export const listApprovedForPlace = query({
  args: { placeId: v.id("places") },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("comments")
      .withIndex("by_place_status", (q) =>
        q.eq("placeId", args.placeId).eq("status", "approved"),
      )
      .collect();

    const out = [];
    for (const row of rows) {
      const user = await ctx.db.get(row.userId);
      out.push({
        _id: row._id,
        body: row.body,
        language: row.language,
        createdAt: row.createdAt,
        who: user?.name ?? "Parent",
      });
    }
    return out.sort((a, b) => a.createdAt - b.createdAt);
  },
});

/** Comment goes to pending + moderation queue. */
export const submit = mutation({
  args: {
    placeId: v.id("places"),
    body: v.string(),
    language: v.string(),
  },
  handler: async (ctx, args) => {
    const { user, userId } = await requireUser(ctx);
    if (!isLang(args.language)) throw new Error("Unknown language");
    const body = args.body.trim();
    if (!body) throw new Error("Comment is empty");
    if (body.length > MAX_COMMENT) throw new Error("Comment is too long");

    const placeDoc = await ctx.db.get(args.placeId);
    if (!placeDoc) throw new Error("Place not found");
    const place = normalizePlace(placeDoc);
    if (place.publishStatus !== "public") {
      throw new Error("Place is not public yet");
    }

    const now = Date.now();
    const commentId = await ctx.db.insert("comments", {
      placeId: args.placeId,
      userId,
      body,
      language: args.language,
      status: "pending",
      createdAt: now,
    });

    await ctx.db.insert("moderationQueue", {
      kind: "comment",
      placeId: args.placeId,
      submittedBy: userId,
      language: args.language,
      detail: args.language,
      body,
      commentId,
      createdAt: now,
    });

    return { commentId, who: user.name ?? "You" };
  },
});
