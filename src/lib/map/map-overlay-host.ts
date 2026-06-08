import type maplibregl from "maplibre-gl"

import { isMapAlive } from "@/lib/map-utils"
import { isStyleReady } from "@/lib/map/map-layer-utils"

export type MapOverlayRegistration = {
  apply: () => void | Promise<void>
  clear: () => void
}

/**
 * Single coordinator per map instance for all custom layers/images.
 *
 * MapLibre clears custom sources, layers, and images on every `setStyle()`.
 * This host re-applies every registered overlay when:
 * - the basemap style finishes loading (`style.load`)
 * - basemap patches finish (`notifyStyleReady`, including same-URL style toggles)
 * - overlay data changes (`notifyDataChanged`)
 * - tiles settle after a style change (`idle`, once per style generation)
 */
export type MapOverlayHandlers<T> = {
  render: (map: maplibregl.Map, state: T) => void | Promise<void>
  clear: (map: maplibregl.Map) => void
}

export class MapOverlayHost {
  private readonly overlays = new Map<string, MapOverlayRegistration>()
  private styleGeneration = 0
  private flushQueue: Promise<void> = Promise.resolve()
  private flushScheduled = false
  private flushPending = false

  constructor(private readonly map: maplibregl.Map) {
    map.on("style.load", this.handleStyleLoad)
  }

  register(id: string, registration: MapOverlayRegistration) {
    this.overlays.set(id, registration)
    this.scheduleFlush()
    return () => {
      this.overlays.delete(id)
      if (isMapAlive(this.map)) {
        registration.clear()
      }
    }
  }

  notifyDataChanged() {
    this.scheduleFlush()
  }

  notifyStyleReady() {
    this.scheduleFlush()
    if (isMapAlive(this.map)) {
      this.map.once("idle", this.scheduleFlush)
    }
  }

  destroy() {
    this.map.off("style.load", this.handleStyleLoad)
    if (isMapAlive(this.map)) {
      for (const registration of this.overlays.values()) {
        registration.clear()
      }
    }
    this.overlays.clear()
  }

  private handleStyleLoad = () => {
    this.styleGeneration += 1
    this.scheduleFlush()

    if (isMapAlive(this.map)) {
      this.map.once("idle", this.scheduleFlush)
    }
  }

  private scheduleFlush = () => {
    if (this.flushScheduled) {
      this.flushPending = true
      return
    }

    this.flushScheduled = true
    this.flushQueue = this.flushQueue
      .then(() => this.flush(this.styleGeneration))
      .catch((error) => {
        console.error("[MapOverlayHost] flush failed", error)
      })
      .finally(() => {
        this.flushScheduled = false
        if (this.flushPending) {
          this.flushPending = false
          this.scheduleFlush()
        }
      })
  }

  private async flush(generation: number) {
    if (!isStyleReady(this.map)) {
      this.map.once("style.load", this.scheduleFlush)
      return
    }

    for (const registration of this.overlays.values()) {
      if (generation !== this.styleGeneration) {
        return
      }

      try {
        await registration.apply()
      } catch (error) {
        console.error("[MapOverlayHost] overlay apply failed", error)
      }
    }

    if (generation === this.styleGeneration && isMapAlive(this.map)) {
      this.map.triggerRepaint()
    }
  }
}

const hostByMap = new WeakMap<maplibregl.Map, MapOverlayHost>()

export function getMapOverlayHost(map: maplibregl.Map) {
  let host = hostByMap.get(map)
  if (!host) {
    host = new MapOverlayHost(map)
    hostByMap.set(map, host)
  }
  return host
}

export function destroyMapOverlayHost(map: maplibregl.Map) {
  hostByMap.get(map)?.destroy()
  hostByMap.delete(map)
}
