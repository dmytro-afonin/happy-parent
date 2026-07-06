"use client"

import { useEffect, useMemo, useRef } from "react"
import type maplibregl from "maplibre-gl"

import { useMapOverlay } from "@/hooks/use-map-overlay"
import {
  bindPlaceLayerInteractions,
  placeLayerHandlers,
  updatePlaceSelectionHighlight,
} from "@/lib/map/place-layers"
import type { MapPlace, PlaceLayersState } from "@/lib/map/place-layers"

export type { MapPlace }

type PlaceCategoryLayersProps = {
  map: maplibregl.Map
  places: MapPlace[]
  activeCategories: PlaceLayersState["activeCategories"]
  selectedPlaceId: string | null
  onSelectPlace: (place: MapPlace | null) => void
}

export function PlaceCategoryLayers({
  map,
  places,
  activeCategories,
  selectedPlaceId,
  onSelectPlace,
}: PlaceCategoryLayersProps) {
  const layerState = useMemo<PlaceLayersState>(
    () => ({ places, activeCategories, selectedPlaceId }),
    [places, activeCategories, selectedPlaceId]
  )

  const layerRevision = `${places.map((place) => `${place._id}:${place.status ?? ""}`).join(",")}:${activeCategories.join(",")}:${selectedPlaceId ?? ""}`

  const layerStateRef = useRef(layerState)
  layerStateRef.current = layerState

  const onSelectPlaceRef = useRef(onSelectPlace)
  onSelectPlaceRef.current = onSelectPlace

  useMapOverlay(map, placeLayerHandlers, layerState, layerRevision)

  useEffect(() => {
    const unbind = bindPlaceLayerInteractions({
      map,
      getState: () => layerStateRef.current,
      onSelectPlace: (place) => {
        onSelectPlaceRef.current(place)
        updatePlaceSelectionHighlight(
          map,
          layerStateRef.current.activeCategories,
          place?._id ?? null
        )
      },
    })

    return unbind
  }, [map])

  return null
}
