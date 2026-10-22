"use client";

import { Map as MapLibreMap, NavigationControl } from "maplibre-gl";
import { useEffect, useRef } from "react";
import { TerraDraw, TerraDrawPolygonMode } from "terra-draw";
import { TerraDrawMapLibreGLAdapter } from "terra-draw-maplibre-gl-adapter";
import { ringCentroid } from "@/lib/geo";
import { ensureMapLibreWorker } from "@/lib/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";

const WARSAW: [number, number] = [21.0122, 52.2297];
const STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";

export type DrawnPolygon = {
  boundary: Array<{ lat: number; lng: number }>;
  lat: number;
  lng: number;
};

type Props = {
  onPolygon: (polygon: DrawnPolygon | null) => void;
};

export function DrawMap({ onPolygon }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onPolygonRef = useRef(onPolygon);

  useEffect(() => {
    onPolygonRef.current = onPolygon;
  }, [onPolygon]);

  useEffect(() => {
    if (!containerRef.current) return;

    ensureMapLibreWorker();
    const map = new MapLibreMap({
      container: containerRef.current,
      style: STYLE_URL,
      center: WARSAW,
      zoom: 12,
    });
    map.addControl(new NavigationControl(), "top-right");

    let draw: TerraDraw | null = null;

    const publish = () => {
      if (!draw) return;
      const features = draw
        .getSnapshot()
        .filter((f) => f.geometry.type === "Polygon");
      const feature = features[features.length - 1];
      if (!feature || feature.geometry.type !== "Polygon") {
        onPolygonRef.current(null);
        return;
      }
      const ring = feature.geometry.coordinates[0] as [number, number][];
      const boundary = ring.map(([lng, lat]) => ({ lat, lng }));
      const { lat, lng } = ringCentroid(boundary);
      onPolygonRef.current({ boundary, lat, lng });
    };

    map.on("load", () => {
      draw = new TerraDraw({
        adapter: new TerraDrawMapLibreGLAdapter({ map }),
        modes: [new TerraDrawPolygonMode()],
      });
      draw.start();
      draw.setMode("polygon");
      draw.on("finish", publish);
      draw.on("change", publish);
    });

    return () => {
      draw?.stop();
      map.remove();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="h-[420px] w-full border border-[var(--line)]"
      role="presentation"
    />
  );
}
