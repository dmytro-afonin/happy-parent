import { action } from "./_generated/server"
import { v } from "convex/values"

import { formatNominatimPlace, formatNominatimAddress } from "./lib/nominatim"
import { placeSearchResultValidator } from "./lib/places"

type NominatimResult = {
  place_id: number
  lat: string
  lon: string
  name?: string
  display_name: string
  address?: Record<string, string>
}

export const search = action({
  args: {
    query: v.string(),
    limit: v.optional(v.number()),
    centerLat: v.optional(v.number()),
    centerLng: v.optional(v.number()),
    minLat: v.optional(v.number()),
    maxLat: v.optional(v.number()),
    minLng: v.optional(v.number()),
    maxLng: v.optional(v.number()),
    radiusKm: v.optional(v.number()),
  },
  returns: v.array(placeSearchResultValidator),
  handler: async (_ctx, args) => {
    const trimmed = args.query.trim()
    const limit = args.limit ?? 10

    if (trimmed.length === 0) {
      return []
    }

    const url = new URL("https://nominatim.openstreetmap.org/search")
    url.searchParams.set("q", trimmed)
    url.searchParams.set("format", "json")
    url.searchParams.set("addressdetails", "1")
    url.searchParams.set("limit", String(limit))

    const centerLat = args.centerLat
    const centerLng = args.centerLng
    const hasBounds =
      args.minLat !== undefined &&
      args.maxLat !== undefined &&
      args.minLng !== undefined &&
      args.maxLng !== undefined

    if (hasBounds) {
      url.searchParams.set(
        "viewbox",
        `${args.minLng},${args.maxLat},${args.maxLng},${args.minLat}`,
      )
    } else if (centerLat !== undefined && centerLng !== undefined) {
      const radiusKm = args.radiusKm ?? 30
      const latDelta = radiusKm / 111
      const lngDelta =
        radiusKm / (111 * Math.cos((centerLat * Math.PI) / 180))
      url.searchParams.set(
        "viewbox",
        `${centerLng - lngDelta},${centerLat + latDelta},${centerLng + lngDelta},${centerLat - latDelta}`,
      )
    }

    const response = await fetch(url, {
      headers: {
        "User-Agent": "HappyParent/1.0 (family-friendly places map)",
        Accept: "application/json",
      },
    })

    if (!response.ok) {
      throw new Error("Geocoding request failed")
    }

    const results = (await response.json()) as NominatimResult[]

    const mapped = results.map((result) => {
      const { label, subtitle } = formatNominatimPlace(result)

      return {
        id: `geocoding:${result.place_id}`,
        label,
        subtitle,
        lat: Number(result.lat),
        lng: Number(result.lon),
        source: "geocoding" as const,
        externalId: String(result.place_id),
      }
    })

    if (centerLat !== undefined && centerLng !== undefined) {
      mapped.sort(
        (a, b) =>
          distanceKm(centerLat, centerLng, a.lat, a.lng) -
          distanceKm(centerLat, centerLng, b.lat, b.lng),
      )
    }

    return mapped
  },
})

export const reverse = action({
  args: {
    lat: v.number(),
    lng: v.number(),
  },
  returns: v.string(),
  handler: async (_ctx, args) => {
    const url = new URL("https://nominatim.openstreetmap.org/reverse")
    url.searchParams.set("lat", String(args.lat))
    url.searchParams.set("lon", String(args.lng))
    url.searchParams.set("format", "json")
    url.searchParams.set("addressdetails", "1")
    url.searchParams.set("zoom", "18")

    const response = await fetch(url, {
      headers: {
        "User-Agent": "HappyParent/1.0 (family-friendly places map)",
        Accept: "application/json",
      },
    })

    if (!response.ok) {
      throw new Error("Reverse geocoding request failed")
    }

    const result = (await response.json()) as NominatimResult
    return formatNominatimAddress(result)
  },
})

function distanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
) {
  const toRad = (value: number) => (value * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}
