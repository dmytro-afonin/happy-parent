"use client";

import {
  Authenticated,
  AuthLoading,
  Unauthenticated,
  useMutation,
  useQuery,
} from "convex/react";
import { SignInButton } from "@clerk/nextjs";
import { LocateFixed } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { MapView } from "@/components/map/MapView";
import { PlaceSheet } from "@/components/map/PlaceSheet";
import { SearchPanel } from "@/components/map/SearchPanel";
import { SubmitPlaceForm } from "@/components/map/SubmitPlaceForm";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import type { CatalogItem } from "@/lib/catalog";
import { filterPlaces, type PublicPlace } from "@/lib/filter-places";
import { searchLocationIq } from "@/lib/locationiq";
import {
  loadRecents,
  rememberRecent,
  type Recent,
} from "@/lib/recents";
import {
  searchWarsawAddresses,
  type WarsawAddress,
} from "@/lib/warsaw-addresses";

function toggle(list: string[], value: string): string[] {
  return list.includes(value)
    ? list.filter((item) => item !== value)
    : [...list, value];
}

export default function MapPage() {
  const places = useQuery(api.places.listPublic) as PublicPlace[] | undefined;
  const catalog = useQuery(api.catalog.list) as CatalogItem[] | undefined;
  const favouriteIds = useQuery(api.favorites.listMine);
  const toggleFavourite = useMutation(api.favorites.toggle);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [attributeIds, setAttributeIds] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [panel, setPanel] = useState<"closed" | "search" | "favourites">(
    "closed",
  );
  const [recents, setRecents] = useState<Recent[]>(() => loadRecents());
  const [location, setLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [addressMarker, setAddressMarker] = useState<WarsawAddress | null>(
    null,
  );
  const [liqHits, setLiqHits] = useState<WarsawAddress[]>([]);
  const [showSubmit, setShowSubmit] = useState(false);

  useEffect(() => {
    const needle = query.trim();
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (needle.length < 2) {
        if (!cancelled) setLiqHits([]);
        return;
      }
      void searchLocationIq(needle).then((hits) => {
        if (!cancelled) setLiqHits(hits);
      });
    }, needle.length < 2 ? 0 : 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query]);

  const categories = useMemo(
    () => (catalog ?? []).filter((item) => item.kind === "category"),
    [catalog],
  );
  const attributes = useMemo(
    () => (catalog ?? []).filter((item) => item.kind === "attribute"),
    [catalog],
  );

  const visiblePins = useMemo(() => {
    if (!places) return [];
    return filterPlaces(places, {
      categoryIds,
      attributeIds,
      text: "",
      location,
    });
  }, [places, categoryIds, attributeIds, location]);

  const placesById = useMemo(() => {
    const map = new Map<string, PublicPlace>();
    for (const place of places ?? []) map.set(place._id, place);
    return map;
  }, [places]);

  const selected = selectedId ? (placesById.get(selectedId) ?? null) : null;
  const needle = query.trim().toLowerCase();

  const placeHits = useMemo(() => {
    if (!needle || !places) return [];
    return places
      .filter((place) =>
        `${place.name} ${place.description} ${place.address} ${place.categories.join(" ")} ${place.attributes.join(" ")}`
          .toLowerCase()
          .includes(needle),
      )
      .slice(0, 5);
  }, [places, needle]);

  const filterHits = useMemo(() => {
    if (!needle) return [];
    return [...categories, ...attributes]
      .filter((item) => item.label.toLowerCase().includes(needle))
      .slice(0, 6);
  }, [categories, attributes, needle]);

  const staticAddressHits = useMemo(
    () => searchWarsawAddresses(query, 6),
    [query],
  );

  const addressHits = useMemo(() => {
    const seen = new Set<string>();
    const merged: WarsawAddress[] = [];
    for (const hit of [...staticAddressHits, ...liqHits]) {
      const key = `${hit.label}|${hit.lat.toFixed(4)}|${hit.lng.toFixed(4)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(hit);
    }
    return merged.slice(0, 8);
  }, [staticAddressHits, liqHits]);

  const favouritePlaces = useMemo(() => {
    return (favouriteIds ?? [])
      .map((id) => placesById.get(id))
      .filter((place): place is PublicPlace => Boolean(place));
  }, [favouriteIds, placesById]);

  function openPlace(id: string) {
    const place = placesById.get(id);
    if (!place) return;
    setSelectedId(id);
    setAddressMarker(null);
    setPanel("closed");
    setQuery(place.name);
    setRecents((prev) =>
      rememberRecent(prev, { kind: "place", placeId: id, at: Date.now() }),
    );
  }

  function commitSearch() {
    const value = query.trim();
    if (!value) return;
    setRecents((prev) =>
      rememberRecent(prev, { kind: "search", query: value, at: Date.now() }),
    );
    setPanel("search");
    setSelectedId(null);
  }

  function applyFilter(item: CatalogItem) {
    if (item.kind === "category") setCategoryIds((prev) => toggle(prev, item._id));
    else setAttributeIds((prev) => toggle(prev, item._id));
    setRecents((prev) =>
      rememberRecent(prev, {
        kind: "search",
        query: item.label,
        at: Date.now(),
      }),
    );
    setQuery("");
    setPanel("closed");
    setSelectedId(null);
  }

  function openAddress(hit: WarsawAddress) {
    setAddressMarker(hit);
    setSelectedId(null);
    setQuery(hit.label);
    setPanel("closed");
    setRecents((prev) =>
      rememberRecent(prev, {
        kind: "search",
        query: hit.label,
        at: Date.now(),
      }),
    );
  }

  function requestLocation() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      },
      () => setLocation(null),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  async function onToggleSave() {
    if (!selectedId) return;
    await toggleFavourite({ placeId: selectedId as Id<"places"> });
  }

  return (
    <div className="relative min-h-[calc(100vh-3.5rem)] w-full">
      <div className="absolute inset-0">
        <MapView
          places={visiblePins}
          selectedId={selectedId}
          onSelect={(id) => {
            if (id) openPlace(id);
            else {
              setSelectedId(null);
              setPanel("closed");
            }
          }}
          userLocation={location}
          addressMarker={addressMarker}
          flyTo={
            addressMarker
              ? {
                  lat: addressMarker.lat,
                  lng: addressMarker.lng,
                  zoom: 14,
                }
              : location && !selectedId
                ? { lat: location.lat, lng: location.lng, zoom: 13 }
                : null
          }
        />
      </div>

      <SearchPanel
        query={query}
        onQuery={setQuery}
        panel={panel}
        onPanel={(next) => {
          setPanel(next);
          if (next === "favourites") setSelectedId(null);
        }}
        categories={categories}
        attributes={attributes}
        categoryIds={categoryIds}
        attributeIds={attributeIds}
        onToggleCategory={(id) => setCategoryIds((prev) => toggle(prev, id))}
        onToggleAttribute={(id) => setAttributeIds((prev) => toggle(prev, id))}
        placeHits={placeHits}
        addressHits={addressHits}
        filterHits={filterHits}
        recents={recents}
        favouritePlaces={favouritePlaces}
        placesById={placesById}
        onOpenPlace={openPlace}
        onOpenAddress={openAddress}
        onApplyFilter={applyFilter}
        onCommitSearch={commitSearch}
        selectedPlace={selected}
        placeSheet={
          selected ? (
            <PlaceSheet
              place={selected}
              saved={(favouriteIds ?? []).some((id) => id === selected._id)}
              onClose={() => {
                setSelectedId(null);
                setQuery("");
              }}
              onToggleSave={() => void onToggleSave()}
            />
          ) : null
        }
      />

      <button
        type="button"
        title="Your location"
        aria-label="Your location"
        onClick={requestLocation}
        className="absolute right-4 bottom-4 z-20 inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--line)] bg-white text-[var(--ink)] shadow"
      >
        <LocateFixed className="h-4 w-4" />
      </button>

      <div className="absolute right-4 bottom-16 z-20 flex flex-col items-end gap-2">
        <AuthLoading>
          <span className="rounded-md bg-white/95 px-3 py-1.5 text-xs text-[var(--ink-muted)] shadow ring-1 ring-[var(--line)]">
            Checking session…
          </span>
        </AuthLoading>
        <Unauthenticated>
          <SignInButton mode="modal">
            <button
              type="button"
              className="rounded-md bg-white/95 px-3 py-1.5 text-xs font-medium text-[var(--ink)] shadow ring-1 ring-[var(--line)]"
            >
              Sign in to add a place
            </button>
          </SignInButton>
        </Unauthenticated>
        <Authenticated>
          <button
            type="button"
            onClick={() => setShowSubmit((v) => !v)}
            className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow"
          >
            {showSubmit ? "Close form" : "Suggest a place"}
          </button>
          {showSubmit ? (
            <div className="w-[min(360px,calc(100vw-2rem))] rounded-xl border border-[var(--line)] bg-[var(--paper)] p-3 shadow">
              <SubmitPlaceForm
                categories={categories}
                attributes={attributes}
                defaultLat={location?.lat ?? addressMarker?.lat}
                defaultLng={location?.lng ?? addressMarker?.lng}
                onSubmitted={() => setShowSubmit(false)}
              />
            </div>
          ) : null}
        </Authenticated>
      </div>
    </div>
  );
}
