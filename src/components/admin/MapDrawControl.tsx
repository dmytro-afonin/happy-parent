"use client"

import { useEffect, useRef } from "react"
import MapboxDraw from "@mapbox/mapbox-gl-draw"
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css"
import type * as maplibregl from "maplibre-gl"

import { geoJsonRingToVertices } from "@/lib/geometry"
import type { LatLng } from "@/lib/geometry"

MapboxDraw.constants.classes.CONTROL_BASE =
  "maplibregl-ctrl" as typeof MapboxDraw.constants.classes.CONTROL_BASE
MapboxDraw.constants.classes.CONTROL_PREFIX =
  "maplibregl-ctrl-" as typeof MapboxDraw.constants.classes.CONTROL_PREFIX
MapboxDraw.constants.classes.CONTROL_GROUP =
  "maplibregl-ctrl-group" as typeof MapboxDraw.constants.classes.CONTROL_GROUP

type DrawStyle = {
  id: string
  paint?: Record<string, unknown>
}

function getMaplibreDrawStyles() {
  const theme = MapboxDraw.lib.theme as DrawStyle[]

  return theme.map((style) => {
    if (style.id !== "gl-draw-lines" || !style.paint) {
      return style
    }

    return {
      ...style,
      paint: {
        ...style.paint,
        "line-dasharray": [
          "case",
          ["==", ["get", "active"], "true"],
          ["literal", [0.2, 2]],
          ["literal", [2, 0]],
        ],
      },
    }
  })
}

type MapDrawControlProps = {
  map: maplibregl.Map
  enabled: boolean
  vertices: LatLng[]
  onVerticesChange: (vertices: LatLng[]) => void
}

/** MapboxDraw custom events are not part of MapLibre's MapEventType (v6). */
type DrawEventMap = {
  on(
    type: "draw.create" | "draw.update" | "draw.delete",
    listener: () => void
  ): void
  off(
    type: "draw.create" | "draw.update" | "draw.delete",
    listener: () => void
  ): void
}

function readPolygonVertices(draw: MapboxDraw): LatLng[] {
  try {
    const data = draw.getAll()
    const polygon = data.features.find(
      (feature) => feature.geometry.type === "Polygon"
    )

    if (!polygon || polygon.geometry.type !== "Polygon") {
      return []
    }

    return geoJsonRingToVertices(polygon.geometry.coordinates[0])
  } catch {
    return []
  }
}

export function MapDrawControl({
  map,
  enabled,
  vertices,
  onVerticesChange,
}: MapDrawControlProps) {
  const drawRef = useRef<MapboxDraw | null>(null)
  const onVerticesChangeRef = useRef(onVerticesChange)
  const verticesRef = useRef(vertices)
  onVerticesChangeRef.current = onVerticesChange
  verticesRef.current = vertices

  useEffect(() => {
    if (!enabled) {
      return
    }

    const draw = new MapboxDraw({
      displayControlsDefault: false,
      controls: {
        polygon: true,
        trash: true,
      },
      defaultMode: "draw_polygon",
      styles: getMaplibreDrawStyles(),
    })

    drawRef.current = draw
    map.addControl(draw as unknown as maplibregl.IControl, "top-left")

    const syncFromDraw = () => {
      onVerticesChangeRef.current(readPolygonVertices(draw))
    }

    const drawEvents = map as unknown as DrawEventMap
    drawEvents.on("draw.create", syncFromDraw)
    drawEvents.on("draw.update", syncFromDraw)
    drawEvents.on("draw.delete", syncFromDraw)

    // Seed once on mount; ongoing vertex edits are handled by the effect below.
    const initialVertices = verticesRef.current
    if (initialVertices.length >= 3) {
      draw.add({
        type: "Feature",
        properties: {},
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              ...initialVertices.map((vertex) => [vertex.lng, vertex.lat]),
              [initialVertices[0]?.lng ?? 0, initialVertices[0]?.lat ?? 0],
            ],
          ],
        },
      })
      draw.changeMode("simple_select")
    }

    return () => {
      drawEvents.off("draw.create", syncFromDraw)
      drawEvents.off("draw.update", syncFromDraw)
      drawEvents.off("draw.delete", syncFromDraw)

      try {
        map.removeControl(draw as unknown as maplibregl.IControl)
      } catch {
        // Map may already be torn down when switching geometry modes.
      }

      if (drawRef.current === draw) {
        drawRef.current = null
      }
    }
  }, [enabled, map])

  useEffect(() => {
    const draw = drawRef.current
    if (!draw || !enabled || vertices.length < 3) {
      return
    }

    const current = readPolygonVertices(draw)
    const sameLength = current.length === vertices.length
    const sameValues =
      sameLength &&
      current.every(
        (vertex, index) =>
          vertex.lat === vertices[index]?.lat &&
          vertex.lng === vertices[index]?.lng
      )

    if (sameValues) {
      return
    }

    draw.deleteAll()
    draw.add({
      type: "Feature",
      properties: {},
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            ...vertices.map((vertex) => [vertex.lng, vertex.lat]),
            [vertices[0]?.lng ?? 0, vertices[0]?.lat ?? 0],
          ],
        ],
      },
    })
    draw.changeMode("simple_select")
  }, [enabled, vertices])

  return null
}
