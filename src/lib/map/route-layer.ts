import type maplibregl from "maplibre-gl"

import { isMapAlive } from "@/lib/map-utils"

const ROUTE_SOURCE_ID = "in-app-route-source"
const ROUTE_LINE_LAYER_ID = "in-app-route-line"
const ROUTE_CASING_LAYER_ID = "in-app-route-casing"

/**
 * Builds a walking route with the public OSRM demo server and MapLibre —
 * an in-app alternative to opening Google/Apple Maps.
 */
const OSRM_BASE_URL =
  import.meta.env.VITE_OSRM_BASE_URL ??
  "https://router.project-osrm.org/route/v1/foot"

export type RouteResult = {
  geometry: GeoJSON.LineString
  distanceMeters: number
  durationSeconds: number
}

export async function fetchWalkingRoute(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
  options?: { signal?: AbortSignal }
): Promise<RouteResult> {
  const url = `${OSRM_BASE_URL}/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`

  const timeoutSignal = AbortSignal.timeout(15_000)
  const signal = options?.signal
    ? AbortSignal.any([timeoutSignal, options.signal])
    : timeoutSignal

  const response = await fetch(url, { signal })
  if (!response.ok) {
    throw new Error(`Routing request failed (${response.status})`)
  }

  const data = (await response.json()) as {
    code?: string
    routes?: Array<{
      geometry: GeoJSON.LineString
      distance: number
      duration: number
    }>
  }

  const route = data.routes?.[0]
  if (data.code !== "Ok" || !route) {
    throw new Error("No route found")
  }

  return {
    geometry: route.geometry,
    distanceMeters: route.distance,
    durationSeconds: route.duration,
  }
}

export function drawRoute(map: maplibregl.Map, route: RouteResult) {
  if (!isMapAlive(map)) {
    return
  }

  const data: GeoJSON.Feature = {
    type: "Feature",
    geometry: route.geometry,
    properties: {},
  }

  const source = map.getSource<maplibregl.GeoJSONSource>(ROUTE_SOURCE_ID)

  if (source) {
    source.setData(data)
  } else {
    map.addSource(ROUTE_SOURCE_ID, { type: "geojson", data })
  }

  if (!map.getLayer(ROUTE_CASING_LAYER_ID)) {
    map.addLayer({
      id: ROUTE_CASING_LAYER_ID,
      type: "line",
      source: ROUTE_SOURCE_ID,
      layout: { "line-join": "round", "line-cap": "round" },
      paint: {
        "line-color": "#ffffff",
        "line-width": 7,
        "line-opacity": 0.9,
      },
    })
  }

  if (!map.getLayer(ROUTE_LINE_LAYER_ID)) {
    map.addLayer({
      id: ROUTE_LINE_LAYER_ID,
      type: "line",
      source: ROUTE_SOURCE_ID,
      layout: { "line-join": "round", "line-cap": "round" },
      paint: {
        "line-color": "#2563eb",
        "line-width": 4,
        "line-dasharray": [0.5, 1.5],
      },
    })
  }

  const coordinates = route.geometry.coordinates
  if (coordinates.length > 1) {
    let minLng = coordinates[0][0]
    let minLat = coordinates[0][1]
    let maxLng = minLng
    let maxLat = minLat

    for (const [lng, lat] of coordinates) {
      minLng = Math.min(minLng, lng)
      minLat = Math.min(minLat, lat)
      maxLng = Math.max(maxLng, lng)
      maxLat = Math.max(maxLat, lat)
    }

    map.fitBounds(
      [
        [minLng, minLat],
        [maxLng, maxLat],
      ],
      { padding: 80, duration: 600 }
    )
  }
}

export function clearRoute(map: maplibregl.Map) {
  if (!isMapAlive(map)) {
    return
  }

  for (const layerId of [ROUTE_LINE_LAYER_ID, ROUTE_CASING_LAYER_ID]) {
    if (map.getLayer(layerId)) {
      map.removeLayer(layerId)
    }
  }

  if (map.getSource(ROUTE_SOURCE_ID)) {
    map.removeSource(ROUTE_SOURCE_ID)
  }
}

export function formatRouteSummary(
  route: RouteResult,
  options?: {
    locale?: string
    units?: { km: string; m: string; min: string }
  }
) {
  const km = route.distanceMeters / 1000
  const minutes = Math.round(route.durationSeconds / 60)
  const units = options?.units ?? { km: "km", m: "m", min: "min" }
  const distance =
    km >= 1
      ? `${km.toFixed(1)} ${units.km}`
      : `${Math.round(route.distanceMeters)} ${units.m}`
  return `${distance} · ${minutes} ${units.min}`
}
