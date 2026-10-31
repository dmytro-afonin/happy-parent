"use client";

import {
  Map as MapLibreMap,
  Marker,
  type GeoJSONSource,
  type MapMouseEvent,
  type TransformStyleFunction,
} from "maplibre-gl";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import type { PublicPlace } from "@/lib/filter-places";
import { ensureMapLibreWorker } from "@/lib/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";

const WARSAW: [number, number] = [21.0122, 52.2297];

export const MAP_STYLES = {
  streets: "https://tiles.openfreemap.org/styles/liberty",
  light: "https://tiles.openfreemap.org/styles/bright",
  outdoors: "https://tiles.openfreemap.org/styles/positron",
} as const;

export type MapStyleId = keyof typeof MAP_STYLES;

export type MapHandle = {
  zoomIn: () => void;
  zoomOut: () => void;
  setPitch3d: (enabled: boolean) => void;
  setStyle: (style: MapStyleId) => void;
  easeTo: (opts: { lat: number; lng: number; zoom?: number }) => void;
};

type AddressMarker = {
  id: string;
  label: string;
  lat: number;
  lng: number;
};

type Props = {
  places: PublicPlace[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  /** Fired for empty-map clicks (no place hit). Used for pin-drop. */
  onMapClick?: (coords: { lat: number; lng: number }) => void;
  userLocation?: { lat: number; lng: number } | null;
  addressMarker?: AddressMarker | null;
  flyTo?: { lat: number; lng: number; zoom?: number } | null;
  styleId?: MapStyleId;
  pickMode?: boolean;
};

function placesToGeoJSON(places: PublicPlace[]): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];

  for (const place of places) {
    if (place.geometryType === "polygon" && place.boundary?.length) {
      const ring = place.boundary.map(
        (p) => [p.lng, p.lat] as [number, number],
      );
      const first = ring[0];
      const last = ring[ring.length - 1];
      if (first[0] !== last[0] || first[1] !== last[1]) {
        ring.push([...first]);
      }
      features.push({
        type: "Feature",
        id: place._id,
        properties: {
          id: place._id,
          name: place.name,
          kind: "polygon",
        },
        geometry: {
          type: "Polygon",
          coordinates: [ring],
        },
      });
    }

    features.push({
      type: "Feature",
      id: `${place._id}-point`,
      properties: {
        id: place._id,
        name: place.name,
        kind: "point",
      },
      geometry: {
        type: "Point",
        coordinates: [place.lng, place.lat],
      },
    });
  }

  return { type: "FeatureCollection", features };
}

/** OpenFreeMap hosts Noto Sans; MapLibre’s default Open Sans stack 404s here. */
const PLACE_TEXT_FONT = ["Noto Sans Regular"];

/** US highway shields are useless in Warsaw and emit null-filter warnings. */
const NOISY_STYLE_LAYER_IDS = new Set([
  "highway-shield-non-us",
  "highway-shield-us-interstate",
  "road_shield_us",
]);

/** Drop noisy layers before MapLibre evaluates their filters. */
const transformStyle: TransformStyleFunction = (_previous, next) => ({
  ...next,
  layers: next.layers.filter((layer) => !NOISY_STYLE_LAYER_IDS.has(layer.id)),
});

/** OpenFreeMap sprites sometimes omit POI icons — stub them to silence warnings. */
function installMissingImageStub(map: MapLibreMap) {
  const empty = new ImageData(1, 1);
  map.setMissingStyleImageResolver((name) => {
    if (!map.hasImage(name)) {
      map.addImage(name, empty, { pixelRatio: 1 });
    }
  });
}

function ensureLayers(map: MapLibreMap) {

  if (!map.getSource("places")) {
    map.addSource("places", {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    });
  }

  if (!map.getLayer("places-fill")) {
    map.addLayer({
      id: "places-fill",
      type: "fill",
      source: "places",
      filter: ["==", ["get", "kind"], "polygon"],
      paint: {
        "fill-color": "#2f6f4e",
        "fill-opacity": 0.28,
      },
    });
  }

  if (!map.getLayer("places-line")) {
    map.addLayer({
      id: "places-line",
      type: "line",
      source: "places",
      filter: ["==", ["get", "kind"], "polygon"],
      paint: {
        "line-color": "#1f4d3a",
        "line-width": 2,
      },
    });
  }

  // Invisible hit target — symbol icons are easy to miss with fat fingers / automation.
  if (!map.getLayer("places-hit")) {
    map.addLayer({
      id: "places-hit",
      type: "circle",
      source: "places",
      filter: ["==", ["get", "kind"], "point"],
      paint: {
        "circle-radius": 18,
        "circle-color": "#000000",
        "circle-opacity": 0,
      },
    });
  }

  if (!map.getLayer("places-points")) {
    map.addLayer({
      id: "places-points",
      type: "symbol",
      source: "places",
      filter: ["==", ["get", "kind"], "point"],
      layout: {
        "icon-image": "place-pin",
        "icon-size": 1.15,
        "icon-anchor": "bottom",
        "icon-allow-overlap": true,
        "icon-ignore-placement": true,
        "text-field": ["get", "name"],
        "text-font": PLACE_TEXT_FONT,
        "text-offset": [0, 0.6],
        "text-anchor": "top",
        "text-size": 11,
        "text-optional": true,
        "text-allow-overlap": false,
      },
      paint: {
        "text-color": "#143528",
        "text-halo-color": "#f7f3eb",
        "text-halo-width": 1.5,
      },
    });
  } else {
    map.setLayoutProperty("places-points", "text-font", PLACE_TEXT_FONT);
  }
}

function addPinImage(map: MapLibreMap) {
  if (map.hasImage("place-pin")) return;
  const size = 48;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2 - 4, 12, 0, Math.PI * 2);
  ctx.fillStyle = "#1f4d3a";
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(size / 2 - 9, size / 2 + 4);
  ctx.lineTo(size / 2, size / 2 + 18);
  ctx.lineTo(size / 2 + 9, size / 2 + 4);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.arc(size / 2, size / 2 - 4, 5, 0, Math.PI * 2);
  ctx.fillStyle = "#f7f3eb";
  ctx.fill();
  const data = ctx.getImageData(0, 0, size, size);
  map.addImage("place-pin", data, { pixelRatio: 2 });
}

function wireMapData(map: MapLibreMap, places: PublicPlace[]) {
  addPinImage(map);
  ensureLayers(map);
  const source = map.getSource("places") as GeoJSONSource | undefined;
  source?.setData(placesToGeoJSON(places));
}

export const MapView = forwardRef<MapHandle, Props>(function MapView(
  {
    places,
    selectedId,
    onSelect,
    onMapClick,
    userLocation,
    addressMarker,
    flyTo,
    styleId = "streets",
    pickMode = false,
  },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const onSelectRef = useRef(onSelect);
  const onMapClickRef = useRef(onMapClick);
  const pickModeRef = useRef(pickMode);
  const placesRef = useRef(places);
  const styleIdRef = useRef(styleId);
  const userMarkerRef = useRef<Marker | null>(null);
  const addressMarkerRef = useRef<Marker | null>(null);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    onMapClickRef.current = onMapClick;
  }, [onMapClick]);

  useEffect(() => {
    pickModeRef.current = pickMode;
    const map = mapRef.current;
    if (map) {
      map.getCanvas().style.cursor = pickMode ? "crosshair" : "";
    }
  }, [pickMode]);

  useEffect(() => {
    placesRef.current = places;
  }, [places]);

  useImperativeHandle(ref, () => ({
    zoomIn: () => mapRef.current?.zoomIn({ duration: 200 }),
    zoomOut: () => mapRef.current?.zoomOut({ duration: 200 }),
    setPitch3d: (enabled) => {
      const map = mapRef.current;
      if (!map) return;
      map.easeTo({
        pitch: enabled ? 55 : 0,
        bearing: enabled ? map.getBearing() || -12 : 0,
        duration: 500,
      });
    },
    setStyle: (next) => {
      const map = mapRef.current;
      if (!map) return;
      styleIdRef.current = next;
      map.setStyle(MAP_STYLES[next], { transformStyle });
      map.once("style.load", () => {
        installMissingImageStub(map);
        wireMapData(map, placesRef.current);
      });
    },
    easeTo: ({ lat, lng, zoom }) => {
      mapRef.current?.easeTo({
        center: [lng, lat],
        zoom: zoom ?? Math.max(mapRef.current.getZoom(), 14),
        duration: 500,
      });
    },
  }));

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    ensureMapLibreWorker();
    const map = new MapLibreMap({
      container: containerRef.current,
      style: MAP_STYLES[styleIdRef.current],
      transformStyle,
      center: WARSAW,
      zoom: 12,
      attributionControl: {
        compact: true,
      },
    });
    mapRef.current = map;

    const resize = () => map.resize();
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(containerRef.current);

    map.on("load", () => {
      resize();
      installMissingImageStub(map);
      wireMapData(map, placesRef.current);
    });

    const hitLayers = () =>
      ["places-hit", "places-points", "places-fill"].filter((id) =>
        Boolean(map.getLayer(id)),
      );

    const handleClick = (e: MapMouseEvent) => {
      if (pickModeRef.current) {
        onMapClickRef.current?.({
          lat: e.lngLat.lat,
          lng: e.lngLat.lng,
        });
        return;
      }
      const layers = hitLayers();
      if (layers.length === 0) {
        onMapClickRef.current?.({
          lat: e.lngLat.lat,
          lng: e.lngLat.lng,
        });
        return;
      }
      const features = map.queryRenderedFeatures(e.point, { layers });
      const id = features[0]?.properties?.id as string | undefined;
      if (id) {
        onSelectRef.current(id);
        return;
      }
      onSelectRef.current(null);
      onMapClickRef.current?.({
        lat: e.lngLat.lat,
        lng: e.lngLat.lng,
      });
    };

    map.on("click", handleClick);

    const setPointer = () => {
      if (!pickModeRef.current) map.getCanvas().style.cursor = "pointer";
    };
    const clearPointer = () => {
      if (!pickModeRef.current) map.getCanvas().style.cursor = "";
    };
    map.on("mouseenter", "places-hit", setPointer);
    map.on("mouseleave", "places-hit", clearPointer);
    map.on("mouseenter", "places-points", setPointer);
    map.on("mouseleave", "places-points", clearPointer);

    return () => {
      ro.disconnect();
      userMarkerRef.current?.remove();
      addressMarkerRef.current?.remove();
      map.off("click", handleClick);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const update = () => wireMapData(map, places);
    if (map.isStyleLoaded()) update();
    else map.once("load", update);
  }, [places]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || styleIdRef.current === styleId) return;
    styleIdRef.current = styleId;
    map.setStyle(MAP_STYLES[styleId], { transformStyle });
    map.once("style.load", () => {
      installMissingImageStub(map);
      wireMapData(map, placesRef.current);
    });
  }, [styleId]);

  const selectedPlace = places.find((p) => p._id === selectedId);
  const selectedLng = selectedPlace?.lng;
  const selectedLat = selectedPlace?.lat;

  useEffect(() => {
    const map = mapRef.current;
    if (!map || selectedLng === undefined || selectedLat === undefined) return;
    map.easeTo({
      center: [selectedLng, selectedLat],
      zoom: Math.max(map.getZoom(), 14),
      duration: 500,
    });
  }, [selectedId, selectedLng, selectedLat]);

  const flyLat = flyTo?.lat;
  const flyLng = flyTo?.lng;
  const flyZoom = flyTo?.zoom;

  useEffect(() => {
    const map = mapRef.current;
    if (!map || flyLat === undefined || flyLng === undefined) return;
    map.easeTo({
      center: [flyLng, flyLat],
      zoom: flyZoom ?? Math.max(map.getZoom(), 14),
      duration: 500,
    });
  }, [flyLat, flyLng, flyZoom]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    userMarkerRef.current?.remove();
    userMarkerRef.current = null;
    if (!userLocation) return;
    const el = document.createElement("div");
    el.className = "h-3.5 w-3.5 rounded-full border-2 border-white bg-primary";
    el.title = "You are here";
    userMarkerRef.current = new Marker({ element: el })
      .setLngLat([userLocation.lng, userLocation.lat])
      .addTo(map);
  }, [userLocation]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    addressMarkerRef.current?.remove();
    addressMarkerRef.current = null;
    if (!addressMarker) return;
    const el = document.createElement("div");
    el.className =
      "rounded-full bg-white px-2.5 py-1 text-xs text-[var(--ink)] shadow-[0_2px_10px_rgb(20_53_40/14%)]";
    el.textContent = addressMarker.label;
    addressMarkerRef.current = new Marker({ element: el, anchor: "bottom" })
      .setLngLat([addressMarker.lng, addressMarker.lat])
      .addTo(map);
  }, [addressMarker]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full overflow-hidden"
      role="presentation"
    />
  );
});
