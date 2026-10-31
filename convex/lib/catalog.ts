/**
 * Legacy fixed catalog kept only for reference / migration slug hints.
 * Runtime catalog lives in the `catalogItems` table (see seed.ts).
 */
export const PLACE_TYPE_SLUGS = [
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

export const PLACE_ATTRIBUTE_SLUGS = [
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
