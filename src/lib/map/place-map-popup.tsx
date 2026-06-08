"use client"

import { createRoot, type Root } from "react-dom/client"
import type maplibregl from "maplibre-gl"

import { PlaceMapPopup } from "@/components/map/PlaceMapPopup"
import type { MapPlace } from "@/lib/map/place-layers"

/**
 * Keeps one React root on a stable popup container so MapLibre can reuse the
 * same Popup instance without leaving behind an empty shell (tip only).
 *
 * Do not use flushSync here — map click/close events overlap with React renders.
 */
export class PlaceMapPopupController {
  private readonly container: HTMLDivElement
  private readonly root: Root

  constructor(private readonly popup: maplibregl.Popup) {
    this.container = document.createElement("div")
    this.root = createRoot(this.container)
    this.popup.setDOMContent(this.container)
  }

  show(map: maplibregl.Map, place: MapPlace, lngLat: maplibregl.LngLatLike) {
    this.root.render(<PlaceMapPopup place={place} />)

    queueMicrotask(() => {
      this.popup.setLngLat(lngLat)

      const element = this.popup.getElement()
      if (!element?.parentElement) {
        this.popup.addTo(map)
      }
    })
  }

  hide() {
    this.popup.remove()
  }

  destroy() {
    this.popup.remove()
    queueMicrotask(() => {
      this.root.unmount()
    })
  }
}
