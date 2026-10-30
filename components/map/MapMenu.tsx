"use client";

import {
  ChevronDown,
  Clock,
  Heart,
  MapPin,
  Plus,
  Shield,
  X,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import type { PublicPlace } from "@/lib/filter-places";
import type { Recent } from "@/lib/recents";

type Props = {
  open: boolean;
  onClose: () => void;
  isAdmin: boolean;
  favouritePlaces: PublicPlace[];
  recents: Recent[];
  placesById: Map<string, PublicPlace>;
  onOpenPlace: (id: string) => void;
  onSearchRecent: (query: string) => void;
  onClearRecents: () => void;
  onSuggestPlace: () => void;
};

export function MapMenu({
  open,
  onClose,
  isAdmin,
  favouritePlaces,
  recents,
  placesById,
  onOpenPlace,
  onSearchRecent,
  onClearRecents,
  onSuggestPlace,
}: Props) {
  const [favOpen, setFavOpen] = useState(false);
  const [recentsOpen, setRecentsOpen] = useState(false);

  if (!open) return null;

  return (
    <>
      <button
        type="button"
        aria-label="Close menu"
        className="absolute inset-0 z-30 bg-[rgb(20_53_40/18%)] backdrop-blur-[1px] transition"
        onClick={onClose}
      />
      <aside className="absolute top-3 left-3 z-40 flex max-h-[calc(100%-1.5rem)] w-[min(20rem,calc(100%-1.5rem))] flex-col overflow-hidden map-sheet animate-[fade-up_0.2s_ease_both]">
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <div>
            <p className="font-[family-name:var(--font-display)] text-xl text-[var(--ink)]">
              Happy Parent
            </p>
            <p className="text-xs text-[var(--ink-muted)]">Warsaw family map</p>
          </div>
          <button
            type="button"
            className="map-fab h-9 w-9 rounded-full"
            aria-label="Close menu"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-2 pb-2">
          <button
            type="button"
            className="map-menu-item"
            aria-expanded={favOpen}
            onClick={() => setFavOpen((v) => !v)}
          >
            <Heart className="h-4 w-4 text-[var(--ink-muted)]" />
            Favourites
            {favouritePlaces.length > 0 ? (
              <span className="ml-auto mr-1 text-xs text-[var(--ink-muted)]">
                {favouritePlaces.length}
              </span>
            ) : (
              <span className="ml-auto" />
            )}
            <ChevronDown
              className={`h-4 w-4 text-[var(--ink-muted)] transition ${
                favOpen ? "rotate-180" : ""
              }`}
            />
          </button>
          {favOpen ? (
            <div className="mb-1 ml-2 border-l border-[var(--line)]/70 pl-2">
              {favouritePlaces.length === 0 ? (
                <p className="px-2 py-2 text-sm text-[var(--ink-muted)]">
                  Saved places appear here.
                </p>
              ) : (
                favouritePlaces.map((place) => (
                  <button
                    key={place._id}
                    type="button"
                    className="map-menu-item"
                    onClick={() => {
                      onOpenPlace(place._id);
                      onClose();
                    }}
                  >
                    <MapPin className="h-4 w-4 text-[var(--ink-muted)]" />
                    <span className="truncate">{place.name}</span>
                  </button>
                ))
              )}
            </div>
          ) : null}

          <button
            type="button"
            className="map-menu-item"
            aria-expanded={recentsOpen}
            onClick={() => setRecentsOpen((v) => !v)}
          >
            <Clock className="h-4 w-4 text-[var(--ink-muted)]" />
            Recents
            {recents.length > 0 ? (
              <span className="ml-auto mr-1 text-xs text-[var(--ink-muted)]">
                {recents.length}
              </span>
            ) : (
              <span className="ml-auto" />
            )}
            <ChevronDown
              className={`h-4 w-4 text-[var(--ink-muted)] transition ${
                recentsOpen ? "rotate-180" : ""
              }`}
            />
          </button>
          {recentsOpen ? (
            <div className="mb-1 ml-2 border-l border-[var(--line)]/70 pl-2">
              {recents.length > 0 ? (
                <button
                  type="button"
                  className="mb-0.5 px-2 py-1 text-xs text-[var(--ink-muted)] transition hover:text-[var(--ink)]"
                  onClick={onClearRecents}
                >
                  Clear all
                </button>
              ) : null}
              {recents.length === 0 ? (
                <p className="px-2 py-2 text-sm text-[var(--ink-muted)]">
                  Recent searches and places show up here.
                </p>
              ) : (
                recents.map((item) =>
                  item.kind === "search" ? (
                    <button
                      key={`s:${item.query}`}
                      type="button"
                      className="map-menu-item"
                      onClick={() => {
                        onSearchRecent(item.query);
                        onClose();
                      }}
                    >
                      <Clock className="h-4 w-4 text-[var(--ink-muted)]" />
                      <span className="truncate">{item.query}</span>
                    </button>
                  ) : (
                    (() => {
                      const place = placesById.get(item.placeId);
                      if (!place) return null;
                      return (
                        <button
                          key={`p:${item.placeId}`}
                          type="button"
                          className="map-menu-item"
                          onClick={() => {
                            onOpenPlace(place._id);
                            onClose();
                          }}
                        >
                          <MapPin className="h-4 w-4 text-[var(--ink-muted)]" />
                          <span className="truncate">{place.name}</span>
                        </button>
                      );
                    })()
                  ),
                )
              )}
            </div>
          ) : null}

          {isAdmin ? (
            <Link href="/admin" className="map-menu-item" onClick={onClose}>
              <Shield className="h-4 w-4 text-[var(--ink-muted)]" />
              Admin
            </Link>
          ) : null}
        </nav>

        <div className="border-t border-[var(--line)]/60 px-2 py-2">
          <button
            type="button"
            className="flex w-full items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs text-[var(--ink-muted)] transition hover:bg-[#f3f7f3] hover:text-[var(--ink)] focus-visible:outline-2 focus-visible:outline-primary"
            onClick={() => {
              onSuggestPlace();
              onClose();
            }}
          >
            <Plus className="h-3.5 w-3.5" />
            Suggest a place
          </button>
        </div>
      </aside>
    </>
  );
}
