import { v } from "convex/values"

export const mapStyleIdValidator = v.union(
  v.literal("liberty"),
  v.literal("bright"),
  v.literal("positron"),
  v.literal("dark"),
  v.literal("fiord"),
  v.literal("3d")
)

export const DEFAULT_MAP_STYLE_ID = "liberty" as const
