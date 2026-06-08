import type maplibregl from "maplibre-gl"

import {
  PLACE_CATEGORIES,
  PLACE_CATEGORY_META,
  type PlaceCategoryId,
} from "@/lib/place-categories"
import { isMapAlive } from "@/lib/map-utils"

type LucideNode = [string, Record<string, string>]

const CATEGORY_ICON_NODES: Record<PlaceCategoryId, LucideNode[]> = {
  playground: [
    ["rect", { width: "18", height: "12", x: "3", y: "8", rx: "1" }],
    ["path", { d: "M10 8V5c0-.6-.4-1-1-1H6a1 1 0 0 0-1 1v3" }],
    ["path", { d: "M19 8V5c0-.6-.4-1-1-1h-3a1 1 0 0 0-1 1v3" }],
  ],
  park: [
    [
      "path",
      {
        d: "m17 14 3 3.3a1 1 0 0 1-.7 1.7H4.7a1 1 0 0 1-.7-1.7L7 14h-.3a1 1 0 0 1-.7-1.7L9 9h-.2A1 1 0 0 1 8 7.3L12 3l4 4.3a1 1 0 0 1-.8 1.7H15l3 3.3a1 1 0 0 1-.7 1.7H17Z",
      },
    ],
    ["path", { d: "M12 22v-3" }],
  ],
  cafe: [
    ["path", { d: "M10 2v2" }],
    ["path", { d: "M14 2v2" }],
    [
      "path",
      {
        d: "M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1",
      },
    ],
    ["path", { d: "M6 2v2" }],
  ],
  restaurant: [
    ["path", { d: "m16 2-2.3 2.3a3 3 0 0 0 0 4.2l1.8 1.8a3 3 0 0 0 4.2 0L22 8" }],
    [
      "path",
      { d: "M15 15 3.3 3.3a4.2 4.2 0 0 0 0 6l7.3 7.3c.7.7 2 .7 2.8 0L15 15Zm0 0 7 7" },
    ],
    ["path", { d: "m2.1 21.8 6.4-6.3" }],
    ["path", { d: "m19 5-7 7" }],
  ],
  library: [
    ["path", { d: "M12 7v14" }],
    [
      "path",
      {
        d: "M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z",
      },
    ],
  ],
  museum: [
    ["path", { d: "M10 18v-7" }],
    [
      "path",
      {
        d: "M11.119 2.205a2 2 0 0 1 1.762 0l7.84 3.846A.5.5 0 0 1 20.5 7h-17a.5.5 0 0 1-.22-.949z",
      },
    ],
    ["path", { d: "M14 18v-7" }],
    ["path", { d: "M18 18v-7" }],
    ["path", { d: "M3 22h18" }],
    ["path", { d: "M6 18v-7" }],
  ],
  pool: [
    ["path", { d: "M2 12q2.5 2 5 0t5 0 5 0 5 0" }],
    ["path", { d: "M2 19q2.5 2 5 0t5 0 5 0 5 0" }],
    ["path", { d: "M2 5q2.5 2 5 0t5 0 5 0 5 0" }],
  ],
  "indoor-play": [
    ["path", { d: "M10 5V3" }],
    ["path", { d: "M14 5V3" }],
    ["path", { d: "M15 21v-3a3 3 0 0 0-6 0v3" }],
    ["path", { d: "M18 3v8" }],
    ["path", { d: "M18 5H6" }],
    ["path", { d: "M22 11H2" }],
    ["path", { d: "M22 9v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9" }],
    ["path", { d: "M6 3v8" }],
  ],
  nature: [
    [
      "path",
      {
        d: "M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z",
      },
    ],
    ["path", { d: "M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" }],
  ],
  zoo: [
    ["circle", { cx: "11", cy: "4", r: "2" }],
    ["circle", { cx: "18", cy: "8", r: "2" }],
    ["circle", { cx: "20", cy: "16", r: "2" }],
    [
      "path",
      {
        d: "M9 10a5 5 0 0 1 5 5v3.5a3.5 3.5 0 0 1-6.84 1.045Q6.52 17.48 4.46 16.84A3.5 3.5 0 0 1 5.5 10Z",
      },
    ],
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
          await svgToImageData(buildCategoryMarkerSvg(category)),
        )
      }),
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
    map.hasImage(categoryMarkerImageId(category)),
  )
}

if (typeof window !== "undefined") {
  void preloadCategoryMarkerImages()
}
