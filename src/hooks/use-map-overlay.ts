import { useEffect, useId, useRef } from "react"
import type maplibregl from "maplibre-gl"

import { getMapOverlayHost } from "@/lib/map/map-overlay-host"
import type { MapOverlayHandlers } from "@/lib/map/map-overlay-host"

/**
 * Bridge React state to the map overlay host for one overlay bundle.
 *
 * Pattern:
 * - register once per map instance
 * - keep latest handlers/state in refs
 * - notify host when React data changes
 */
export function useMapOverlay<T>(
  map: maplibregl.Map | null | undefined,
  handlers: MapOverlayHandlers<T>,
  state: T,
  revision: string
) {
  const overlayId = useId()
  const handlersRef = useRef(handlers)
  handlersRef.current = handlers

  const stateRef = useRef(state)
  stateRef.current = state

  useEffect(() => {
    if (!map) {
      return
    }

    const host = getMapOverlayHost(map)

    return host.register(overlayId, {
      apply: () => handlersRef.current.render(map, stateRef.current),
      clear: () => handlersRef.current.clear(map),
    })
  }, [map, overlayId])

  useEffect(() => {
    if (!map) {
      return
    }

    getMapOverlayHost(map).notifyDataChanged()
  }, [map, revision, state])
}
