"use client"

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type ReactNode,
} from "react"
import maplibregl from "maplibre-gl"
import "maplibre-gl/dist/maplibre-gl.css"

import { MapStyleSwitcherControl } from "./MapStyleSwitcherControl"
import {
  installMissingImageHandler,
  patchOpenFreeMapStyle,
} from "./map-style-patches"
import { destroyMapOverlayHost } from "@/lib/map/map-overlay-host"
import {
  DEFAULT_MAP_STYLE_ID,
  getMapStyle,
  getMapStyleUrl,
  type MapStyleId,
} from "./map-styles"

/** Warsaw city center [longitude, latitude] */
const WARSAW_CENTER: [number, number] = [21.0122, 52.2297]

const GEOLOCATION_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 10_000,
  maximumAge: 0,
}

const MAP_MOVE_OPTIONS: maplibregl.FitBoundsOptions = {
  maxZoom: 15,
  duration: 450,
  speed: 2.5,
}

export type MapSearchViewport = {
  center: { lat: number; lng: number }
  bounds: {
    minLat: number
    maxLat: number
    minLng: number
    maxLng: number
  }
}

export type MapViewHandle = {
  flyTo: (coords: { lat: number; lng: number; zoom?: number }) => void
  getSearchViewport: () => MapSearchViewport | null
  getUserLocation: () => { lat: number; lng: number } | null
}

type MapViewProps = {
  className?: string
  center?: [number, number]
  zoom?: number
  initialStyleId?: MapStyleId
  onStyleChange?: (styleId: MapStyleId) => void
  onUserLocationChange?: (location: { lat: number; lng: number } | null) => void
  onMapReady?: (map: maplibregl.Map) => void
  children?: (map: maplibregl.Map) => ReactNode
}

export const MapView = forwardRef<MapViewHandle, MapViewProps>(function MapView(
  {
    className,
    center = WARSAW_CENTER,
    zoom = 11,
    initialStyleId = DEFAULT_MAP_STYLE_ID,
    onStyleChange,
    onUserLocationChange,
    onMapReady,
    children,
  },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [readyMap, setReadyMap] = useState<maplibregl.Map | null>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const userLocationRef = useRef<{ lat: number; lng: number } | null>(null)
  const onStyleChangeRef = useRef(onStyleChange)
  const onUserLocationChangeRef = useRef(onUserLocationChange)
  const onMapReadyRef = useRef(onMapReady)
  const initialStyleIdRef = useRef(initialStyleId)

  onStyleChangeRef.current = onStyleChange
  onUserLocationChangeRef.current = onUserLocationChange
  onMapReadyRef.current = onMapReady
  initialStyleIdRef.current = initialStyleId

  useImperativeHandle(ref, () => ({
    flyTo({ lat, lng, zoom: targetZoom = 15 }) {
      mapRef.current?.flyTo({
        center: [lng, lat],
        zoom: targetZoom,
        essential: true,
        duration: MAP_MOVE_OPTIONS.duration,
        speed: MAP_MOVE_OPTIONS.speed,
      })
    },
    getSearchViewport() {
      const map = mapRef.current
      if (!map) {
        return null
      }

      const center = map.getCenter()
      const bounds = map.getBounds()

      return {
        center: { lat: center.lat, lng: center.lng },
        bounds: {
          minLat: bounds.getSouth(),
          maxLat: bounds.getNorth(),
          minLng: bounds.getWest(),
          maxLng: bounds.getEast(),
        },
      }
    },
    getUserLocation() {
      return userLocationRef.current
    },
  }))

  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return
    }

    const styleId = initialStyleIdRef.current
    const styleSwitcher = new MapStyleSwitcherControl(styleId, (nextStyleId) =>
      onStyleChangeRef.current?.(nextStyleId),
    )

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: getMapStyleUrl(styleId),
      center,
      zoom,
    })

    const removeMissingImageHandler = installMissingImageHandler(map)

    map.addControl(styleSwitcher, "top-left")
    map.addControl(new maplibregl.NavigationControl(), "top-right")

    const geolocate = new maplibregl.GeolocateControl({
      positionOptions: GEOLOCATION_OPTIONS,
      trackUserLocation: true,
      showUserLocation: true,
      fitBoundsOptions: MAP_MOVE_OPTIONS,
    })
    map.addControl(geolocate, "top-right")

    geolocate.on("geolocate", (event) => {
      const location = {
        lat: event.coords.latitude,
        lng: event.coords.longitude,
      }
      userLocationRef.current = location
      onUserLocationChangeRef.current?.(location)
    })

    mapRef.current = map

    const applySavedStyle = () => {
      styleSwitcher.applyStyle(styleId, { persist: false })
    }

    const markMapReady = () => {
      setReadyMap((current) => current ?? map)
      onMapReadyRef.current?.(map)

      geolocate.once("geolocate", () => {
        map.once("moveend", () => {
          if (getMapStyle(styleId).view3d) {
            applySavedStyle()
          }
        })
      })

      geolocate.trigger()
    }

    const onMapLoad = () => {
      patchOpenFreeMapStyle(map)
      applySavedStyle()
      map.once("idle", markMapReady)
    }

    map.on("load", onMapLoad)

    return () => {
      map.off("load", onMapLoad)
      removeMissingImageHandler()
      destroyMapOverlayHost(map)
      setReadyMap(null)
      map.remove()
      mapRef.current = null
    }
  }, [center, zoom])

  return (
    <>
      <div ref={containerRef} className={className ?? "h-full w-full"} />
      {readyMap ? children?.(readyMap) : null}
    </>
  )
})
