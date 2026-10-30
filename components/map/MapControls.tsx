"use client";

import {
  Layers,
  LocateFixed,
  Minus,
  Mountain,
  Plus,
} from "lucide-react";
import { useState } from "react";
import type { MapStyleId } from "@/components/map/MapView";

type Props = {
  pitch3d: boolean;
  styleId: MapStyleId;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onLocate: () => void;
  onToggle3d: () => void;
  onStyle: (style: MapStyleId) => void;
};

const STYLES: { id: MapStyleId; label: string }[] = [
  { id: "streets", label: "Streets" },
  { id: "light", label: "Light" },
  { id: "outdoors", label: "Soft" },
];

export function MapControls({
  pitch3d,
  styleId,
  onZoomIn,
  onZoomOut,
  onLocate,
  onToggle3d,
  onStyle,
}: Props) {
  const [layersOpen, setLayersOpen] = useState(false);

  return (
    <div className="pointer-events-none absolute right-3 bottom-16 z-30 flex flex-col items-end gap-2 sm:bottom-20">
      <div className="pointer-events-auto flex flex-col items-end gap-2">
        {layersOpen ? (
          <div className="map-sheet mb-1 flex min-w-[9.5rem] flex-col gap-0.5 p-1.5">
            {STYLES.map((style) => (
              <button
                key={style.id}
                type="button"
                className="map-row text-sm"
                data-active={styleId === style.id || undefined}
                onClick={() => {
                  onStyle(style.id);
                  setLayersOpen(false);
                }}
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    styleId === style.id ? "bg-primary" : "bg-[var(--line)]"
                  }`}
                />
                {style.label}
              </button>
            ))}
          </div>
        ) : null}

        <div className="flex flex-col overflow-hidden rounded-2xl shadow-[0_1px_2px_rgb(20_53_40/8%),0_4px_14px_rgb(20_53_40/10%)]">
          <button
            type="button"
            title="Zoom in"
            aria-label="Zoom in"
            className="map-fab h-10 w-10 rounded-none shadow-none"
            onClick={onZoomIn}
          >
            <Plus className="h-4 w-4" />
          </button>
          <div className="h-px bg-[var(--line)]/70" />
          <button
            type="button"
            title="Zoom out"
            aria-label="Zoom out"
            className="map-fab h-10 w-10 rounded-none shadow-none"
            onClick={onZoomOut}
          >
            <Minus className="h-4 w-4" />
          </button>
        </div>

        <button
          type="button"
          title="Your location"
          aria-label="Your location"
          className="map-fab h-10 w-10 rounded-2xl"
          onClick={onLocate}
        >
          <LocateFixed className="h-4 w-4" />
        </button>

        <button
          type="button"
          title={pitch3d ? "2D view" : "3D view"}
          aria-label={pitch3d ? "Switch to 2D" : "Switch to 3D"}
          aria-pressed={pitch3d}
          className="map-fab h-10 w-10 rounded-2xl"
          onClick={onToggle3d}
        >
          <Mountain className="h-4 w-4" />
        </button>

        <button
          type="button"
          title="Map layers"
          aria-label="Map layers"
          aria-pressed={layersOpen}
          className="map-fab h-10 w-10 rounded-2xl"
          onClick={() => setLayersOpen((v) => !v)}
        >
          <Layers className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
