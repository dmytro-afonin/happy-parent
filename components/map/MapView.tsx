"use client";

import {
  Map as MapLibreMap,
  Marker,
  type GeoJSONSource,
  type MapMouseEvent,
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
  userLocation?: { lat: number; lng: number } | null;
  addressMarker?: AddressMarker | null;
  flyTo?: { lat: number; lng: number; zoom?: number } | null;
  styleId?: MapStyleId;
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

  if (!map.getLayer("places-points")) {
    map.addLayer({
      id: "places-points",
      type: "symbol",
      source: "places",
      filter: ["==", ["get", "kind"], "point"],
      layout: {
        "icon-image": "place-pin",
        "icon-size": 1,
        "icon-allow-overlap": true,
        "text-field": ["get", "name"],
        "text-offset": [0, 1.2],
        "text-size": 11,
        "text-optional": true,
      },
      paint: {
        "text-color": "#143528",
        "text-halo-color": "#f7f3eb",
        "text-halo-width": 1.5,
      },
    });
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
    userLocation,
    addressMarker,
    flyTo,
    styleId = "streets",
  },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const onSelectRef = useRef(onSelect);
  const placesRef = useRef(places);
  const styleIdRef = useRef(styleId);
  const userMarkerRef = useRef<Marker | null>(null);
  const addressMarkerRef = useRef<Marker | null>(null);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

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
      map.setStyle(MAP_STYLES[next]);
      map.once("style.load", () => {
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
      wireMapData(map, placesRef.current);
    });

    const handleClick = (e: MapMouseEvent) => {
      if (!map.getLayer("places-points") || !map.getLayer("places-fill")) {
        return;
      }
      const features = map.queryRenderedFeatures(e.point, {
        layers: ["places-points", "places-fill"],
      });
      const id = features[0]?.properties?.id as string | undefined;
      onSelectRef.current(id ?? null);
    };

    map.on("click", handleClick);
    map.on("mouseenter", "places-points", () => {
      map.getCanvas().style.cursor = "pointer";
    });
    map.on("mouseleave", "places-points", () => {
      map.getCanvas().style.cursor = "";
    });

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
    map.setStyle(MAP_STYLES[styleId]);
    map.once("style.load", () => wireMapData(map, placesRef.current));
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

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !flyTo) return;
    map.easeTo({
      center: [flyTo.lng, flyTo.lat],
      zoom: flyTo.zoom ?? Math.max(map.getZoom(), 14),
      duration: 500,
    });
  }, [flyTo]);

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
