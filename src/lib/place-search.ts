export type PlaceSearchSource = "recent" | "geocoding"

export type PlaceSearchResult = {
  id: string
  label: string
  subtitle?: string
  lat: number
  lng: number
  source: PlaceSearchSource
  query?: string
  externalId?: string
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
  if (!origin) {
    return results
  }

  return results
    .map((result) => {
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
    .sort((left, right) => left.distanceKm - right.distanceKm)
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
