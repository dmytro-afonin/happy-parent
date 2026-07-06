import { v } from "convex/values"

import type { MutationCtx } from "../_generated/server"
import type { Id } from "../_generated/dataModel"

export const MODERATION_STATUSES = ["pending", "approved", "rejected"] as const

export type ModerationStatus = (typeof MODERATION_STATUSES)[number]

export const moderationStatusValidator = v.union(
  v.literal("pending"),
  v.literal("approved"),
  v.literal("rejected")
)

/** Fields shared by every moderated document. */
export const moderationFields = {
  status: v.optional(moderationStatusValidator),
  rejectionComment: v.optional(v.string()),
  moderatedBy: v.optional(v.id("users")),
  moderatedAt: v.optional(v.number()),
}

/** Documents created before moderation existed have no status — treat as approved. */
export function effectiveStatus(
  status: ModerationStatus | undefined
): ModerationStatus {
  return status ?? "approved"
}

/**
 * Internal trust rating: counts how many of a user's submissions were
 * approved vs rejected. Used later for analytics and trust mechanics.
 */
export async function recordModerationOutcome(
  ctx: MutationCtx,
  submitterId: Id<"users">,
  approved: boolean
) {
  const submitter = await ctx.db.get("users", submitterId)
  if (!submitter) {
    return
  }

  if (approved) {
    await ctx.db.patch("users", submitterId, {
      submissionsApproved: (submitter.submissionsApproved ?? 0) + 1,
    })
  } else {
    await ctx.db.patch("users", submitterId, {
      submissionsRejected: (submitter.submissionsRejected ?? 0) + 1,
    })
  }
}
