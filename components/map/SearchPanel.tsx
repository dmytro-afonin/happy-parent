"use client";

import { SignInButton, UserButton, useAuth } from "@clerk/nextjs";
import { Clock, Heart, MapPin, Menu, Search, Tag, X } from "lucide-react";
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
  favouritePlaces: PublicPlace[];
  placesById: Map<string, PublicPlace>;
  onOpenPlace: (id: string) => void;
  onOpenAddress: (hit: WarsawAddress) => void;
  onApplyFilter: (item: CatalogItem) => void;
  onCommitSearch: () => void;
  selectedPlace: PublicPlace | null;
  placeSheet: React.ReactNode;
};

export function SearchPanel({
  query,
  onQuery,
  panel,
  onPanel,
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
  favouritePlaces,
  placesById,
  onOpenPlace,
  onOpenAddress,
  onApplyFilter,
  onCommitSearch,
  selectedPlace,
  placeSheet,
}: Props) {
  const { isSignedIn } = useAuth();
  const needle = query.trim();
  const showResults =
    panel === "favourites" ||
    (panel === "search" && (!!needle || recents.length > 0 || favouritePlaces.length > 0));

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
          {query || panel !== "closed" ? (
            <button
              type="button"
              className="rounded-full p-1 text-[var(--ink-muted)] transition hover:bg-[#f3f7f3] hover:text-[var(--ink)] focus-visible:outline-2 focus-visible:outline-primary"
              aria-label="Clear search"
              onClick={() => {
                onQuery("");
                onPanel("closed");
              }}
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        <div className="shrink-0">
          {isSignedIn ? (
            <div className="map-user-btn map-fab h-11 w-11 overflow-hidden rounded-full p-0">
              <UserButton
                appearance={{
                  elements: {
                    rootBox: "h-11 w-11",
                    userButtonBox: "h-11 w-11",
                    userButtonTrigger:
                      "h-11 w-11 rounded-full p-0 focus:shadow-none focus:ring-2 focus:ring-[var(--primary)]",
                    userButtonAvatarBox: "h-11 w-11",
                    userButtonAvatarImage: "h-11 w-11",
                  },
                }}
              />
            </div>
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

      {showResults ? (
        <div className="pointer-events-auto map-sheet mx-auto mt-2 max-h-[min(52vh,28rem)] w-full max-w-3xl overflow-y-auto p-2">
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
                    subtitle={place.address}
                    onClick={() => onOpenPlace(place._id)}
                  />
                ))
              )}
            </Section>
          ) : null}

          {panel === "search" && !needle ? (
            <>
              {favouritePlaces.length > 0 ? (
                <Section title="Favourites">
                  {favouritePlaces.slice(0, 4).map((place) => (
                    <ResultRow
                      key={place._id}
                      icon={<Heart className="h-4 w-4 fill-current" />}
                      title={place.name}
                      subtitle={place.address}
                      onClick={() => onOpenPlace(place._id)}
                    />
                  ))}
                </Section>
              ) : null}
              {recents.length > 0 ? (
                <Section title="Recent">
                  {recents.map((item) =>
                    item.kind === "search" ? (
                      <ResultRow
                        key={`s:${item.query}`}
                        icon={<Clock className="h-4 w-4" />}
                        title={item.query}
                        subtitle="Recent search"
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
                            subtitle="Opened recently"
                            onClick={() => onOpenPlace(place._id)}
                          />
                        );
                      })()
                    ),
                  )}
                </Section>
              ) : null}
            </>
          ) : null}

          {panel === "search" && needle ? (
            <>
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
              {placeHits.length > 0 ? (
                <Section title="Places">
                  {placeHits.map((place) => (
                    <ResultRow
                      key={place._id}
                      icon={<MapPin className="h-4 w-4" />}
                      title={place.name}
                      subtitle={`${place.categories.join(", ")} · ${place.address}`}
                      onClick={() => onOpenPlace(place._id)}
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
                      subtitle={hit.subtitle}
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
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className="map-row">
      <span className="text-[var(--ink-muted)]">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-[var(--ink)]">
          {title}
        </span>
        <span className="block truncate text-xs text-[var(--ink-muted)]">
          {subtitle}
        </span>
      </span>
    </button>
  );
}
