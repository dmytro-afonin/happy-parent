import type maplibregl from "maplibre-gl"

import {
  applyMapStyleToMap,
  DEFAULT_MAP_STYLE_ID,
  getMapStyle,
  MAP_STYLES,
} from "./map-styles"
import type { MapStyleId } from "./map-styles"

export class MapStyleSwitcherControl implements maplibregl.IControl {
  private container?: HTMLDivElement
  private map?: maplibregl.Map
  private select?: HTMLSelectElement
  private activeStyleId: MapStyleId
  private onStyleChange?: (styleId: MapStyleId) => void

  constructor(
    initialStyleId: MapStyleId = DEFAULT_MAP_STYLE_ID,
    onStyleChange?: (styleId: MapStyleId) => void
  ) {
    this.activeStyleId = initialStyleId
    this.onStyleChange = onStyleChange
  }

  onAdd(map: maplibregl.Map) {
    this.map = map
    this.container = document.createElement("div")
    this.container.className =
      "maplibregl-ctrl maplibregl-ctrl-group map-style-switcher"

    this.select = document.createElement("select")
    this.select.setAttribute("aria-label", "Map style")
    this.select.className = "map-style-switcher__select"

    for (const style of MAP_STYLES) {
      const option = document.createElement("option")
      option.value = style.id
      option.textContent = style.label
      this.select.appendChild(option)
    }

    this.select.value = this.activeStyleId
    this.select.addEventListener("change", this.handleChange)

    this.container.appendChild(this.select)
    return this.container
  }

  onRemove() {
    this.select?.removeEventListener("change", this.handleChange)
    this.container = undefined
    this.map = undefined
    this.select = undefined
  }

  applyStyle(styleId: MapStyleId, options?: { persist?: boolean }) {
    if (!this.map) {
      return
    }

    const previousStyleId = this.activeStyleId
    if (this.select) {
      this.select.value = styleId
    }
    applyMapStyleToMap(this.map, styleId, previousStyleId)
    this.activeStyleId = styleId

    if (options?.persist !== false) {
      this.onStyleChange?.(styleId)
    }
  }

  private handleChange = () => {
    if (!this.select) {
      return
    }

    this.applyStyle(getMapStyle(this.select.value as MapStyleId).id)
  }
}
