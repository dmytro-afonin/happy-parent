export function getNavigationLinks(lat: number, lng: number, name: string) {
  const label = encodeURIComponent(name)

  return {
    google: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
    apple: `https://maps.apple.com/?daddr=${lat},${lng}&q=${label}`,
  }
}

export function formatCoordinatesAddress(lat: number, lng: number) {
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`
}

/** Deep link that opens the map with this place's card visible. */
export function getPlaceShareUrl(placeId: string) {
  const origin = typeof window !== "undefined" ? window.location.origin : ""
  return `${origin}/map?place=${placeId}`
}
