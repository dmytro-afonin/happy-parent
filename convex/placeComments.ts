import { mutation, query } from "./_generated/server"
import { v } from "convex/values"

import { internal } from "./_generated/api"
import { moderationStatusValidator } from "./lib/moderation"
import { isAdminRole } from "./lib/roles"
import { ensureAuthUser, getAuthUser } from "./lib/users"

const MAX_COMMENT_LENGTH = 2000

const commentValidator = v.object({
  _id: v.id("placeComments"),
  placeId: v.id("places"),
  text: v.string(),
  status: moderationStatusValidator,
  rejectionComment: v.optional(v.string()),
  createdAt: v.number(),
  authorName: v.optional(v.string()),
  isOwn: v.boolean(),
})

/**
 * Approved comments are public. A user also sees their own pending/rejected
 * comments; admins see everything.
 */
export const listByPlace = query({
  args: {
    placeId: v.id("places"),
  },
  returns: v.array(commentValidator),
  handler: async (ctx, args) => {
    const viewer = await getAuthUser(ctx)
    const isAdmin = isAdminRole(viewer?.role)

    const comments = await ctx.db
      .query("placeComments")
      .withIndex("by_place", (q) => q.eq("placeId", args.placeId))
      .collect()

    const visible = comments.filter((comment) => {
      if (comment.status === "approved") {
        return true
      }
      if (isAdmin) {
        return true
      }
      return viewer !== null && comment.authorId === viewer._id
    })

    const authorNames = new Map<string, string | undefined>()
    const results = []

    for (const comment of visible.sort((a, b) => b.createdAt - a.createdAt)) {
      if (!authorNames.has(comment.authorId)) {
        const author = await ctx.db.get("users", comment.authorId)
        authorNames.set(comment.authorId, author?.name ?? author?.email)
      }

      results.push({
        _id: comment._id,
        placeId: comment.placeId,
        text: comment.text,
        status: comment.status,
        rejectionComment: comment.rejectionComment,
        createdAt: comment.createdAt,
        authorName: authorNames.get(comment.authorId),
        isOwn: viewer !== null && comment.authorId === viewer._id,
      })
    }

    return results
  },
})

export const add = mutation({
  args: {
    placeId: v.id("places"),
    text: v.string(),
  },
  returns: v.id("placeComments"),
  handler: async (ctx, args) => {
    const userId = await ensureAuthUser(ctx)
    const user = await ctx.db.get("users", userId)
    const isAdmin = isAdminRole(user?.role)

    const place = await ctx.db.get("places", args.placeId)
    if (!place) {
      throw new Error("Place not found")
    }

    const text = args.text.trim()
    if (text.length === 0) {
      throw new Error("Comment cannot be empty")
    }
    if (text.length > MAX_COMMENT_LENGTH) {
      throw new Error("Comment is too long")
    }

    const status = isAdmin ? ("approved" as const) : ("pending" as const)

    const commentId = await ctx.db.insert("placeComments", {
      placeId: args.placeId,
      authorId: userId,
      text,
      status,
      createdAt: Date.now(),
    })

    if (status === "pending") {
      await ctx.scheduler.runAfter(0, internal.emails.notifyModerationRequest, {
        kind: "comment",
        summary: `${place.name}: ${text.slice(0, 200)}`,
        submitterName: user?.name ?? user?.email,
      })
    }

    return commentId
  },
})
