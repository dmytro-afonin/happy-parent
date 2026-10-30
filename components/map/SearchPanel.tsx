"use client";

import { Clock, Heart, MapPin, Search, Tag } from "lucide-react";
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
  const needle = query.trim();

  return (
    <div className="absolute top-3 left-3 z-10 flex max-h-[calc(100%-1.5rem)] w-[min(400px,calc(100%-1.5rem))] flex-col overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--paper)]/95 shadow-sm backdrop-blur">
      <div className="flex flex-col gap-2.5 overflow-y-auto p-3">
        <div className="flex items-center gap-2">
          <input
            type="search"
            value={query}
            onChange={(e) => {
              onQuery(e.target.value);
              onPanel("search");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") onCommitSearch();
            }}
            placeholder="Search places, areas, addresses"
            className="min-w-0 flex-1 rounded-md border border-[var(--line)] bg-white px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <IconBtn title="Search" onClick={onCommitSearch}>
            <Search className="h-4 w-4" />
          </IconBtn>
          <IconBtn
            title="Favourites"
            active={panel === "favourites"}
            onClick={() => onPanel("favourites")}
          >
            <Heart
              className={`h-4 w-4 ${panel === "favourites" ? "fill-current" : ""}`}
            />
          </IconBtn>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {categories.map((item) => (
            <Pill
              key={item._id}
              active={categoryIds.includes(item._id)}
              onClick={() => onToggleCategory(item._id)}
            >
              {item.label}
            </Pill>
          ))}
          {attributes.map((item) => (
            <Pill
              key={item._id}
              active={attributeIds.includes(item._id)}
              onClick={() => onToggleAttribute(item._id)}
            >
              {item.label}
            </Pill>
          ))}
        </div>

        {panel === "favourites" ? (
          <Section title="Favourites">
            {favouritePlaces.length === 0 ? (
              <p className="px-1 text-sm text-[var(--ink-muted)]">
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
                {favouritePlaces.map((place) => (
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
          </>
        ) : null}

        {selectedPlace && panel === "closed" ? placeSheet : null}
      </div>
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
    <div className="flex flex-col gap-1">
      <p className="px-1 text-xs text-[var(--ink-muted)]">{title}</p>
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
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2 rounded-lg px-1 py-1.5 text-left hover:bg-[var(--accent-soft)]"
    >
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

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md px-2.5 py-1 text-xs transition ${
        active
          ? "bg-primary text-primary-foreground"
          : "bg-white text-[var(--ink)] ring-1 ring-[var(--line)]"
      }`}
    >
      {children}
    </button>
  );
}

function IconBtn({
  title,
  onClick,
  active,
  children,
}: {
  title: string;
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-md border border-[var(--line)] ${
        active ? "bg-primary text-primary-foreground" : "bg-white text-[var(--ink)]"
      }`}
    >
      {children}
    </button>
  );
}
