"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MAP_VARIANTS, type MapVariant } from "@/lib/map-variant";

const LABELS: Record<MapVariant, string> = {
  a: "A · Categories",
  b: "B · Map",
  c: "C · Mix",
};

export function VariantSwitch({ variant }: { variant: MapVariant }) {
  const pathname = usePathname();

  return (
    <div
      className="map-variant-switch"
      role="radiogroup"
      aria-label="Map design"
    >
      {MAP_VARIANTS.map((id) => {
        const selected = id === variant;
        return (
          <Link
            key={id}
            href={`${pathname}?variant=${id}`}
            replace
            scroll={false}
            role="radio"
            aria-checked={selected}
            data-active={selected || undefined}
            className="map-variant-option"
          >
            {LABELS[id]}
          </Link>
        );
      })}
    </div>
  );
}
