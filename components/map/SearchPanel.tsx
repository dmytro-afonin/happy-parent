"use client";

import { SignInButton, useClerk, useUser } from "@clerk/nextjs";
import {
  Clock,
  Heart,
  MapPin,
  Menu,
  Navigation,
  Search,
  Tag,
  X,
} from "lucide-react";
import {
  formatMetricDistance,
  shortenAddress,
} from "@/lib/format-address";
import type { CatalogItem } from "@/lib/catalog";
import type { PublicPlace } from "@/lib/filter-places";
import type { Recent } from "@/lib/recents";
import type { WarsawAddress } from "@/lib/warsaw-addresses";

type Panel = "closed" | "search" | "favourites";

type Props = {
  query: string;
  onQuery: (value: string) => void;
  panel: Panel;
  onPanel: (panel: Panel) => void;
  onClear: () => void;
  onOpenMenu: () => void;
  categories: CatalogItem[];
  attributes: CatalogItem[];
  categoryIds: string[];
  attributeIds: string[];
  onToggleCategory: (id: string) => void;
  onToggleAttribute: (id: string) => void;
  placeHits: PublicPlace[];
  addressHits: WarsawAddress[];
  filterHits: CatalogItem[];
  recents: Recent[];
  favouriteIds: Set<string>;
  favouritePlaces: PublicPlace[];
  placesById: Map<string, PublicPlace>;
  recentPlaceIds: Set<string>;
  recentQueries: Set<string>;
  origin: { lat: number; lng: number } | null;
  onOpenPlace: (id: string) => void;
  onOpenAddress: (hit: WarsawAddress) => void;
  onApplyFilter: (item: CatalogItem) => void;
  onCommitSearch: () => void;
  selectedPlace: PublicPlace | null;
  addressPreview: WarsawAddress | null;
  addressNearbyPlace: PublicPlace | null;
  onCloseAddressPreview: () => void;
  placeSheet: React.ReactNode;
};

export function SearchPanel({
  query,
  onQuery,
  panel,
  onPanel,
  onClear,
  onOpenMenu,
  categories,
  attributes,
  categoryIds,
  attributeIds,
  onToggleCategory,
  onToggleAttribute,
  placeHits,
  addressHits,
  filterHits,
  recents,
  favouriteIds,
  favouritePlaces,
  placesById,
  recentPlaceIds,
  recentQueries,
  origin,
  onOpenPlace,
  onOpenAddress,
  onApplyFilter,
  onCommitSearch,
  selectedPlace,
  addressPreview,
  addressNearbyPlace,
  onCloseAddressPreview,
  placeSheet,
}: Props) {
  const { isSignedIn, user } = useUser();
  const { openUserProfile } = useClerk();
  const needle = query.trim();
  // Keep the drawer open for any search focus — including zero-hit needles —
  // so "No matches" can render instead of the panel vanishing.
  const showResults = panel === "favourites" || panel === "search";
  const sheetOpen =
    panel === "closed" && Boolean(selectedPlace || addressPreview);

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-20 p-3 sm:p-4">
      <div className="pointer-events-auto mx-auto flex w-full max-w-3xl items-center gap-2.5">
        <button
          type="button"
          title="Menu"
          aria-label="Open menu"
          className="map-fab h-11 w-11 shrink-0 rounded-full"
          onClick={onOpenMenu}
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="map-search min-w-0 flex-1">
          <Search className="h-4 w-4 shrink-0 text-[var(--ink-muted)]" />
          <input
            type="text"
            inputMode="search"
            autoComplete="off"
            spellCheck={false}
            value={query}
            onChange={(e) => {
              onQuery(e.target.value);
              onPanel("search");
            }}
            onFocus={() => onPanel("search")}
            onKeyDown={(e) => {
              if (e.key === "Enter") onCommitSearch();
            }}
            placeholder="Search places, areas, addresses"
            aria-label="Search places, areas, addresses"
          />
          {query || panel !== "closed" || selectedPlace || addressPreview ? (
            <button
              type="button"
              className="rounded-full p-1 text-[var(--ink-muted)] transition hover:bg-[#f3f7f3] hover:text-[var(--ink)] focus-visible:outline-2 focus-visible:outline-primary"
              aria-label="Clear search"
              onClick={onClear}
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        <div className="shrink-0">
          {isSignedIn && user ? (
            <button
              type="button"
              className="map-user-btn map-fab h-11 w-11 overflow-hidden rounded-full p-0"
              aria-label="Account"
              onClick={() => openUserProfile()}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={user.imageUrl}
                alt=""
                className="h-full w-full object-cover"
                referrerPolicy="no-referrer"
              />
            </button>
          ) : (
            <SignInButton mode="modal">
              <button
                type="button"
                className="map-fab h-11 rounded-full px-4 text-sm font-medium"
              >
                Sign in
              </button>
            </SignInButton>
          )}
        </div>
      </div>

      {!sheetOpen ? (
        <div className="pointer-events-auto mx-auto mt-2.5 flex w-full max-w-3xl gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {categories.map((item) => (
            <button
              key={item._id}
              type="button"
              className="map-chip shrink-0"
              data-active={categoryIds.includes(item._id)}
              onClick={() => onToggleCategory(item._id)}
            >
              {item.label}
            </button>
          ))}
          {attributes.map((item) => (
            <button
              key={item._id}
              type="button"
              className="map-chip shrink-0"
              data-active={attributeIds.includes(item._id)}
              onClick={() => onToggleAttribute(item._id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}

      {showResults ? (
        <div className="pointer-events-auto map-sheet mx-auto mt-2 max-h-[min(42vh,22rem)] w-full max-w-3xl overflow-y-auto p-1.5">
          {panel === "favourites" ? (
            <Section title="Favourites">
              {favouritePlaces.length === 0 ? (
                <p className="px-2 py-3 text-sm text-[var(--ink-muted)]">
                  No favourites yet.
                </p>
              ) : (
                favouritePlaces.map((place) => (
                  <ResultRow
                    key={place._id}
                    icon={<Heart className="h-4 w-4 fill-current" />}
                    title={place.name}
                    subtitle={shortenAddress(place.address, place.name)}
                    distance={formatMetricDistance(origin, place)}
                    badges={["favourite"]}
                    onClick={() => onOpenPlace(place._id)}
                  />
                ))
              )}
            </Section>
          ) : null}

          {panel === "search" && !needle ? (
            <>
              {recents.length > 0 ? (
                <Section title="Recent">
                  {recents.map((item) =>
                    item.kind === "search" ? (
                      <ResultRow
                        key={`s:${item.query}`}
                        icon={<Clock className="h-4 w-4" />}
                        title={item.query}
                        subtitle="Recent search"
                        badges={["recent"]}
                        onClick={() => onQuery(item.query)}
                      />
                    ) : (
                      (() => {
                        const place = placesById.get(item.placeId);
                        if (!place) return null;
                        return (
                          <ResultRow
                            key={`p:${item.placeId}`}
                            icon={<MapPin className="h-4 w-4" />}
                            title={place.name}
                            subtitle={shortenAddress(place.address, place.name)}
                            distance={formatMetricDistance(origin, place)}
                            badges={[
                              "recent",
                              ...(favouriteIds.has(place._id)
                                ? (["favourite"] as const)
                                : []),
                            ]}
                            onClick={() => onOpenPlace(place._id)}
                          />
                        );
                      })()
                    ),
                  )}
                </Section>
              ) : (
                <p className="px-2 py-3 text-sm text-[var(--ink-muted)]">
                  Recent searches and places show up here.
                </p>
              )}
              {favouritePlaces.length > 0 ? (
                <Section title="Favourites">
                  {favouritePlaces.slice(0, 4).map((place) => (
                    <ResultRow
                      key={place._id}
                      icon={<Heart className="h-4 w-4 fill-current" />}
                      title={place.name}
                      subtitle={shortenAddress(place.address, place.name)}
                      distance={formatMetricDistance(origin, place)}
                      badges={["favourite"]}
                      onClick={() => onOpenPlace(place._id)}
                    />
                  ))}
                </Section>
              ) : null}
            </>
          ) : null}

          {panel === "search" && needle ? (
            <>
              {placeHits.length > 0 ? (
                <Section title="Places">
                  {placeHits.map((place) => (
                    <ResultRow
                      key={place._id}
                      icon={<MapPin className="h-4 w-4" />}
                      title={place.name}
                      subtitle={
                        shortenAddress(place.address, place.name) ||
                        place.categories.join(" · ")
                      }
                      distance={formatMetricDistance(origin, place)}
                      badges={[
                        ...(recentPlaceIds.has(place._id)
                          ? (["recent"] as const)
                          : []),
                        ...(favouriteIds.has(place._id)
                          ? (["favourite"] as const)
                          : []),
                      ]}
                      onClick={() => onOpenPlace(place._id)}
                    />
                  ))}
                </Section>
              ) : null}
              {filterHits.length > 0 ? (
                <Section title="Categories and attributes">
                  {filterHits.map((item) => (
                    <ResultRow
                      key={item._id}
                      icon={<Tag className="h-4 w-4" />}
                      title={item.label}
                      subtitle={
                        item.kind === "category" ? "Category" : "Attribute"
                      }
                      onClick={() => onApplyFilter(item)}
                    />
                  ))}
                </Section>
              ) : null}
              {addressHits.length > 0 ? (
                <Section title="Addresses">
                  {addressHits.map((hit) => (
                    <ResultRow
                      key={hit.id}
                      icon={<Search className="h-4 w-4" />}
                      title={hit.label}
                      subtitle={shortenAddress(hit.subtitle, hit.label)}
                      distance={formatMetricDistance(origin, hit)}
                      badges={
                        recentQueries.has(hit.label.toLowerCase())
                          ? ["recent"]
                          : []
                      }
                      onClick={() => onOpenAddress(hit)}
                    />
                  ))}
                </Section>
              ) : null}
              {filterHits.length === 0 &&
              placeHits.length === 0 &&
              addressHits.length === 0 ? (
                <p className="px-2 py-3 text-sm text-[var(--ink-muted)]">
                  No matches.
                </p>
              ) : null}
            </>
          ) : null}
        </div>
      ) : null}

      {selectedPlace && panel === "closed" ? (
        <div className="pointer-events-auto map-sheet mx-auto mt-2 w-full max-w-3xl p-3">
          {placeSheet}
        </div>
      ) : null}

      {!selectedPlace && addressPreview && panel === "closed" ? (
        <div className="pointer-events-auto map-sheet mx-auto mt-2 w-full max-w-3xl p-3">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <h2 className="font-semibold text-[var(--ink)]">
                {addressPreview.label}
              </h2>
              <p className="text-xs text-[var(--ink-muted)]">
                {shortenAddress(addressPreview.subtitle, addressPreview.label)}
                {formatMetricDistance(origin, addressPreview)
                  ? ` · ${formatMetricDistance(origin, addressPreview)}`
                  : ""}
              </p>
            </div>
            <button
              type="button"
              onClick={onCloseAddressPreview}
              className="map-fab h-8 w-8 rounded-full"
              aria-label="Close address"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="flex items-center gap-2 rounded-full bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition hover:brightness-110"
              onClick={() => {
                const url = `https://www.google.com/maps/dir/?api=1&destination=${addressPreview.lat},${addressPreview.lng}`;
                window.open(url, "_blank", "noopener,noreferrer");
              }}
            >
              <Navigation className="h-4 w-4" />
              Directions
            </button>
            {addressNearbyPlace ? (
              <button
                type="button"
                className="rounded-full px-3 py-2 text-sm text-[var(--ink-muted)] ring-1 ring-[var(--line)] transition hover:bg-[#f3f7f3] hover:text-[var(--ink)]"
                onClick={() => onOpenPlace(addressNearbyPlace._id)}
              >
                View {addressNearbyPlace.name}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5 py-1">
      <p className="px-2 pb-1 text-xs font-medium text-[var(--ink-muted)]">
        {title}
      </p>
      {children}
    </div>
  );
}

function ResultRow({
  icon,
  title,
  subtitle,
  distance,
  badges,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  distance?: string | null;
  badges?: Array<"recent" | "favourite">;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className="map-row">
      <span className="text-[var(--ink-muted)]">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="block truncate text-sm font-semibold text-[var(--ink)]">
            {title}
          </span>
          {badges?.includes("favourite") ? (
            <Heart
              className="h-3 w-3 shrink-0 fill-current text-primary"
              aria-label="Favourite"
            />
          ) : null}
          {badges?.includes("recent") ? (
            <Clock
              className="h-3 w-3 shrink-0 text-[var(--ink-muted)]"
              aria-label="Recent"
            />
          ) : null}
        </span>
        {subtitle ? (
          <span className="block truncate text-xs text-[var(--ink-muted)]">
            {subtitle}
          </span>
        ) : null}
      </span>
      {distance ? (
        <span className="shrink-0 text-xs tabular-nums text-[var(--ink-muted)]">
          {distance}
        </span>
      ) : null}
    </button>
  );
}
