import type maplibregl from "maplibre-gl"

export function isMapAlive(
  map: maplibregl.Map | null | undefined,
): map is maplibregl.Map {
  if (!map) {
    return false
  }

  try {
    return map.getStyle() != null
  } catch {
    return false
  }
}
