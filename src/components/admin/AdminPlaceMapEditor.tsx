"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useAction } from "convex/react"
import type maplibregl from "maplibre-gl"
import { SearchIcon } from "lucide-react"

import { MapDrawControl } from "@/components/admin/MapDrawControl"
import { MapView } from "@/components/map/MapView"
import type { MapViewHandle } from "@/components/map/MapView"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useMapOverlay } from "@/hooks/use-map-overlay"
import { adminPreviewLayerHandlers } from "@/lib/map/admin-preview-layers"
import type { AdminPreviewState } from "@/lib/map/admin-preview-layers"
import type { GeometryType, LatLng } from "@/lib/geometry"
import { api } from "../../../convex/_generated/api"

type AdminPlaceMapEditorProps = {
  geometryType: GeometryType
  point: LatLng | null
  vertices: LatLng[]
  onPointChange: (point: LatLng) => void
  onVerticesChange: (vertices: LatLng[]) => void
}

function AdminMapOverlays({
  map,
  geometryType,
  point,
  vertices,
  onPointChange,
  onVerticesChange,
}: AdminPlaceMapEditorProps & {
  map: maplibregl.Map
}) {
  const previewState = useMemo<AdminPreviewState>(
    () => ({ geometryType, point, vertices }),
    [geometryType, point, vertices]
  )

  const previewRevision = `${geometryType}:${point?.lat ?? "x"}:${point?.lng ?? "x"}:${vertices.length}`

  useMapOverlay(map, adminPreviewLayerHandlers, previewState, previewRevision)

  useEffect(() => {
    if (geometryType !== "point") {
      return
    }

    const handleClick = (event: maplibregl.MapMouseEvent) => {
      onPointChange({ lat: event.lngLat.lat, lng: event.lngLat.lng })
    }

    map.getCanvas().style.cursor = "crosshair"
    map.on("click", handleClick)

    return () => {
      map.off("click", handleClick)
      map.getCanvas().style.cursor = ""
    }
  }, [geometryType, map, onPointChange])

  if (geometryType !== "polygon") {
    return null
  }

  return (
    <MapDrawControl
      map={map}
      enabled
      vertices={vertices}
      onVerticesChange={onVerticesChange}
    />
  )
}

export function AdminPlaceMapEditor({
  geometryType,
  point,
  vertices,
  onPointChange,
  onVerticesChange,
}: AdminPlaceMapEditorProps) {
  const mapRef = useRef<MapViewHandle>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [searching, setSearching] = useState(false)
  const searchPlaces = useAction(api.geocoding.search)

  const handleSearch = async () => {
    const query = searchQuery.trim()
    if (!query) {
      return
    }

    setSearching(true)
    try {
      const viewport = mapRef.current?.getSearchViewport()
      const results = await searchPlaces({
        query,
        limit: 1,
        centerLat: viewport?.center.lat,
        centerLng: viewport?.center.lng,
        minLat: viewport?.bounds.minLat,
        maxLat: viewport?.bounds.maxLat,
        minLng: viewport?.bounds.minLng,
        maxLng: viewport?.bounds.maxLng,
      })

      const result = results.at(0)
      if (!result) {
        return
      }

      mapRef.current?.flyTo({ lat: result.lat, lng: result.lng, zoom: 16 })

      if (geometryType === "point") {
        onPointChange({ lat: result.lat, lng: result.lng })
      }
    } finally {
      setSearching(false)
    }
  }

  useEffect(() => {
    if (geometryType === "point" && point) {
      mapRef.current?.flyTo({ lat: point.lat, lng: point.lng, zoom: 15 })
    }
  }, [geometryType, point])

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Input
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search for an address or place…"
          className="max-w-md"
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault()
              void handleSearch()
            }
          }}
        />
        <Button
          type="button"
          variant="outline"
          disabled={searching}
          onClick={() => void handleSearch()}
        >
          <SearchIcon className="size-4" />
          Search
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">
          {geometryType === "point"
            ? "Click the map to place a pin"
            : "Use polygon tools to outline an area"}
        </Badge>
        {geometryType === "point" && point ? (
          <span className="text-xs text-muted-foreground">
            {point.lat.toFixed(5)}, {point.lng.toFixed(5)}
          </span>
        ) : null}
        {geometryType === "polygon" && vertices.length > 0 ? (
          <span className="text-xs text-muted-foreground">
            {vertices.length} vertices
          </span>
        ) : null}
        {geometryType === "point" && point ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => mapRef.current?.flyTo({ ...point, zoom: 16 })}
          >
            Center map
          </Button>
        ) : null}
      </div>

      <div className="relative h-[min(52vh,520px)] overflow-hidden rounded-xl border">
        <MapView ref={mapRef} className="absolute inset-0 h-full w-full">
          {(map) => (
            <AdminMapOverlays
              map={map}
              geometryType={geometryType}
              point={point}
              vertices={vertices}
              onPointChange={onPointChange}
              onVerticesChange={onVerticesChange}
            />
          )}
        </MapView>
      </div>
    </div>
  )
}
