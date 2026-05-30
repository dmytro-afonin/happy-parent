"use client"

import { useEffect, useRef } from "react"
import maplibregl from "maplibre-gl"
import "maplibre-gl/dist/maplibre-gl.css"

type MapViewProps = {
  className?: string
  center?: [number, number]
  zoom?: number
}

export function MapView({
  className,
  center = [13.405, 52.52],
  zoom = 11,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return
    }

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: "https://tiles.openfreemap.org/styles/liberty",
      center,
      zoom,
    })

    map.addControl(new maplibregl.NavigationControl(), "top-right")
    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [center, zoom])

  return <div ref={containerRef} className={className ?? "h-full w-full"} />
}
