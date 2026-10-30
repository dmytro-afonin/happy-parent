"use client";

import {
  Map as MapLibreMap,
  Marker,
  NavigationControl,
  type GeoJSONSource,
  type MapMouseEvent,
} from "maplibre-gl";
import { useEffect, useRef } from "react";
import type { PublicPlace } from "@/lib/filter-places";
import { ensureMapLibreWorker } from "@/lib/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";

const WARSAW: [number, number] = [21.0122, 52.2297];
const STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";

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
        selected: false,
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

export function MapView({
  places,
  selectedId,
  onSelect,
  userLocation,
  addressMarker,
  flyTo,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const onSelectRef = useRef(onSelect);
  const placesRef = useRef(places);
  const userMarkerRef = useRef<Marker | null>(null);
  const addressMarkerRef = useRef<Marker | null>(null);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    placesRef.current = places;
  }, [places]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    ensureMapLibreWorker();
    const map = new MapLibreMap({
      container: containerRef.current,
      style: STYLE_URL,
      center: WARSAW,
      zoom: 12,
    });
    map.addControl(new NavigationControl(), "top-right");
    mapRef.current = map;

    const resize = () => map.resize();
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(containerRef.current);

    map.on("load", () => {
      resize();
      addPinImage(map);
      ensureLayers(map);
      const source = map.getSource("places") as GeoJSONSource;
      source.setData(placesToGeoJSON(placesRef.current));
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
    const update = () => {
      ensureLayers(map);
      const source = map.getSource("places") as GeoJSONSource | undefined;
      source?.setData(placesToGeoJSON(places));
    };
    if (map.isStyleLoaded()) update();
    else map.once("load", update);
  }, [places]);

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
      "rounded-md border border-[var(--line)] bg-white px-2 py-0.5 text-xs text-[var(--ink)] shadow";
    el.textContent = addressMarker.label;
    addressMarkerRef.current = new Marker({ element: el, anchor: "bottom" })
      .setLngLat([addressMarker.lng, addressMarker.lat])
      .addTo(map);
  }, [addressMarker]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full overflow-hidden rounded-none"
      role="presentation"
    />
  );
}
