export type PlaceSearchSource = "recent" | "geocoding" | "local" | "label"

export type PlaceSearchResult = {
  id: string
  label: string
  subtitle?: string
  lat: number
  lng: number
  source: PlaceSearchSource
  query?: string
  externalId?: string
  /** Set when the hit is a label, so the row can name its category. */
  categoryLabel?: string
  /** Outside the current map view. Shown after in-view matches. */
  farther?: boolean
  placeId?: string
}

export type SearchViewport = {
  center: { lat: number; lng: number }
  bounds: {
    minLat: number
    maxLat: number
    minLng: number
    maxLng: number
  }
}

const NEARBY_RADIUS_KM = 25

function fold(value: string) {
  return value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase()
}

function includesQuery(query: string, value: string | undefined) {
  if (!value) {
    return false
  }
  return fold(value).includes(fold(query))
}

export function pointInBounds(
  lat: number,
  lng: number,
  bounds: SearchViewport["bounds"]
) {
  return (
    lat >= bounds.minLat &&
    lat <= bounds.maxLat &&
    lng >= bounds.minLng &&
    lng <= bounds.maxLng
  )
}

export type CatalogPlace = {
  id: string
  name: string
  address?: string
  description?: string
  lat: number
  lng: number
  categoryLabel: string
  labelNames: string[]
}

/** Local catalog hits, nearest first, split into the map view and a 25 km ring. */
export function searchCatalogPlaces(
  query: string,
  places: CatalogPlace[],
  viewport: SearchViewport | null
): PlaceSearchResult[] {
  const trimmed = query.trim()
  if (trimmed.length < 2) {
    return []
  }

  const matches = places.filter(
    (place) =>
      includesQuery(trimmed, place.name) ||
      includesQuery(trimmed, place.address) ||
      includesQuery(trimmed, place.description) ||
      includesQuery(trimmed, place.categoryLabel) ||
      place.labelNames.some((name) => includesQuery(trimmed, name))
  )

  const origin = viewport?.center ?? null
  const ranked = matches
    .map((place) => {
      const inView = viewport
        ? pointInBounds(place.lat, place.lng, viewport.bounds)
        : false
      const km = origin
        ? distanceKm(origin.lat, origin.lng, place.lat, place.lng)
        : 0
      const nearby = inView || km <= NEARBY_RADIUS_KM
      return { place, inView, km, nearby }
    })
    .filter((entry) => entry.nearby)
    .sort((left, right) => {
      if (left.inView !== right.inView) {
        return left.inView ? -1 : 1
      }
      return left.km - right.km
    })

  return ranked.map(({ place, inView }) => ({
    id: `local:${place.id}`,
    label: place.name,
    subtitle: place.address,
    lat: place.lat,
    lng: place.lng,
    source: "local" as const,
    categoryLabel: place.categoryLabel,
    farther: !inView,
    placeId: place.id,
  }))
}

export function searchLabelHits(
  query: string,
  labels: Array<{ id: string; name: string; categoryLabel: string }>
): PlaceSearchResult[] {
  const trimmed = query.trim()
  if (trimmed.length < 2) {
    return []
  }

  return labels
    .filter((label) => includesQuery(trimmed, label.name))
    .map((label) => ({
      id: `label:${label.id}`,
      label: label.name,
      subtitle: label.categoryLabel,
      lat: 0,
      lng: 0,
      source: "label" as const,
      categoryLabel: label.categoryLabel,
    }))
}

export type SearchResultsTab = "all" | "recent" | "map"

export type PlaceSearchResultWithDistance = PlaceSearchResult & {
  distanceKm?: number
  distanceLabel?: string
}

export function distanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
) {
  const toRad = (value: number) => (value * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2

  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function formatDistance(km: number) {
  if (km < 0.1) {
    return "Nearby"
  }

  if (km < 1) {
    return `${Math.round(km * 1000)} m`
  }

  if (km < 10) {
    return `${km.toFixed(1)} km`
  }

  return `${Math.round(km)} km`
}

export function enrichResultsWithDistance(
  results: PlaceSearchResult[],
  origin: { lat: number; lng: number } | null
): PlaceSearchResultWithDistance[] {
  const enriched: PlaceSearchResultWithDistance[] = origin
    ? results.map((result) => {
        const distance = distanceKm(
          origin.lat,
          origin.lng,
          result.lat,
          result.lng
        )

        return {
          ...result,
          distanceKm: distance,
          distanceLabel: formatDistance(distance),
        }
      })
    : results

  return [...enriched].sort(
    (left, right) =>
      (left.distanceKm ?? Number.POSITIVE_INFINITY) -
      (right.distanceKm ?? Number.POSITIVE_INFINITY)
  )
}

export function mergeSearchResults(
  recents: PlaceSearchResult[],
  geocoding: PlaceSearchResult[]
) {
  const seen = new Set<string>()
  const merged: PlaceSearchResult[] = []

  for (const result of [...recents, ...geocoding]) {
    const key = `${result.lat.toFixed(5)}:${result.lng.toFixed(5)}`
    if (seen.has(key)) {
      continue
    }
    seen.add(key)
    merged.push(result)
  }

  return merged
}

export function filterResultsByTab(
  tab: SearchResultsTab,
  recents: PlaceSearchResult[],
  geocoding: PlaceSearchResult[]
) {
  switch (tab) {
    case "recent":
      return recents
    case "map":
      return geocoding
    case "all":
      return mergeSearchResults(recents, geocoding)
  }
}

export function buildFavouriteLookup<
  T extends {
    lat: number
    lng: number
    externalId?: string
    name: string
  },
>(favourites: T[]) {
  const lookup = new Map<string, T>()

  for (const favourite of favourites) {
    if (favourite.externalId) {
      lookup.set(`id:${favourite.externalId}`, favourite)
    }

    lookup.set(
      `coords:${favourite.lat.toFixed(5)}:${favourite.lng.toFixed(5)}`,
      favourite
    )
  }

  return lookup
}

export function findFavouriteForPlace<
  T extends {
    lat: number
    lng: number
    externalId?: string
    name: string
  },
>(
  place: Pick<PlaceSearchResult, "lat" | "lng" | "externalId">,
  lookup: Map<string, T>
) {
  if (place.externalId) {
    const byExternalId = lookup.get(`id:${place.externalId}`)
    if (byExternalId) {
      return byExternalId
    }
  }

  return lookup.get(`coords:${place.lat.toFixed(5)}:${place.lng.toFixed(5)}`)
}
