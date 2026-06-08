type NominatimAddress = Record<string, string>

type NominatimPlace = {
  name?: string
  display_name: string
  address?: NominatimAddress
}

const POI_NAME_KEYS = [
  "amenity",
  "leisure",
  "tourism",
  "shop",
  "office",
  "historic",
  "natural",
  "landuse",
  "building",
  "place",
  "railway",
  "aeroway",
] as const

export function formatNominatimPlace(place: NominatimPlace) {
  const address = place.address ?? {}
  const name = place.name?.trim() || findNameFromAddress(address)
  const label =
    name || place.display_name.split(",")[0]?.trim() || place.display_name

  const streetLine = formatStreetLine(address)
  const localityLine = formatLocalityLine(address, label)
  const subtitleParts = [streetLine, localityLine]
    .filter((part): part is string => Boolean(part))
    .filter((part) => !isSamePlacePart(part, label))

  const subtitle =
    subtitleParts.length > 0
      ? subtitleParts.join(", ")
      : fallbackSubtitle(place.display_name, label)

  return { label, subtitle: subtitle || undefined }
}

function findNameFromAddress(address: NominatimAddress) {
  for (const key of POI_NAME_KEYS) {
    const value = address[key]?.trim()
    if (value) {
      return value
    }
  }
  return undefined
}

function formatStreetLine(address: NominatimAddress) {
  if (address.road) {
    return address.house_number
      ? `${address.road} ${address.house_number}`
      : address.road
  }

  return address.house_number?.trim() || undefined
}

function formatLocalityLine(address: NominatimAddress, label: string) {
  const district =
    address.suburb ||
    address.city_district ||
    address.quarter ||
    address.neighbourhood ||
    address.borough

  const city =
    address.city ||
    address.town ||
    address.village ||
    address.municipality ||
    address.county

  const parts: string[] = []

  if (district && !isSamePlacePart(district, label)) {
    parts.push(district)
  }

  if (
    city &&
    !isSamePlacePart(city, label) &&
    !isSamePlacePart(city, district)
  ) {
    parts.push(city)
  }

  return parts.length > 0 ? parts.join(", ") : undefined
}

function isSamePlacePart(a: string | undefined, b: string | undefined) {
  if (!a || !b) {
    return false
  }

  return a.trim().toLocaleLowerCase("pl") === b.trim().toLocaleLowerCase("pl")
}

function fallbackSubtitle(displayName: string, label: string) {
  const parts = displayName
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((part) => !isSamePlacePart(part, label))

  const trimmed = parts
    .filter((part) => !/^\d{2}-\d{3}$/.test(part))
    .filter((part) => !/^województwo /i.test(part))
    .slice(0, 3)
    .join(", ")

  return trimmed || undefined
}

/** Single-line readable address for place cards and map popups. */
export function formatNominatimAddress(place: NominatimPlace) {
  const { label, subtitle } = formatNominatimPlace(place)
  const parts = [label, subtitle].filter(
    (part): part is string => Boolean(part && part.trim()),
  )

  if (parts.length > 0) {
    return parts.join(", ")
  }

  return place.display_name.trim()
}
