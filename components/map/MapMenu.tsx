"use client";

import { SignInButton, UserButton, useAuth } from "@clerk/nextjs";
import {
  Clock,
  Heart,
  MapPin,
  Plus,
  Settings,
  Shield,
  X,
} from "lucide-react";
import Link from "next/link";
import type { PublicPlace } from "@/lib/filter-places";
import type { Recent } from "@/lib/recents";

type Props = {
  open: boolean;
  onClose: () => void;
  isAdmin: boolean;
  favouritePlaces: PublicPlace[];
  recents: Recent[];
  placesById: Map<string, PublicPlace>;
  onOpenFavourites: () => void;
  onSuggestPlace: () => void;
  onOpenPlace: (id: string) => void;
  onSearchRecent: (query: string) => void;
  onClearRecents: () => void;
};

export function MapMenu({
  open,
  onClose,
  isAdmin,
  favouritePlaces,
  recents,
  placesById,
  onOpenFavourites,
  onSuggestPlace,
  onOpenPlace,
  onSearchRecent,
  onClearRecents,
}: Props) {
  const { isSignedIn } = useAuth();
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

        <nav className="flex flex-col gap-0.5 px-2 pb-2">
          <button
            type="button"
            className="map-menu-item"
            onClick={() => {
              onOpenFavourites();
              onClose();
            }}
          >
            <Heart className="h-4 w-4 text-[var(--ink-muted)]" />
            Favourites
            {favouritePlaces.length > 0 ? (
              <span className="ml-auto text-xs text-[var(--ink-muted)]">
                {favouritePlaces.length}
              </span>
            ) : null}
          </button>
          <button
            type="button"
            className="map-menu-item"
            onClick={() => {
              onSuggestPlace();
              onClose();
            }}
          >
            <Plus className="h-4 w-4 text-[var(--ink-muted)]" />
            Suggest a place
          </button>
          {isAdmin ? (
            <Link href="/admin" className="map-menu-item" onClick={onClose}>
              <Shield className="h-4 w-4 text-[var(--ink-muted)]" />
              Admin
            </Link>
          ) : null}
        </nav>

        <div className="mx-3 h-px bg-[var(--line)]/70" />

        <div className="flex items-center gap-2 px-4 pt-3 pb-1 text-xs font-semibold tracking-wide text-[var(--ink-muted)] uppercase">
          <Settings className="h-3.5 w-3.5" />
          Settings
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
          <div className="flex items-center justify-between px-2 pt-1 pb-1">
            <p className="text-xs font-medium text-[var(--ink-muted)]">
              Recents
            </p>
            {recents.length > 0 ? (
              <button
                type="button"
                className="rounded-md px-2 py-1 text-xs text-[var(--ink-muted)] transition hover:bg-[#f3f7f3] hover:text-[var(--ink)] focus-visible:outline-2 focus-visible:outline-primary"
                onClick={onClearRecents}
              >
                Clear
              </button>
            ) : null}
          </div>
          {recents.length === 0 ? (
            <p className="px-3 py-2 text-sm text-[var(--ink-muted)]">
              Searches and places you open show up here.
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

        <div className="flex items-center justify-between border-t border-[var(--line)]/70 px-4 py-3">
          {isSignedIn ? (
            <div className="flex items-center gap-2">
              <UserButton />
              <span className="text-sm text-[var(--ink-muted)]">Account</span>
            </div>
          ) : (
            <SignInButton mode="modal">
              <button
                type="button"
                className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:brightness-110 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                Sign in
              </button>
            </SignInButton>
          )}
        </div>
      </aside>
    </>
  );
}
