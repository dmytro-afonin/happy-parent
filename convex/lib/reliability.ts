import type { MutationCtx } from "../_generated/server"
import type { Id } from "../_generated/dataModel"

export type ReliabilityBucket =
  | "place"
  | "comment"
  | "title"
  | "description"
  | "location"
  | "photo"
  | "label"
  | "translation"

const CHANGE_BUCKETS = new Set<ReliabilityBucket>([
  "title",
  "description",
  "location",
  "photo",
  "label",
  "translation",
])

function requestedKey(bucket: ReliabilityBucket) {
  switch (bucket) {
    case "place":
      return "placesRequested" as const
    case "comment":
      return "commentsRequested" as const
    case "title":
      return "titleChangesRequested" as const
    case "description":
      return "descriptionChangesRequested" as const
    case "location":
      return "locationChangesRequested" as const
    case "photo":
      return "photoChangesRequested" as const
    case "label":
      return "labelChangesRequested" as const
    case "translation":
      return "translationChangesRequested" as const
  }
}

function approvedKey(bucket: ReliabilityBucket) {
  switch (bucket) {
    case "place":
      return "placesApproved" as const
    case "comment":
      return "commentsApproved" as const
    case "title":
      return "titleChangesApproved" as const
    case "description":
      return "descriptionChangesApproved" as const
    case "location":
      return "locationChangesApproved" as const
    case "photo":
      return "photoChangesApproved" as const
    case "label":
      return "labelChangesApproved" as const
    case "translation":
      return "translationChangesApproved" as const
  }
}

async function bump(
  ctx: MutationCtx,
  userId: Id<"users">,
  bucket: ReliabilityBucket,
  phase: "requested" | "approved"
) {
  const user = await ctx.db.get("users", userId)
  if (!user) {
    return
  }

  const key = phase === "requested" ? requestedKey(bucket) : approvedKey(bucket)
  const rollupKey =
    phase === "requested" ? "changesRequested" : "changesApproved"

  await ctx.db.patch("users", userId, {
    [key]: (user[key] ?? 0) + 1,
    ...(CHANGE_BUCKETS.has(bucket)
      ? { [rollupKey]: (user[rollupKey] ?? 0) + 1 }
      : {}),
  })
}

export async function noteRequested(
  ctx: MutationCtx,
  userId: Id<"users">,
  bucket: ReliabilityBucket
) {
  await bump(ctx, userId, bucket, "requested")
}

export async function noteApproved(
  ctx: MutationCtx,
  userId: Id<"users">,
  bucket: ReliabilityBucket
) {
  await bump(ctx, userId, bucket, "approved")
}

export function bucketForSuggestionKind(
  kind: "name" | "description" | "location" | "label" | "translation"
): ReliabilityBucket {
  switch (kind) {
    case "name":
      return "title"
    case "description":
      return "description"
    case "location":
      return "location"
    case "label":
      return "label"
    case "translation":
      return "translation"
  }
}
