"use client";

import {
  Authenticated,
  AuthLoading,
  Unauthenticated,
  useQuery,
} from "convex/react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { SignInButton } from "@clerk/nextjs";
import { CreatePlaceForm } from "@/components/map/CreatePlaceForm";
import { MapView } from "@/components/map/MapView";
import { PlaceFiltersBar } from "@/components/map/PlaceFilters";
import { api } from "@/convex/_generated/api";
import type { PlaceAttribute, PlaceGroup, PlaceType } from "@/lib/catalog";
import { filterPlaces, type ApprovedPlace } from "@/lib/filter-places";

export default function MapPage() {
  const places = useQuery(api.places.listApproved) as
    | ApprovedPlace[]
    | undefined;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [groups, setGroups] = useState<PlaceGroup[]>([]);
  const [types, setTypes] = useState<PlaceType[]>([]);
  const [attributes, setAttributes] = useState<PlaceAttribute[]>([]);
  const [text, setText] = useState("");
  const [location, setLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  const filtered = useMemo(() => {
    if (!places) return [];
    return filterPlaces(places, { groups, types, attributes, text, location });
  }, [places, groups, types, attributes, text, location]);

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

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col lg:flex-row">
      <aside className="flex max-h-[50vh] w-full flex-col overflow-y-auto border-b border-[var(--line)] bg-[var(--paper)] lg:max-h-none lg:w-[380px] lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between gap-2 px-3 pt-3">
          <h1 className="font-[family-name:var(--font-display)] text-xl text-[var(--ink)]">
            Map
          </h1>
          <button
            type="button"
            onClick={requestLocation}
            className="text-xs text-[var(--accent)] underline-offset-2 hover:underline"
          >
            {location ? "Sorted by distance" : "Use my location"}
          </button>
        </div>

        <PlaceFiltersBar
          groups={groups}
          types={types}
          attributes={attributes}
          text={text}
          onGroups={setGroups}
          onTypes={setTypes}
          onAttributes={setAttributes}
          onText={setText}
        />

        <ul className="flex-1 divide-y divide-[var(--line)] overflow-y-auto">
          {places === undefined ? (
            <li className="p-3 text-sm text-[var(--ink-muted)]">Loading places…</li>
          ) : filtered.length === 0 ? (
            <li className="p-3 text-sm text-[var(--ink-muted)]">No places match.</li>
          ) : (
            filtered.map((place) => {
              const selected = place._id === selectedId;
              return (
                <li key={place._id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(place._id)}
                    className={`flex w-full flex-col items-start gap-0.5 px-3 py-2.5 text-left transition ${
                      selected ? "bg-[var(--accent-soft)]" : "hover:bg-white/70"
                    }`}
                  >
                    <span className="font-medium text-[var(--ink)]">
                      {place.name}
                    </span>
                    <span className="text-xs capitalize text-[var(--ink-muted)]">
                      {place.type}
                      {place.address ? ` · ${place.address}` : ""}
                    </span>
                  </button>
                </li>
              );
            })
          )}
        </ul>

        <AuthLoading>
          <p className="border-t border-[var(--line)] p-3 text-sm text-[var(--ink-muted)]">
            Checking session…
          </p>
        </AuthLoading>
        <Unauthenticated>
          <div className="border-t border-[var(--line)] p-3 text-sm text-[var(--ink-muted)]">
            <SignInButton mode="modal">
              <button
                type="button"
                className="text-[var(--accent)] underline-offset-2 hover:underline"
              >
                Sign in
              </button>
            </SignInButton>{" "}
            to add a place.
          </div>
        </Unauthenticated>
        <Authenticated>
          <CreatePlaceForm />
        </Authenticated>
      </aside>

      <section className="relative min-h-[50vh] flex-1 overflow-hidden lg:min-h-[calc(100vh-3.5rem)]">
        <div className="absolute inset-0">
          <MapView
            places={filtered}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        </div>
        <Link
          href="/admin"
          className="absolute bottom-4 left-4 z-10 rounded-md bg-white/95 px-3 py-1.5 text-xs font-medium text-[var(--ink)] shadow ring-1 ring-[var(--line)]"
        >
          Admin draw
        </Link>
      </section>
    </div>
  );
}
