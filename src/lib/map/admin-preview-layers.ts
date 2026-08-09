import type maplibregl from "maplibre-gl"

import type { GeometryType, LatLng } from "@/lib/geometry"
import { isMapAlive } from "@/lib/map-utils"
import {
  ensureLayer,
  removeLayersAndSource,
  upsertGeoJsonSource,
} from "@/lib/map/map-layer-utils"

export type AdminPreviewState = {
  geometryType: GeometryType
  point: LatLng | null
  vertices: LatLng[]
}

const PREVIEW_SOURCE = "admin-preview-source"
const POINT_LAYER = "admin-preview-point"
const POLYGON_FILL_LAYER = "admin-preview-polygon-fill"
const POLYGON_LINE_LAYER = "admin-preview-polygon-line"

const PREVIEW_LAYER_IDS = [POINT_LAYER, POLYGON_FILL_LAYER, POLYGON_LINE_LAYER]

export function clearAdminPreviewLayers(map: maplibregl.Map) {
  if (!isMapAlive(map)) {
    return
  }

  removeLayersAndSource(map, PREVIEW_LAYER_IDS, PREVIEW_SOURCE)
}

export function renderAdminPreviewLayers(
  map: maplibregl.Map,
  { geometryType, point, vertices }: AdminPreviewState
) {
  clearAdminPreviewLayers(map)

  if (geometryType === "point" && point) {
    upsertGeoJsonSource(map, PREVIEW_SOURCE, {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [point.lng, point.lat],
          },
          properties: {},
        },
      ],
    })

    ensureLayer(map, {
      id: POINT_LAYER,
      type: "circle",
      source: PREVIEW_SOURCE,
      paint: {
        "circle-color": "#2563eb",
        "circle-radius": 10,
        "circle-stroke-width": 3,
        "circle-stroke-color": "#ffffff",
      },
    })
    return
  }

  if (geometryType === "polygon" && vertices.length >= 3) {
    upsertGeoJsonSource(map, PREVIEW_SOURCE, {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                ...vertices.map((vertex) => [vertex.lng, vertex.lat]),
                [vertices[0]?.lng ?? 0, vertices[0]?.lat ?? 0],
              ],
            ],
          },
          properties: {},
        },
      ],
    })

    ensureLayer(map, {
      id: POLYGON_FILL_LAYER,
      type: "fill",
      source: PREVIEW_SOURCE,
      paint: {
        "fill-color": "#2563eb",
        "fill-opacity": 0.2,
      },
    })

    ensureLayer(map, {
      id: POLYGON_LINE_LAYER,
      type: "line",
      source: PREVIEW_SOURCE,
      paint: {
        "line-color": "#2563eb",
        "line-width": 2,
      },
    })
  }
}

export const adminPreviewLayerHandlers = {
  render: renderAdminPreviewLayers,
  clear: clearAdminPreviewLayers,
}
