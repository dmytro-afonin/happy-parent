import { v } from "convex/values"

export const latLngValidator = v.object({
  lat: v.number(),
  lng: v.number(),
})

export const geometryTypeValidator = v.union(
  v.literal("point"),
  v.literal("polygon")
)

export type LatLng = { lat: number; lng: number }

export function computeCentroid(vertices: LatLng[]): LatLng {
  const total = vertices.reduce(
    (acc, vertex) => ({
      lat: acc.lat + vertex.lat,
      lng: acc.lng + vertex.lng,
    }),
    { lat: 0, lng: 0 }
  )

  return {
    lat: total.lat / vertices.length,
    lng: total.lng / vertices.length,
  }
}

export function validateGeometry(
  geometryType: "point" | "polygon",
  point: LatLng | undefined,
  boundary: LatLng[] | undefined
): { lat: number; lng: number; boundary?: LatLng[] } {
  if (geometryType === "point") {
    if (!point) {
      throw new Error("Point location is required")
    }

    if (!Number.isFinite(point.lat) || !Number.isFinite(point.lng)) {
      throw new Error("Invalid point coordinates")
    }

    if (point.lat < -90 || point.lat > 90) {
      throw new Error("Latitude must be between -90 and 90")
    }

    if (point.lng < -180 || point.lng > 180) {
      throw new Error("Longitude must be between -180 and 180")
    }

    return { lat: point.lat, lng: point.lng }
  }

  if (!boundary || boundary.length < 3) {
    throw new Error("Polygon areas need at least 3 coordinate pairs")
  }

  for (const vertex of boundary) {
    if (!Number.isFinite(vertex.lat) || !Number.isFinite(vertex.lng)) {
      throw new Error("Invalid polygon coordinates")
    }

    if (vertex.lat < -90 || vertex.lat > 90) {
      throw new Error("Latitude must be between -90 and 90")
    }

    if (vertex.lng < -180 || vertex.lng > 180) {
      throw new Error("Longitude must be between -180 and 180")
    }
  }

  const centroid = computeCentroid(boundary)

  return {
    lat: centroid.lat,
    lng: centroid.lng,
    boundary,
  }
}
