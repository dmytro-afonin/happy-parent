import type * as maplibregl from "maplibre-gl"

import { getMapOverlayHost } from "@/lib/map/map-overlay-host"
import { patchOpenFreeMapStyle } from "./map-style-patches"

export type MapStyleId =
  | "liberty"
  | "bright"
  | "positron"
  | "dark"
  | "fiord"
  | "3d"

export type MapStyle = {
  id: MapStyleId
  label: string
  url: string
  view3d?: boolean
}

export const MAP_STYLES: MapStyle[] = [
  {
    id: "liberty",
    label: "Streets",
    url: "https://tiles.openfreemap.org/styles/liberty",
  },
  {
    id: "bright",
    label: "Bright",
    url: "https://tiles.openfreemap.org/styles/bright",
  },
  {
    id: "positron",
    label: "Light",
    url: "https://tiles.openfreemap.org/styles/positron",
  },
  {
    id: "dark",
    label: "Dark",
    url: "https://tiles.openfreemap.org/styles/dark",
  },
  {
    id: "fiord",
    label: "Fiord",
    url: "https://tiles.openfreemap.org/styles/fiord",
  },
  {
    id: "3d",
    label: "3D",
    url: "https://tiles.openfreemap.org/styles/liberty",
    view3d: true,
  },
]

export const DEFAULT_MAP_STYLE_ID: MapStyleId = "liberty"

const MAP_3D_VIEW = {
  pitch: 60,
  bearing: -17.6,
  minZoom: 14,
} as const

export function getMapStyle(id: MapStyleId) {
  return MAP_STYLES.find((style) => style.id === id) ?? MAP_STYLES[0]
}

export function getMapStyleUrl(id: MapStyleId) {
  return getMapStyle(id).url
}

export function applyMapStyleToMap(
  map: maplibregl.Map,
  styleId: MapStyleId,
  previousStyleId: MapStyleId
) {
  const style = getMapStyle(styleId)
  const previousStyle = getMapStyle(previousStyleId)

  const finish = () => {
    patchOpenFreeMapStyle(map)
    applyMapStyleView(map, style)
    getMapOverlayHost(map).notifyStyleReady()
  }

  if (style.url === previousStyle.url) {
    finish()
    return
  }

  map.setStyle(style.url)
  map.once("style.load", finish)
}

export function applyMapStyleView(map: maplibregl.Map, style: MapStyle) {
  if (style.view3d) {
    map.easeTo({
      pitch: MAP_3D_VIEW.pitch,
      bearing: MAP_3D_VIEW.bearing,
      zoom: Math.max(map.getZoom(), MAP_3D_VIEW.minZoom),
      duration: 800,
    })
    return
  }

  if (map.getPitch() !== 0 || map.getBearing() !== 0) {
    map.easeTo({
      pitch: 0,
      bearing: 0,
      duration: 800,
    })
  }
}
