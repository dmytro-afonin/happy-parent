import type maplibregl from "maplibre-gl"

const TRANSPARENT_PIXEL: maplibregl.StyleImageInterface = {
  width: 1,
  height: 1,
  data: new Uint8Array(4),
}

/** OpenFreeMap styles reference POI sprites that are not in the sprite sheet yet. */
export function installMissingImageHandler(map: maplibregl.Map) {
  const onStyleImageMissing = (event: maplibregl.MapStyleImageMissingEvent) => {
    if (map.hasImage(event.id)) {
      return
    }

    map.addImage(event.id, TRANSPARENT_PIXEL)
  }

  map.on("styleimagemissing", onStyleImageMissing)

  return () => {
    map.off("styleimagemissing", onStyleImageMissing)
  }
}

/** Guard extrusion layers against null heights in vector tile data. */
export function patchOpenFreeMapStyle(map: maplibregl.Map) {
  if (!map.getLayer("building-3d")) {
    return
  }

  map.setPaintProperty("building-3d", "fill-extrusion-height", [
    "coalesce",
    ["to-number", ["get", "render_height"]],
    ["to-number", ["get", "height"]],
    0,
  ])
  map.setPaintProperty("building-3d", "fill-extrusion-base", [
    "coalesce",
    ["to-number", ["get", "render_min_height"]],
    0,
  ])
}
