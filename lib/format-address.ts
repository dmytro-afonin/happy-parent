import { haversineMeters } from "@/lib/filter-places";

const DROP_TOKENS = new Set([
  "polska",
  "poland",
  "warszawa",
  "warsaw",
  "województwo mazowieckie",
  "mazowieckie",
  "masovian voivodeship",
]);

/** Keep street / locality bits; drop city, region, country noise. */
export function shortenAddress(
  full: string,
  label?: string,
): string {
  const raw = full.trim();
  if (!raw) return "";
  const parts = raw
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length <= 2) return raw;

  const filtered = parts.filter((part, index) => {
    const lower = part.toLowerCase();
    if (DROP_TOKENS.has(lower)) return false;
    if (/^\d{2}-\d{3}$/.test(part)) return false;
    // Drop exact label duplicate at the start (e.g. "Żabka, …")
    if (index === 0 && label && lower === label.trim().toLowerCase()) {
      return false;
    }
    return true;
  });

  const useful = filtered.slice(0, 2);
  return useful.join(", ") || parts.slice(0, 2).join(", ");
}

/** Metric distance label from an origin (user or map center). */
export function formatMetricDistance(
  from: { lat: number; lng: number } | null | undefined,
  to: { lat: number; lng: number },
): string | null {
  if (!from) return null;
  const meters = haversineMeters(from, to);
  if (!Number.isFinite(meters)) return null;
  if (meters < 1000) return `${Math.round(meters)} m`;
  const km = meters / 1000;
  return km < 10 ? `${km.toFixed(1)} km` : `${Math.round(km)} km`;
}
