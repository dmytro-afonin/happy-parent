"use client"

import { PlusIcon, Trash2Icon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { GeometryType, LatLng } from "@/lib/geometry"

type AdminCoordinateEditorProps = {
  geometryType: GeometryType
  point: LatLng | null
  vertices: LatLng[]
  onPointChange: (point: LatLng) => void
  onVerticesChange: (vertices: LatLng[]) => void
}

const EMPTY_VERTEX: LatLng = { lat: 52.2297, lng: 21.0122 }

function parseCoordinate(value: string) {
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : null
}

export function AdminCoordinateEditor({
  geometryType,
  point,
  vertices,
  onPointChange,
  onVerticesChange,
}: AdminCoordinateEditorProps) {
  if (geometryType === "point") {
    const current = point ?? EMPTY_VERTEX

    return (
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span className="font-medium">Latitude</span>
          <Input
            type="number"
            step="any"
            value={current.lat}
            onChange={(event) => {
              const lat = parseCoordinate(event.target.value)
              if (lat !== null) {
                onPointChange({ lat, lng: current.lng })
              }
            }}
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium">Longitude</span>
          <Input
            type="number"
            step="any"
            value={current.lng}
            onChange={(event) => {
              const lng = parseCoordinate(event.target.value)
              if (lng !== null) {
                onPointChange({ lat: current.lat, lng })
              }
            }}
          />
        </label>
      </div>
    )
  }

  const rows = vertices.length > 0 ? vertices : [EMPTY_VERTEX, EMPTY_VERTEX, EMPTY_VERTEX]

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Add at least three coordinate pairs to define an area boundary.
      </p>
      {rows.map((vertex, index) => (
        <div key={index} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <label className="space-y-1 text-sm">
            <span className="font-medium">Lat #{index + 1}</span>
            <Input
              type="number"
              step="any"
              value={vertex.lat}
              onChange={(event) => {
                const lat = parseCoordinate(event.target.value)
                if (lat === null) {
                  return
                }

                const next = [...rows]
                next[index] = { lat, lng: vertex.lng }
                onVerticesChange(next)
              }}
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium">Lng #{index + 1}</span>
            <Input
              type="number"
              step="any"
              value={vertex.lng}
              onChange={(event) => {
                const lng = parseCoordinate(event.target.value)
                if (lng === null) {
                  return
                }

                const next = [...rows]
                next[index] = { lat: vertex.lat, lng }
                onVerticesChange(next)
              }}
            />
          </label>
          <div className="flex items-end">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              disabled={rows.length <= 3}
              onClick={() => {
                onVerticesChange(rows.filter((_, rowIndex) => rowIndex !== index))
              }}
            >
              <Trash2Icon className="size-4" />
            </Button>
          </div>
        </div>
      ))}
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => onVerticesChange([...rows, EMPTY_VERTEX])}
      >
        <PlusIcon className="size-4" />
        Add coordinate pair
      </Button>
    </div>
  )
}
