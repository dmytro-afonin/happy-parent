import type * as maplibregl from "maplibre-gl"

export function isMapAlive(
  map: maplibregl.Map | null | undefined
): map is maplibregl.Map {
  if (!map) {
    return false
  }

  try {
    // getStyle() is typed as non-null but returns undefined once the map is
    // destroyed, hence the widening assertion.
    const style = map.getStyle() as maplibregl.StyleSpecification | undefined
    return style != null
  } catch {
    return false
  }
}
