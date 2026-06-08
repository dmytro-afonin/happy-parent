export type { MapOverlayHandlers } from "./map-overlay-host"
export {
  destroyMapOverlayHost,
  getMapOverlayHost,
  MapOverlayHost,
} from "./map-overlay-host"

export {
  ensureLayer,
  isStyleReady,
  removeLayerIfExists,
  removeLayersAndSource,
  removeSourceIfExists,
  upsertGeoJsonSource,
} from "./map-layer-utils"

export {
  adminPreviewLayerHandlers,
  clearAdminPreviewLayers,
  renderAdminPreviewLayers,
  type AdminPreviewState,
} from "./admin-preview-layers"

export {
  bindPlaceLayerInteractions,
  clearPlaceLayers,
  getPlaceInteractiveLayerIds,
  getPlaceLayerIds,
  placeLayerHandlers,
  renderPlaceLayers,
  updatePlaceSelectionHighlight,
  type MapPlace,
  type PlaceLayersState,
} from "./place-layers"

export {
  categoryMarkerImageId,
  ensureCategoryMarkerImages,
} from "./category-marker-icons"

export { PlaceMapPopupController } from "./place-map-popup"
