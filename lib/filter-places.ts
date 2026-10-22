import {
  groupForType,
  type PlaceAttribute,
  type PlaceGroup,
  type PlaceType,
} from "@/convex/lib/catalog";

export type ApprovedPlace = {
  _id: string;
  name: string;
  description?: string;
  address?: string;
  lat: number;
  lng: number;
  geometryType: "point" | "polygon";
  boundary?: Array<{ lat: number; lng: number }>;
  type: string;
  attributes: string[];
  status: "approved" | "pending";
};

export type PlaceFilters = {
  groups: PlaceGroup[];
  types: PlaceType[];
  attributes: PlaceAttribute[];
  text: string;
  /** Browser geolocation; when set, results sort by distance. */
  location?: { lat: number; lng: number } | null;
};

function haversineMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Pure client filter: group, type, attributes, text; optional distance sort. */
export function filterPlaces(
  places: ApprovedPlace[],
  filters: PlaceFilters,
): ApprovedPlace[] {
  const text = filters.text.trim().toLowerCase();

  let result = places.filter((place) => {
    const group = groupForType(place.type);
    if (filters.groups.length > 0) {
      if (!group || !filters.groups.includes(group)) return false;
    }
    if (filters.types.length > 0) {
      if (!filters.types.includes(place.type as PlaceType)) return false;
    }
    if (filters.attributes.length > 0) {
      const hasAll = filters.attributes.every((attr) =>
        place.attributes.includes(attr),
      );
      if (!hasAll) return false;
    }
    if (text) {
      const hay = `${place.name} ${place.description ?? ""} ${place.address ?? ""}`.toLowerCase();
      if (!hay.includes(text)) return false;
    }
    return true;
  });

  if (filters.location) {
    const origin = filters.location;
    result = [...result].sort(
      (a, b) =>
        haversineMeters(origin, { lat: a.lat, lng: a.lng }) -
        haversineMeters(origin, { lat: b.lat, lng: b.lng }),
    );
  } else {
    result = [...result].sort((a, b) => a.name.localeCompare(b.name));
  }

  return result;
}
