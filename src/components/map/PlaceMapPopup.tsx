"use client"

import { ExternalLinkIcon, MapPinIcon, NavigationIcon } from "lucide-react"

import { PLACE_CATEGORY_META } from "@/lib/place-categories"
import {
  formatCoordinatesAddress,
  getNavigationLinks,
} from "@/lib/navigation-links"
import type { MapPlace } from "@/lib/map/place-layers"

type PlaceMapPopupProps = {
  place: MapPlace
}

export function PlaceMapPopup({ place }: PlaceMapPopupProps) {
  const meta = PLACE_CATEGORY_META[place.category]
  const photoUrl = place.coverPhotoThumbnailUrl ?? place.coverPhotoUrl
  const address = place.address ?? formatCoordinatesAddress(place.lat, place.lng)
  const navigation = getNavigationLinks(place.lat, place.lng, place.name)

  return (
    <div className="place-map-popup w-[min(280px,calc(100vw-2rem))] overflow-hidden font-sans">
      {photoUrl ? (
        <img
          src={photoUrl}
          alt={place.name}
          className="block h-36 w-full object-cover"
        />
      ) : null}

      <div className="space-y-3 p-3">
        <div>
          <h3 className="text-base leading-snug font-semibold">{place.name}</h3>
          <p className="text-xs text-muted-foreground">
            {meta.label}
            {place.geometryType === "polygon" ? " · Area" : ""}
          </p>
        </div>

        {place.description ? (
          <p className="text-sm leading-relaxed text-foreground/90">
            {place.description}
          </p>
        ) : null}

        <div className="flex items-start gap-2 text-sm text-muted-foreground">
          <MapPinIcon className="mt-0.5 size-4 shrink-0" />
          <span className="leading-snug">{address}</span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <a
            href={navigation.google}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 rounded-md border bg-background px-2.5 py-2 text-xs font-medium transition-colors hover:bg-muted"
          >
            <NavigationIcon className="size-3.5" />
            Google Maps
            <ExternalLinkIcon className="size-3" />
          </a>
          <a
            href={navigation.apple}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 rounded-md border bg-background px-2.5 py-2 text-xs font-medium transition-colors hover:bg-muted"
          >
            <NavigationIcon className="size-3.5" />
            Apple Maps
            <ExternalLinkIcon className="size-3" />
          </a>
        </div>
      </div>
    </div>
  )
}
