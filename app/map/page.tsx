"use client";

import { useMutation, useQuery } from "convex/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { MapControls } from "@/components/map/MapControls";
import { MapMenu } from "@/components/map/MapMenu";
import {
  MapView,
  type MapHandle,
  type MapStyleId,
} from "@/components/map/MapView";
import { PlaceSheet } from "@/components/map/PlaceSheet";
import { SearchPanel } from "@/components/map/SearchPanel";
import { SubmitPlaceForm } from "@/components/map/SubmitPlaceForm";
import "@/components/map/map-chrome.css";
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

function clearRecentsStorage() {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem("hp-map-recents-v1");
  }
}

export default function MapPage() {
  const places = useQuery(api.places.listPublic) as PublicPlace[] | undefined;
  const catalog = useQuery(api.catalog.list) as CatalogItem[] | undefined;
  const favouriteIds = useQuery(api.favorites.listMine);
  const me = useQuery(api.users.me);
  const toggleFavourite = useMutation(api.favorites.toggle);
  const mapRef = useRef<MapHandle>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [attributeIds, setAttributeIds] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [panel, setPanel] = useState<"closed" | "search" | "favourites">(
    "closed",
  );
  const [menuOpen, setMenuOpen] = useState(false);
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
  const [pitch3d, setPitch3d] = useState(false);
  const [styleId, setStyleId] = useState<MapStyleId>("streets");

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
        const next = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        setLocation(next);
        mapRef.current?.easeTo({ ...next, zoom: 14 });
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
    <div className="map-root relative h-dvh w-full overflow-hidden">
      <div className="absolute inset-0">
        <MapView
          ref={mapRef}
          places={visiblePins}
          selectedId={selectedId}
          styleId={styleId}
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
        onOpenMenu={() => setMenuOpen(true)}
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

      <MapControls
        pitch3d={pitch3d}
        styleId={styleId}
        onZoomIn={() => mapRef.current?.zoomIn()}
        onZoomOut={() => mapRef.current?.zoomOut()}
        onLocate={requestLocation}
        onToggle3d={() => {
          const next = !pitch3d;
          setPitch3d(next);
          mapRef.current?.setPitch3d(next);
        }}
        onStyle={setStyleId}
      />

      <MapMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        isAdmin={me?.role === "admin"}
        favouritePlaces={favouritePlaces}
        recents={recents}
        placesById={placesById}
        onOpenFavourites={() => {
          setSelectedId(null);
          setPanel("favourites");
        }}
        onSuggestPlace={() => setShowSubmit(true)}
        onOpenPlace={openPlace}
        onSearchRecent={(value) => {
          setQuery(value);
          setPanel("search");
        }}
        onClearRecents={() => {
          clearRecentsStorage();
          setRecents([]);
        }}
      />

      {showSubmit ? (
        <>
          <button
            type="button"
            aria-label="Close suggest place"
            className="absolute inset-0 z-40 bg-[rgb(20_53_40/18%)]"
            onClick={() => setShowSubmit(false)}
          />
          <div className="map-sheet absolute top-1/2 left-1/2 z-50 w-[min(24rem,calc(100%-1.5rem))] -translate-x-1/2 -translate-y-1/2 p-4">
            <SubmitPlaceForm
              categories={categories}
              attributes={attributes}
              defaultLat={location?.lat ?? addressMarker?.lat}
              defaultLng={location?.lng ?? addressMarker?.lng}
              onSubmitted={() => setShowSubmit(false)}
            />
            <button
              type="button"
              className="mt-2 w-full rounded-full px-3 py-2 text-sm text-[var(--ink-muted)] transition hover:bg-[#f3f7f3] hover:text-[var(--ink)] focus-visible:outline-2 focus-visible:outline-primary"
              onClick={() => setShowSubmit(false)}
            >
              Cancel
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
