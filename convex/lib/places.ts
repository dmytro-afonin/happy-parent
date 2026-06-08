import { v } from "convex/values"

export const placeSearchResultValidator = v.object({
  id: v.string(),
  label: v.string(),
  subtitle: v.optional(v.string()),
  lat: v.number(),
  lng: v.number(),
  source: v.union(v.literal("recent"), v.literal("geocoding")),
  query: v.optional(v.string()),
  externalId: v.optional(v.string()),
})

export type PlaceSearchResultInput = {
  label: string
  subtitle?: string
  lat: number
  lng: number
  query?: string
  externalId?: string
}
