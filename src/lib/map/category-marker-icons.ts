import type * as maplibregl from "maplibre-gl"

import { PLACE_CATEGORIES, PLACE_CATEGORY_META } from "@/lib/place-categories"
import type { PlaceCategoryId } from "@/lib/place-categories"
import { isMapAlive } from "@/lib/map-utils"

type LucideNode = [string, Record<string, string | undefined>]

const CATEGORY_ICON_NODES: Record<PlaceCategoryId, LucideNode[]> = {
  // lucide "utensils-crossed"
  food: [
    [
      "path",
      { d: "m16 2-2.3 2.3a3 3 0 0 0 0 4.2l1.8 1.8a3 3 0 0 0 4.2 0L22 8" },
    ],
    [
      "path",
      {
        d: "M15 15 3.3 3.3a4.2 4.2 0 0 0 0 6l7.3 7.3c.7.7 2 .7 2.8 0L15 15Zm0 0 7 7",
      },
    ],
    ["path", { d: "m2.1 21.8 6.4-6.3" }],
    ["path", { d: "m19 5-7 7" }],
  ],
  // lucide "baby"
  utilities: [
    ["path", { d: "M9 12h.01" }],
    ["path", { d: "M15 12h.01" }],
    ["path", { d: "M10 16c.5.3 1.2.5 2 .5s1.5-.2 2-.5" }],
    [
      "path",
      {
        d: "M19 6.3a9 9 0 0 1 1.8 3.9 2 2 0 0 1 0 3.6 9 9 0 0 1-17.6 0 2 2 0 0 1 0-3.6A9 9 0 0 1 12 3c2 0 3.5 1.1 3.5 2.5s-.9 2.5-2 2.5c-.8 0-1.5-.4-1.5-1",
      },
    ],
  ],
  // lucide "ferris-wheel"
  entertainment: [
    ["circle", { cx: "12", cy: "12", r: "2" }],
    ["path", { d: "M12 2v4" }],
    ["path", { d: "m6.8 15-3.5 2" }],
    ["path", { d: "m20.7 7-3.5 2" }],
    ["path", { d: "M6.8 9 3.3 7" }],
    ["path", { d: "m20.7 17-3.5-2" }],
    ["path", { d: "m9 22 3-8 3 8" }],
    ["path", { d: "M8 22h8" }],
    ["path", { d: "M18 18.7a9 9 0 1 0-12 0" }],
  ],
}

const MARKER_SIZE = 48
const imageCache = new Map<string, ImageData>()
let preloadPromise: Promise<void> | null = null

function nodeToSvgMarkup(node: LucideNode) {
  const [tag, attrs] = node
  const strokeAttrs =
    'fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"'

  switch (tag) {
    case "path":
      return `<path d="${attrs.d}" ${strokeAttrs}/>`
    case "rect":
      return `<rect x="${attrs.x}" y="${attrs.y}" width="${attrs.width}" height="${attrs.height}" rx="${attrs.rx ?? 0}" ${strokeAttrs}/>`
    case "circle":
      return `<circle cx="${attrs.cx}" cy="${attrs.cy}" r="${attrs.r}" ${strokeAttrs}/>`
    case "line":
      return `<line x1="${attrs.x1}" y1="${attrs.y1}" x2="${attrs.x2}" y2="${attrs.y2}" ${strokeAttrs}/>`
    case "polyline":
      return `<polyline points="${attrs.points}" ${strokeAttrs}/>`
    default:
      return ""
  }
}

function buildCategoryMarkerSvg(category: PlaceCategoryId) {
  const color = PLACE_CATEGORY_META[category].color
  const iconMarkup = CATEGORY_ICON_NODES[category].map(nodeToSvgMarkup).join("")

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${MARKER_SIZE}" height="${MARKER_SIZE}" viewBox="0 0 ${MARKER_SIZE} ${MARKER_SIZE}">
    <circle cx="24" cy="24" r="20" fill="${color}" stroke="white" stroke-width="3"/>
    <g transform="translate(12 12)">${iconMarkup}</g>
  </svg>`
}

function svgToImageData(svg: string) {
  return new Promise<ImageData>((resolve, reject) => {
    const image = new Image()
    image.onload = () => {
      const canvas = document.createElement("canvas")
      canvas.width = MARKER_SIZE * 2
      canvas.height = MARKER_SIZE * 2
      const context = canvas.getContext("2d")

      if (!context) {
        reject(new Error("Could not create marker canvas"))
        return
      }

      context.drawImage(image, 0, 0, canvas.width, canvas.height)
      resolve(context.getImageData(0, 0, canvas.width, canvas.height))
    }
    image.onerror = () => reject(new Error("Could not load marker image"))
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
  })
}

export function categoryMarkerImageId(category: PlaceCategoryId) {
  return `place-marker-${category}`
}

export async function preloadCategoryMarkerImages() {
  if (imageCache.size === PLACE_CATEGORIES.length) {
    return
  }

  if (!preloadPromise) {
    preloadPromise = Promise.all(
      PLACE_CATEGORIES.map(async (category) => {
        const imageId = categoryMarkerImageId(category)
        if (imageCache.has(imageId)) {
          return
        }

        imageCache.set(
          imageId,
          await svgToImageData(buildCategoryMarkerSvg(category))
        )
      })
    ).then(() => undefined)
  }

  await preloadPromise
}

export function registerCategoryMarkerImages(map: maplibregl.Map) {
  if (!isMapAlive(map)) {
    return
  }

  for (const category of PLACE_CATEGORIES) {
    const imageId = categoryMarkerImageId(category)
    if (map.hasImage(imageId)) {
      continue
    }

    const cached = imageCache.get(imageId)
    if (cached) {
      map.addImage(imageId, cached, { pixelRatio: 2 })
    }
  }
}

export async function ensureCategoryMarkerImages(map: maplibregl.Map) {
  await preloadCategoryMarkerImages()
  registerCategoryMarkerImages(map)
}

export function categoryMarkerImagesReady(map: maplibregl.Map) {
  return PLACE_CATEGORIES.every((category) =>
    map.hasImage(categoryMarkerImageId(category))
  )
}

if (typeof window !== "undefined") {
  void preloadCategoryMarkerImages()
}
