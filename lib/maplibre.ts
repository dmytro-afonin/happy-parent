import { setWorkerUrl } from "maplibre-gl";

let configured = false;

/** Turbopack rewrites MapLibre's bundled worker URL into a 400. Serve the real worker instead. */
export function ensureMapLibreWorker() {
  if (configured || typeof window === "undefined") return;
  setWorkerUrl("/maplibre-gl-worker");
  configured = true;
}
