export type LatLng = { lat: number; lng: number }

export type GeometryType = "point" | "polygon"

export type LocationInputMode = "map" | "coordinates"

export function computeCentroid(vertices: LatLng[]): LatLng {
  if (vertices.length === 0) {
    return { lat: 0, lng: 0 }
  }

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

export function verticesToGeoJsonRing(vertices: LatLng[]): number[][] {
  if (vertices.length === 0) {
    return []
  }

  const ring = vertices.map((vertex) => [vertex.lng, vertex.lat])
  const first = ring[0]
  const last = ring[ring.length - 1]

  if (first[0] !== last[0] || first[1] !== last[1]) {
    ring.push(first)
  }

  return ring
}

export function geoJsonRingToVertices(
  ring: number[][] | null | undefined
): LatLng[] {
  if (!ring || ring.length === 0) {
    return []
  }

  const vertices: LatLng[] = []

  for (const coord of ring) {
    if (!coord || coord.length < 2) {
      continue
    }

    const lng = coord[0]
    const lat = coord[1]

    if (typeof lng !== "number" || typeof lat !== "number") {
      continue
    }

    if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
      continue
    }

    vertices.push({ lat, lng })
  }

  if (vertices.length === 0) {
    return []
  }

  const first = vertices[0]
  const last = vertices[vertices.length - 1]

  if (first.lat === last.lat && first.lng === last.lng) {
    return vertices.slice(0, -1)
  }

  return vertices
}

export function validatePlaceGeometry(
  geometryType: GeometryType,
  point: LatLng | null,
  vertices: LatLng[]
): string | null {
  if (geometryType === "point") {
    if (!point) {
      return "Select a point on the map or enter coordinates."
    }

    if (point.lat < -90 || point.lat > 90) {
      return "Latitude must be between -90 and 90."
    }

    if (point.lng < -180 || point.lng > 180) {
      return "Longitude must be between -180 and 180."
    }

    return null
  }

  if (vertices.length < 3) {
    return "Draw or enter at least 3 coordinate pairs for an area."
  }

  for (const vertex of vertices) {
    if (vertex.lat < -90 || vertex.lat > 90) {
      return "Latitude must be between -90 and 90."
    }

    if (vertex.lng < -180 || vertex.lng > 180) {
      return "Longitude must be between -180 and 180."
    }
  }

  return null
}
