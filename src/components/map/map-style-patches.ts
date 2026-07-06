import type { ExpressionSpecification } from "maplibre-gl"
import type maplibregl from "maplibre-gl"

import { isMapAlive } from "@/lib/map-utils"

const TRANSPARENT_PIXEL: maplibregl.StyleImageInterface = {
  width: 1,
  height: 1,
  data: new Uint8Array(4),
}

const NUMERIC_COMPARISON_OPS = new Set([">=", "<=", ">", "<", "==", "!="])

/** Read a feature property only when MapLibre reports it as a number. */
function numericFeatureProperty(
  property: string,
  fallback: number
): ExpressionSpecification {
  return [
    "case",
    ["==", ["typeof", ["get", property]], "number"],
    ["get", property],
    fallback,
  ]
}

function buildingExtrusionHeight(): ExpressionSpecification {
  return [
    "case",
    ["==", ["typeof", ["get", "render_height"]], "number"],
    ["get", "render_height"],
    ["==", ["typeof", ["get", "height"]], "number"],
    ["get", "height"],
    0,
  ]
}

function isRawFeatureGet(value: unknown): value is ["get", string] {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    value[0] === "get" &&
    typeof value[1] === "string"
  )
}

function isNumericLiteral(value: unknown): value is number {
  return typeof value === "number"
}

/**
 * OpenFreeMap filters compare raw feature properties to numbers. Null tile
 * values trigger "Expected number, found null" during filter evaluation.
 */
function hardenNumericComparisons(
  expression: unknown
): ExpressionSpecification {
  if (!Array.isArray(expression)) {
    return expression as ExpressionSpecification
  }

  if (
    typeof expression[0] === "string" &&
    NUMERIC_COMPARISON_OPS.has(expression[0]) &&
    isRawFeatureGet(expression[1]) &&
    isNumericLiteral(expression[2])
  ) {
    const [, getExpression, ...rest] = expression
    return [
      expression[0],
      ["coalesce", getExpression, 0],
      ...rest.map(hardenNumericComparisons),
    ] as ExpressionSpecification
  }

  return expression.map(hardenNumericComparisons) as ExpressionSpecification
}

function layerFilter(layer: maplibregl.LayerSpecification) {
  return "filter" in layer ? layer.filter : undefined
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

/** Replace null-unsafe OpenFreeMap expressions before tiles are evaluated. */
export function patchOpenFreeMapStyle(map: maplibregl.Map) {
  if (!isMapAlive(map)) {
    return
  }

  for (const layer of map.getStyle().layers) {
    const filter = layerFilter(layer)
    if (filter) {
      map.setFilter(layer.id, hardenNumericComparisons(filter))
    }
  }

  if (!map.getLayer("building-3d")) {
    return
  }

  map.setPaintProperty(
    "building-3d",
    "fill-extrusion-height",
    buildingExtrusionHeight()
  )
  map.setPaintProperty(
    "building-3d",
    "fill-extrusion-base",
    numericFeatureProperty("render_min_height", 0)
  )
}

/** Patch after every style load so expressions are fixed before tiles evaluate. */
export function installOpenFreeMapStylePatches(map: maplibregl.Map) {
  const onStyleLoad = () => {
    patchOpenFreeMapStyle(map)
  }

  map.on("style.load", onStyleLoad)

  if (map.isStyleLoaded()) {
    patchOpenFreeMapStyle(map)
  }

  return () => {
    map.off("style.load", onStyleLoad)
  }
}
