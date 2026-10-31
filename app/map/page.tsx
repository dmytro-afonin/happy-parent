"use client";

import { useAuth } from "@clerk/nextjs";
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
import {
  filterPlaces,
  haversineMeters,
  type PublicPlace,
} from "@/lib/filter-places";
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
  const { isSignedIn } = useAuth();
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
  const [flyTarget, setFlyTarget] = useState<{
    lat: number;
    lng: number;
    zoom?: number;
  } | null>(null);
  const [liqHits, setLiqHits] = useState<WarsawAddress[]>([]);
  const [showSubmit, setShowSubmit] = useState(false);
  const [pickMode, setPickMode] = useState(false);
  const [submitPin, setSubmitPin] = useState<{
    lat: number;
    lng: number;
    label?: string;
  } | null>(null);
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

  const favouriteIdSet = useMemo(() => {
    const ids = new Set<string>();
    for (const id of favouriteIds ?? []) ids.add(id);
    return ids;
  }, [favouriteIds]);

  const recentPlaceIds = useMemo(() => {
    const ids = new Set<string>();
    for (const item of recents) {
      if (item.kind === "place") ids.add(item.placeId);
    }
    return ids;
  }, [recents]);

  const recentQueries = useMemo(() => {
    const qs = new Set<string>();
    for (const item of recents) {
      if (item.kind === "search") qs.add(item.query.toLowerCase());
    }
    return qs;
  }, [recents]);

  const selected = selectedId ? (placesById.get(selectedId) ?? null) : null;
  const needle = query.trim().toLowerCase();
  // Only show distances once the user has shared a real location — Warsaw
  // center as a fake origin reads as noise.
  const origin = location;

  const placeHits = useMemo(() => {
    if (!needle || !places) return [];
    return places
      .filter((place) =>
        `${place.name} ${place.description} ${place.address} ${place.categories.join(" ")} ${place.attributes.join(" ")}`
          .toLowerCase()
          .includes(needle),
      )
      .slice(0, 8);
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

  /** Soft suggestion only — never auto-open when picking an address. */
  const addressNearbyPlace = useMemo(() => {
    if (!addressMarker || !places) return null;
    let best: PublicPlace | null = null;
    let bestDist = 75;
    for (const place of places) {
      const d = haversineMeters(addressMarker, place);
      if (d < bestDist) {
        best = place;
        bestDist = d;
      }
    }
    return best;
  }, [addressMarker, places]);

  function openPlace(id: string) {
    const place = placesById.get(id);
    if (!place) return;
    setSelectedId(id);
    setAddressMarker(null);
    setFlyTarget(null);
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
    // Always open the address preview — never silently swap to a nearby
    // curated place (district/street hits were landing on unrelated pins).
    setAddressMarker(hit);
    setSelectedId(null);
    setQuery(hit.label);
    setPanel("closed");
    setFlyTarget({ lat: hit.lat, lng: hit.lng, zoom: 15 });
    setRecents((prev) =>
      rememberRecent(prev, {
        kind: "search",
        query: hit.label,
        at: Date.now(),
      }),
    );
  }

  function clearSearchChrome() {
    setQuery("");
    setPanel("closed");
    setSelectedId(null);
    setAddressMarker(null);
    setFlyTarget(null);
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
    if (!selectedId || !isSignedIn) return;
    await toggleFavourite({ placeId: selectedId as Id<"places"> });
  }

  function openSuggest() {
    if (!isSignedIn) return;
    setShowSubmit(true);
    setPickMode(false);
  }

  return (
    <div className="map-root relative h-dvh w-full overflow-hidden">
      <div className="absolute inset-0">
        <MapView
          ref={mapRef}
          places={visiblePins}
          selectedId={selectedId}
          styleId={styleId}
          pickMode={pickMode}
          onSelect={(id) => {
            if (pickMode) return;
            if (id) openPlace(id);
            else {
              setSelectedId(null);
              setAddressMarker(null);
              setPanel("closed");
            }
          }}
          onMapClick={(coords) => {
            if (!pickMode) return;
            setSubmitPin(coords);
            setPickMode(false);
            setShowSubmit(true);
            mapRef.current?.easeTo({ ...coords, zoom: 15 });
          }}
          userLocation={location}
          addressMarker={
            submitPin
              ? {
                  id: "submit-pin",
                  label: submitPin.label ?? "New place",
                  lat: submitPin.lat,
                  lng: submitPin.lng,
                }
              : addressMarker
          }
          flyTo={flyTarget}
        />
      </div>

      {pickMode ? (
        <div className="pointer-events-none absolute inset-x-0 top-[4.75rem] z-30 flex justify-center px-3">
          <p className="map-sheet pointer-events-none rounded-full px-4 py-2 text-sm text-[var(--ink)]">
            Tap the map to drop a pin
          </p>
        </div>
      ) : null}

      <SearchPanel
        query={query}
        onQuery={setQuery}
        panel={panel}
        onPanel={(next) => {
          setPanel(next);
          if (next === "favourites") setSelectedId(null);
        }}
        onClear={clearSearchChrome}
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
        favouriteIds={favouriteIdSet}
        favouritePlaces={favouritePlaces}
        placesById={placesById}
        recentPlaceIds={recentPlaceIds}
        recentQueries={recentQueries}
        origin={origin}
        onOpenPlace={openPlace}
        onOpenAddress={openAddress}
        onApplyFilter={applyFilter}
        onCommitSearch={commitSearch}
        selectedPlace={selected}
        addressPreview={addressMarker}
        addressNearbyPlace={addressNearbyPlace}
        onCloseAddressPreview={() => {
          setAddressMarker(null);
          setFlyTarget(null);
        }}
        placeSheet={
          selected ? (
            <PlaceSheet
              key={selected._id}
              place={selected}
              saved={favouriteIdSet.has(selected._id)}
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
        isSignedIn={Boolean(isSignedIn)}
        favouritePlaces={favouritePlaces}
        recents={recents}
        placesById={placesById}
        onSuggestPlace={openSuggest}
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
          {!pickMode ? (
            <button
              type="button"
              aria-label="Close suggest place"
              className="absolute inset-0 z-40 bg-[rgb(20_53_40/18%)]"
              onClick={() => {
                setShowSubmit(false);
                setSubmitPin(null);
                setPickMode(false);
              }}
            />
          ) : null}
          <div
            className={`map-sheet absolute top-[max(0.75rem,env(safe-area-inset-top))] left-1/2 z-50 w-[min(26rem,calc(100%-1.5rem))] -translate-x-1/2 p-4 sm:top-1/2 sm:-translate-y-1/2 ${
              pickMode ? "hidden" : ""
            }`}
          >
            <SubmitPlaceForm
              categories={categories}
              attributes={attributes}
              defaultLat={
                submitPin?.lat ?? location?.lat ?? addressMarker?.lat
              }
              defaultLng={
                submitPin?.lng ?? location?.lng ?? addressMarker?.lng
              }
              pinned={submitPin}
              picking={pickMode}
              onStartPick={() => {
                setPickMode(true);
              }}
              onCancelPick={() => setPickMode(false)}
              onPinnedFromSearch={(hit) => {
                setSubmitPin({
                  lat: hit.lat,
                  lng: hit.lng,
                  label: hit.label,
                });
                mapRef.current?.easeTo({
                  lat: hit.lat,
                  lng: hit.lng,
                  zoom: 15,
                });
              }}
              onSubmitted={() => {
                setShowSubmit(false);
                setSubmitPin(null);
                setPickMode(false);
              }}
              onCancel={() => {
                setShowSubmit(false);
                setSubmitPin(null);
                setPickMode(false);
              }}
            />
          </div>
        </>
      ) : null}

      {pickMode ? (
        <button
          type="button"
          className="map-fab absolute bottom-24 left-1/2 z-40 -translate-x-1/2 rounded-full px-4 py-2 text-sm"
          onClick={() => {
            setPickMode(false);
          }}
        >
          Cancel pin
        </button>
      ) : null}
    </div>
  );
}
