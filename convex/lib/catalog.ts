/** Fixed place types — “this place is a…”. Adding one is a code change. */
export const PLACE_TYPES = [
  "playground",
  "park",
  "cafe",
  "restaurant",
  "museum",
  "library",
  "pool",
  "indoor-play",
  "clinic",
] as const;

export type PlaceType = (typeof PLACE_TYPES)[number];

export const PLACE_TYPE_LABELS: Record<PlaceType, string> = {
  playground: "Playground",
  park: "Park",
  cafe: "Cafe",
  restaurant: "Restaurant",
  museum: "Museum",
  library: "Library",
  pool: "Pool",
  "indoor-play": "Indoor play",
  clinic: "Clinic",
};

/** Fixed attributes — “this place has…”. Used as filters. */
export const PLACE_ATTRIBUTES = [
  "indoor",
  "free",
  "stroller",
  "toilet",
  "shade",
  "0-2",
  "3-6",
  "7-12",
  "13+",
] as const;

export type PlaceAttribute = (typeof PLACE_ATTRIBUTES)[number];

export const PLACE_ATTRIBUTE_LABELS: Record<PlaceAttribute, string> = {
  indoor: "Indoor",
  free: "Free",
  stroller: "Stroller",
  toilet: "Toilet",
  shade: "Shade",
  "0-2": "Ages 0–2",
  "3-6": "Ages 3–6",
  "7-12": "Ages 7–12",
  "13+": "Ages 13+",
};

/** Groups are not stored — derived from type for map layer chips. */
export const PLACE_GROUPS = ["food", "outdoors", "culture", "services"] as const;

export type PlaceGroup = (typeof PLACE_GROUPS)[number];

export const PLACE_GROUP_LABELS: Record<PlaceGroup, string> = {
  food: "Food",
  outdoors: "Outdoors",
  culture: "Culture",
  services: "Services",
};

export const TYPE_TO_GROUP: Record<PlaceType, PlaceGroup> = {
  playground: "outdoors",
  park: "outdoors",
  cafe: "food",
  restaurant: "food",
  museum: "culture",
  library: "culture",
  pool: "services",
  "indoor-play": "services",
  clinic: "services",
};

export function groupForType(type: string): PlaceGroup | undefined {
  if ((PLACE_TYPES as readonly string[]).includes(type)) {
    return TYPE_TO_GROUP[type as PlaceType];
  }
  return undefined;
}

export function isPlaceType(value: string): value is PlaceType {
  return (PLACE_TYPES as readonly string[]).includes(value);
}

export function isPlaceAttribute(value: string): value is PlaceAttribute {
  return (PLACE_ATTRIBUTES as readonly string[]).includes(value);
}
