import { setWorkerUrl } from "maplibre-gl"
import maplibreWorkerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url"

/** Bundlers need an explicit worker URL for MapLibre GL JS v6. */
setWorkerUrl(maplibreWorkerUrl)
