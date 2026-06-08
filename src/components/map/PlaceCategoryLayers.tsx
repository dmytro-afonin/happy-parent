"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import maplibregl from "maplibre-gl"

import { useMapOverlay } from "@/hooks/use-map-overlay"
import {
  bindPlaceLayerInteractions,
  placeLayerHandlers,
  updatePlaceSelectionHighlight,
  type MapPlace,
  type PlaceLayersState,
} from "@/lib/map/place-layers"
import { PlaceMapPopupController } from "@/lib/map/place-map-popup"

export type { MapPlace }

type PlaceCategoryLayersProps = {
  map: maplibregl.Map
  places: MapPlace[]
  activeCategories: PlaceLayersState["activeCategories"]
  onPlaceClick?: (place: MapPlace) => void
}

export function PlaceCategoryLayers({
  map,
  places,
  activeCategories,
  onPlaceClick,
}: PlaceCategoryLayersProps) {
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null)

  const layerState = useMemo<PlaceLayersState>(
    () => ({ places, activeCategories, selectedPlaceId }),
    [places, activeCategories, selectedPlaceId],
  )

  const layerRevision = `${places.map((place) => place._id).join(",")}:${activeCategories.join(",")}:${selectedPlaceId ?? ""}`

  const layerStateRef = useRef(layerState)
  layerStateRef.current = layerState

  const onPlaceClickRef = useRef(onPlaceClick)
  onPlaceClickRef.current = onPlaceClick

  useMapOverlay(map, placeLayerHandlers, layerState, layerRevision)

  useEffect(() => {
    const popup = new maplibregl.Popup({
      closeButton: true,
      closeOnClick: false,
      offset: 16,
      maxWidth: "none",
      className: "place-map-popup-container",
    })

    const popupController = new PlaceMapPopupController(popup)

    const clearSelection = () => {
      setSelectedPlaceId(null)
      updatePlaceSelectionHighlight(
        map,
        layerStateRef.current.activeCategories,
        null,
      )
    }

    popup.on("close", clearSelection)

    const unbind = bindPlaceLayerInteractions({
      map,
      popupController,
      getState: () => layerStateRef.current,
      onSelectPlace: (place) => setSelectedPlaceId(place?._id ?? null),
      onPlaceClick: (place) => onPlaceClickRef.current?.(place),
    })

    return () => {
      popup.off("close", clearSelection)
      unbind()
      popupController.destroy()
    }
  }, [map])

  return null
}
