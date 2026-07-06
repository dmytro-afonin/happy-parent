import type {
  AddLayerObject,
  GeoJSONSource,
  GeoJSONSourceSpecification,
  Map as MaplibreMap,
} from "maplibre-gl"

import { isMapAlive } from "@/lib/map-utils"

type GeoJsonData = GeoJSON.FeatureCollection | GeoJSON.Feature

export function removeLayerIfExists(map: MaplibreMap, layerId: string) {
  if (!isMapAlive(map) || !map.getLayer(layerId)) {
    return
  }

  map.removeLayer(layerId)
}

export function removeSourceIfExists(map: MaplibreMap, sourceId: string) {
  if (!isMapAlive(map) || !map.getSource(sourceId)) {
    return
  }

  map.removeSource(sourceId)
}

export function removeLayersAndSource(
  map: MaplibreMap,
  layerIds: readonly string[],
  sourceId: string
) {
  for (const layerId of layerIds) {
    removeLayerIfExists(map, layerId)
  }

  removeSourceIfExists(map, sourceId)
}

export function upsertGeoJsonSource(
  map: MaplibreMap,
  sourceId: string,
  data: GeoJsonData,
  options?: Omit<GeoJSONSourceSpecification, "type" | "data">
) {
  if (!isMapAlive(map)) {
    return false
  }

  const existing = map.getSource(sourceId)
  if (existing?.type === "geojson") {
    ;(existing as GeoJSONSource).setData(data)
    return true
  }

  map.addSource(sourceId, {
    type: "geojson",
    data,
    ...options,
  })
  return true
}

export function ensureLayer(map: MaplibreMap, layer: AddLayerObject) {
  if (!isMapAlive(map) || map.getLayer(layer.id)) {
    return
  }

  map.addLayer(layer)
}

export function isStyleReady(map: MaplibreMap) {
  return isMapAlive(map) && map.isStyleLoaded()
}
