export type PublicPlace = {
  _id: string;
  name: string;
  description: string;
  address: string;
  categories: string[];
  attributes: string[];
  categoryIds: string[];
  attributeIds: string[];
  lat: number;
  lng: number;
  geometryType: "point" | "polygon";
  boundary?: Array<{ lat: number; lng: number }>;
  photos: number;
  updatedAt: number;
};

export type PlaceFilters = {
  categoryIds: string[];
  attributeIds: string[];
  text: string;
  /** Browser geolocation; when set, results sort by distance. */
  location?: { lat: number; lng: number } | null;
};

export function haversineMeters(
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

/** Pure client filter: categories, attributes, text; optional distance sort. */
export function filterPlaces(
  places: PublicPlace[],
  filters: PlaceFilters,
): PublicPlace[] {
  const text = filters.text.trim().toLowerCase();

  let result = places.filter((place) => {
    if (filters.categoryIds.length > 0) {
      if (!place.categoryIds.some((id) => filters.categoryIds.includes(id))) {
        return false;
      }
    }
    if (filters.attributeIds.length > 0) {
      const hasAll = filters.attributeIds.every((id) =>
        place.attributeIds.includes(id),
      );
      if (!hasAll) return false;
    }
    if (text) {
      const hay =
        `${place.name} ${place.description} ${place.address} ${place.categories.join(" ")} ${place.attributes.join(" ")}`.toLowerCase();
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
    result = [...result].sort((a, b) => a.name.localeCompare(b.name, "pl"));
  }

  return result;
}
