import type * as maplibregl from "maplibre-gl"

import { PLACE_CATEGORIES, PLACE_CATEGORY_META } from "@/lib/place-categories"
import type { PlaceCategoryId } from "@/lib/place-categories"
import { verticesToGeoJsonRing } from "@/lib/geometry"
import type { LatLng } from "@/lib/geometry"
import { isMapAlive } from "@/lib/map-utils"
import {
  ensureLayer,
  removeLayersAndSource,
  upsertGeoJsonSource,
} from "@/lib/map/map-layer-utils"
import {
  categoryMarkerImageId,
  ensureCategoryMarkerImages,
} from "@/lib/map/category-marker-icons"

export type MapPlace = {
  _id: string
  name: string
  description?: string
  address?: string
  lat: number
  lng: number
  category: PlaceCategoryId
  labelIds?: string[]
  status?: "pending" | "approved" | "rejected"
  isOwn?: boolean
  geometryType?: "point" | "polygon"
  boundary?: LatLng[]
  coverPhotoUrl?: string
  coverPhotoThumbnailUrl?: string
}

export type PlaceLayersState = {
  places: MapPlace[]
  activeCategories: PlaceCategoryId[]
  selectedPlaceId?: string | null
}

const POLYGON_FILL_OPACITY_DEFAULT = 0.08
const POLYGON_FILL_OPACITY_SELECTED = 0.25
const POLYGON_LINE_WIDTH_DEFAULT = 1
const POLYGON_LINE_WIDTH_SELECTED = 2
const POLYGON_LINE_OPACITY_DEFAULT = 0.45
const POLYGON_LINE_OPACITY_SELECTED = 1

function pointLayerId(category: PlaceCategoryId) {
  return `places-${category}-points`
}

function polygonMarkerLayerId(category: PlaceCategoryId) {
  return `places-${category}-polygon-markers`
}

function polygonFillLayerId(category: PlaceCategoryId) {
  return `places-${category}-polygons-fill`
}

function polygonLineLayerId(category: PlaceCategoryId) {
  return `places-${category}-polygons-line`
}

function sourceId(category: PlaceCategoryId) {
  return `places-${category}-source`
}

export function getPlaceLayerIds(
  categories: readonly PlaceCategoryId[] = PLACE_CATEGORIES
) {
  return categories.flatMap((category) => [
    pointLayerId(category),
    polygonMarkerLayerId(category),
    polygonFillLayerId(category),
    polygonLineLayerId(category),
  ])
}

export function getPlaceInteractiveLayerIds(
  categories: readonly PlaceCategoryId[] = PLACE_CATEGORIES
) {
  return categories.flatMap((category) => [
    pointLayerId(category),
    polygonMarkerLayerId(category),
  ])
}

function polygonFillOpacityPaint(selectedPlaceId: string | null) {
  return [
    "case",
    ["==", ["get", "id"], selectedPlaceId ?? ""],
    POLYGON_FILL_OPACITY_SELECTED,
    POLYGON_FILL_OPACITY_DEFAULT,
  ] as maplibregl.ExpressionSpecification
}

function polygonLineWidthPaint(selectedPlaceId: string | null) {
  return [
    "case",
    ["==", ["get", "id"], selectedPlaceId ?? ""],
    POLYGON_LINE_WIDTH_SELECTED,
    POLYGON_LINE_WIDTH_DEFAULT,
  ] as maplibregl.ExpressionSpecification
}

function polygonLineOpacityPaint(selectedPlaceId: string | null) {
  return [
    "case",
    ["==", ["get", "id"], selectedPlaceId ?? ""],
    POLYGON_LINE_OPACITY_SELECTED,
    POLYGON_LINE_OPACITY_DEFAULT,
  ] as maplibregl.ExpressionSpecification
}

function placeToFeatures(place: MapPlace): GeoJSON.Feature[] {
  if (
    place.geometryType === "polygon" &&
    place.boundary &&
    place.boundary.length >= 3
  ) {
    const properties = {
      id: place._id,
      name: place.name,
      description: place.description ?? "",
      category: place.category,
      status: place.status ?? "approved",
    }

    return [
      {
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: [verticesToGeoJsonRing(place.boundary)],
        },
        properties: {
          ...properties,
          geometryType: "polygon",
        },
      },
      {
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [place.lng, place.lat],
        },
        properties: {
          ...properties,
          geometryType: "polygon-marker",
        },
      },
    ]
  }

  return [
    {
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [place.lng, place.lat],
      },
      properties: {
        id: place._id,
        name: place.name,
        description: place.description ?? "",
        category: place.category,
        status: place.status ?? "approved",
        geometryType: "point",
      },
    },
  ]
}

function groupPlacesByCategory(places: MapPlace[]) {
  const grouped = new Map<PlaceCategoryId, MapPlace[]>()

  for (const category of PLACE_CATEGORIES) {
    grouped.set(category, [])
  }

  for (const place of places) {
    grouped.get(place.category)?.push(place)
  }

  return grouped
}

function removeCategoryLayers(map: maplibregl.Map, category: PlaceCategoryId) {
  removeLayersAndSource(map, getPlaceLayerIds([category]), sourceId(category))
}

export function clearPlaceLayers(map: maplibregl.Map) {
  if (!isMapAlive(map)) {
    return
  }

  for (const category of PLACE_CATEGORIES) {
    removeCategoryLayers(map, category)
  }
}

function upsertCategoryLayers(
  map: maplibregl.Map,
  category: PlaceCategoryId,
  categoryPlaces: MapPlace[],
  selectedPlaceId: string | null
) {
  const source = sourceId(category)
  const features = categoryPlaces.flatMap(placeToFeatures)
  const collection = {
    type: "FeatureCollection" as const,
    features,
  }

  const pointFeatures = features.filter(
    (feature) => feature.properties?.geometryType === "point"
  )
  const polygonMarkerFeatures = features.filter(
    (feature) => feature.properties?.geometryType === "polygon-marker"
  )
  const polygonFeatures = features.filter(
    (feature) => feature.properties?.geometryType === "polygon"
  )

  upsertGeoJsonSource(map, source, collection)

  // Pending submissions render semi-transparent (visible only to their
  // submitter and admins).
  const pendingOpacityPaint = [
    "case",
    ["==", ["get", "status"], "approved"],
    1,
    0.55,
  ] as maplibregl.ExpressionSpecification

  if (pointFeatures.length > 0) {
    ensureLayer(map, {
      id: pointLayerId(category),
      type: "symbol",
      source,
      filter: ["==", ["get", "geometryType"], "point"],
      layout: {
        "icon-image": categoryMarkerImageId(category),
        "icon-size": 0.55,
        "icon-allow-overlap": true,
        "icon-ignore-placement": true,
      },
      paint: {
        "icon-opacity": pendingOpacityPaint,
      },
    })
  }

  if (polygonMarkerFeatures.length > 0) {
    ensureLayer(map, {
      id: polygonMarkerLayerId(category),
      type: "symbol",
      source,
      filter: ["==", ["get", "geometryType"], "polygon-marker"],
      layout: {
        "icon-image": categoryMarkerImageId(category),
        "icon-size": 0.55,
        "icon-allow-overlap": true,
        "icon-ignore-placement": true,
      },
      paint: {
        "icon-opacity": pendingOpacityPaint,
      },
    })
  }

  if (polygonFeatures.length > 0) {
    ensureLayer(map, {
      id: polygonFillLayerId(category),
      type: "fill",
      source,
      filter: ["==", ["get", "geometryType"], "polygon"],
      paint: {
        "fill-color": PLACE_CATEGORY_META[category].color,
        "fill-opacity": polygonFillOpacityPaint(selectedPlaceId),
      },
    })

    ensureLayer(map, {
      id: polygonLineLayerId(category),
      type: "line",
      source,
      filter: ["==", ["get", "geometryType"], "polygon"],
      paint: {
        "line-color": PLACE_CATEGORY_META[category].color,
        "line-width": polygonLineWidthPaint(selectedPlaceId),
        "line-opacity": polygonLineOpacityPaint(selectedPlaceId),
      },
    })
  }
}

export function updatePlaceSelectionHighlight(
  map: maplibregl.Map,
  activeCategories: PlaceCategoryId[],
  selectedPlaceId: string | null
) {
  if (!isMapAlive(map)) {
    return
  }

  for (const category of activeCategories) {
    const fillLayerId = polygonFillLayerId(category)
    const lineLayerId = polygonLineLayerId(category)

    if (map.getLayer(fillLayerId)) {
      map.setPaintProperty(
        fillLayerId,
        "fill-opacity",
        polygonFillOpacityPaint(selectedPlaceId)
      )
    }

    if (map.getLayer(lineLayerId)) {
      map.setPaintProperty(
        lineLayerId,
        "line-width",
        polygonLineWidthPaint(selectedPlaceId)
      )
      map.setPaintProperty(
        lineLayerId,
        "line-opacity",
        polygonLineOpacityPaint(selectedPlaceId)
      )
    }
  }
}

export async function renderPlaceLayers(
  map: maplibregl.Map,
  state: PlaceLayersState
) {
  await ensureCategoryMarkerImages(map)

  const grouped = groupPlacesByCategory(state.places)
  const active = new Set(state.activeCategories)
  const selectedPlaceId = state.selectedPlaceId ?? null

  for (const category of PLACE_CATEGORIES) {
    if (!active.has(category)) {
      removeCategoryLayers(map, category)
    }
  }

  for (const category of state.activeCategories) {
    const categoryPlaces = grouped.get(category) ?? []
    if (categoryPlaces.length === 0) {
      removeCategoryLayers(map, category)
      continue
    }

    upsertCategoryLayers(map, category, categoryPlaces, selectedPlaceId)
  }

  updatePlaceSelectionHighlight(map, state.activeCategories, selectedPlaceId)
}

export const placeLayerHandlers = {
  render: renderPlaceLayers,
  clear: clearPlaceLayers,
}

type PlaceLayerInteractionOptions = {
  map: maplibregl.Map
  getState: () => PlaceLayersState
  onSelectPlace?: (place: MapPlace | null) => void
  onPlaceClick?: (place: MapPlace) => void
}

export function bindPlaceLayerInteractions({
  map,
  getState,
  onSelectPlace,
  onPlaceClick,
}: PlaceLayerInteractionOptions) {
  const handleClick = (event: maplibregl.MapMouseEvent) => {
    if (!isMapAlive(map)) {
      return
    }

    const { places, activeCategories } = getState()
    const layerIds = getPlaceInteractiveLayerIds(activeCategories).filter(
      (id) => Boolean(map.getLayer(id))
    )

    if (layerIds.length === 0) {
      return
    }

    const features = map.queryRenderedFeatures(event.point, {
      layers: layerIds,
    })
    const feature = features.at(0)
    if (!feature) {
      onSelectPlace?.(null)
      updatePlaceSelectionHighlight(map, getState().activeCategories, null)
      return
    }

    event.originalEvent.preventDefault()
    event.originalEvent.stopPropagation()

    const placeId = feature.properties.id
    const place = places.find((entry) => entry._id === placeId)
    if (!place) {
      return
    }

    onSelectPlace?.(place)
    updatePlaceSelectionHighlight(map, activeCategories, place._id)

    onPlaceClick?.(place)
  }

  const handleMouseMove = (event: maplibregl.MapMouseEvent) => {
    if (!isMapAlive(map)) {
      return
    }

    const layerIds = getPlaceInteractiveLayerIds(
      getState().activeCategories
    ).filter((id) => Boolean(map.getLayer(id)))

    if (layerIds.length === 0) {
      map.getCanvas().style.cursor = ""
      return
    }

    const features = map.queryRenderedFeatures(event.point, {
      layers: layerIds,
    })
    map.getCanvas().style.cursor = features.length > 0 ? "pointer" : ""
  }

  map.on("click", handleClick)
  map.on("mousemove", handleMouseMove)

  return () => {
    map.off("click", handleClick)
    map.off("mousemove", handleMouseMove)

    if (isMapAlive(map)) {
      map.getCanvas().style.cursor = ""
    }
  }
}
