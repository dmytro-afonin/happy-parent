"use client";

import { useMutation } from "convex/react";
import { Crosshair, MapPin, Search } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { DrawMap, type DrawnPolygon } from "@/components/admin/DrawMap";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import type { CatalogItem } from "@/lib/catalog";
import { LANGS, LANG_LABELS, type Lang } from "@/lib/langs";
import { searchLocationIq } from "@/lib/locationiq";
import {
  searchWarsawAddresses,
  type WarsawAddress,
} from "@/lib/warsaw-addresses";

const DEFAULT_LAT = 52.2297;
const DEFAULT_LNG = 21.0122;

type GeometryMode = "point" | "area";

type Props = {
  categories: CatalogItem[];
  attributes: CatalogItem[];
  defaultLat?: number;
  defaultLng?: number;
  /** Live pin from parent map (after drop / address pick). */
  pinned?: { lat: number; lng: number; label?: string } | null;
  picking?: boolean;
  onStartPick: () => void;
  onCancelPick: () => void;
  onPinnedFromSearch: (hit: WarsawAddress) => void;
  onSubmitted?: () => void;
  onCancel?: () => void;
};

export function SubmitPlaceForm({
  categories,
  attributes,
  defaultLat,
  defaultLng,
  pinned,
  picking,
  onStartPick,
  onCancelPick,
  onPinnedFromSearch,
  onSubmitted,
  onCancel,
}: Props) {
  const submitPoint = useMutation(api.places.submitPoint);
  const submitPolygon = useMutation(api.places.submitPolygon);

  const [language, setLanguage] = useState<Lang>("pl");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [locationQuery, setLocationQuery] = useState("");
  const [locationHits, setLocationHits] = useState<WarsawAddress[]>([]);
  const [geometryMode, setGeometryMode] = useState<GeometryMode>("point");
  const [polygon, setPolygon] = useState<DrawnPolygon | null>(null);
  const [showCoords, setShowCoords] = useState(false);
  const [lat, setLat] = useState(String(defaultLat ?? DEFAULT_LAT));
  const [lng, setLng] = useState(String(defaultLng ?? DEFAULT_LNG));
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [attributeIds, setAttributeIds] = useState<string[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const needle = locationQuery.trim();
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (needle.length < 2) {
        if (!cancelled) setLocationHits([]);
        return;
      }
      const local = searchWarsawAddresses(needle, 5);
      void searchLocationIq(needle).then((remote) => {
        if (cancelled) return;
        const seen = new Set<string>();
        const merged: WarsawAddress[] = [];
        for (const hit of [...local, ...remote]) {
          const key = `${hit.label}|${hit.lat.toFixed(4)}`;
          if (seen.has(key)) continue;
          seen.add(key);
          merged.push(hit);
        }
        setLocationHits(merged.slice(0, 6));
      });
    }, needle.length < 2 ? 0 : 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [locationQuery]);

  const resolvedLat = pinned?.lat ?? Number(lat);
  const resolvedLng = pinned?.lng ?? Number(lng);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setStatus("Name is required");
      return;
    }
    if (categoryIds.length === 0) {
      setStatus("Pick at least one category");
      return;
    }

    setBusy(true);
    setStatus(null);
    try {
      if (geometryMode === "area") {
        if (!polygon) {
          setStatus("Draw an area on the map first");
          setBusy(false);
          return;
        }
        await submitPolygon({
          language,
          name: trimmedName,
          description: description || undefined,
          address: address || undefined,
          lat: polygon.lat,
          lng: polygon.lng,
          boundary: polygon.boundary,
          categoryIds: categoryIds as Id<"catalogItems">[],
          attributeIds: attributeIds as Id<"catalogItems">[],
        });
      } else {
        if (!Number.isFinite(resolvedLat) || !Number.isFinite(resolvedLng)) {
          setStatus("Pick a location first");
          setBusy(false);
          return;
        }
        await submitPoint({
          language,
          name: trimmedName,
          description: description || undefined,
          address: address || undefined,
          lat: resolvedLat,
          lng: resolvedLng,
          categoryIds: categoryIds as Id<"catalogItems">[],
          attributeIds: attributeIds as Id<"catalogItems">[],
        });
      }
      setStatus("Sent for review.");
      onSubmitted?.();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Could not submit");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex max-h-[min(80vh,40rem)] flex-col gap-3 overflow-y-auto">
      <div>
        <h2 className="text-base font-semibold text-[var(--ink)]">
          Suggest a place
        </h2>
        <p className="text-xs text-[var(--ink-muted)]">
          An admin reviews it before it appears on the map.
        </p>
      </div>

      <div className="flex gap-1 rounded-full bg-[#f3f7f3] p-1">
        <button
          type="button"
          className={`flex-1 rounded-full px-3 py-1.5 text-sm transition ${
            geometryMode === "point"
              ? "bg-white font-medium text-[var(--ink)] shadow-sm"
              : "text-[var(--ink-muted)] hover:text-[var(--ink)]"
          }`}
          onClick={() => setGeometryMode("point")}
        >
          Point
        </button>
        <button
          type="button"
          className={`flex-1 rounded-full px-3 py-1.5 text-sm transition ${
            geometryMode === "area"
              ? "bg-white font-medium text-[var(--ink)] shadow-sm"
              : "text-[var(--ink-muted)] hover:text-[var(--ink)]"
          }`}
          onClick={() => setGeometryMode("area")}
        >
          Area
        </button>
      </div>

      <input
        required
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Name"
        className="rounded-xl border border-[var(--line)] px-3 py-2 text-sm outline-none transition focus:border-primary"
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="What makes it good for families? (optional)"
        rows={2}
        className="rounded-xl border border-[var(--line)] px-3 py-2 text-sm outline-none transition focus:border-primary"
      />

      {geometryMode === "point" ? (
        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium text-[var(--ink-muted)]">
            Location
          </label>
          <div className="map-search !min-h-10 !rounded-xl !shadow-none ring-1 ring-[var(--line)]">
            <Search className="h-4 w-4 shrink-0 text-[var(--ink-muted)]" />
            <input
              type="text"
              value={locationQuery}
              onChange={(e) => setLocationQuery(e.target.value)}
              placeholder="Search an address or area"
              aria-label="Search location"
            />
          </div>
          {locationHits.length > 0 ? (
            <div className="overflow-hidden rounded-xl ring-1 ring-[var(--line)]">
              {locationHits.map((hit) => (
                <button
                  key={hit.id}
                  type="button"
                  className="map-row border-t border-[var(--line)]/60 first:border-t-0"
                  onClick={() => {
                    onPinnedFromSearch(hit);
                    setLat(String(hit.lat));
                    setLng(String(hit.lng));
                    setLocationQuery(hit.label);
                    setAddress(hit.label);
                    setLocationHits([]);
                  }}
                >
                  <MapPin className="h-4 w-4 text-[var(--ink-muted)]" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {hit.label}
                    </span>
                    <span className="block truncate text-xs text-[var(--ink-muted)]">
                      {hit.subtitle}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          ) : null}

          <button
            type="button"
            className={`ui-interactive flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm ring-1 ${
              picking
                ? "bg-primary text-primary-foreground ring-primary"
                : "bg-white text-[var(--ink)] ring-[var(--line)] hover:bg-[#f3f7f3]"
            }`}
            onClick={() => (picking ? onCancelPick() : onStartPick())}
          >
            <Crosshair className="h-4 w-4" />
            {picking ? "Tap the map… (cancel)" : "Drop a pin on the map"}
          </button>

          {Number.isFinite(resolvedLat) && Number.isFinite(resolvedLng) ? (
            <p className="text-xs text-[var(--ink-muted)]">
              Pin at {resolvedLat.toFixed(5)}, {resolvedLng.toFixed(5)}
              {pinned?.label ? ` · ${pinned.label}` : ""}
            </p>
          ) : null}

          <button
            type="button"
            className="self-start text-xs text-[var(--ink-muted)] underline-offset-2 transition hover:text-[var(--ink)] hover:underline"
            onClick={() => setShowCoords((v) => !v)}
          >
            {showCoords ? "Hide coordinates" : "Enter coordinates manually"}
          </button>
          {showCoords ? (
            <div className="grid grid-cols-2 gap-2">
              <input
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                placeholder="Latitude"
                className="rounded-xl border border-[var(--line)] px-3 py-2 text-sm"
              />
              <input
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                placeholder="Longitude"
                className="rounded-xl border border-[var(--line)] px-3 py-2 text-sm"
              />
            </div>
          ) : null}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-[var(--ink-muted)]">
            Draw the area boundary, then close the ring.
          </p>
          <DrawMap
            onPolygon={setPolygon}
            className="h-52 w-full overflow-hidden rounded-xl ring-1 ring-[var(--line)]"
          />
          <p className="text-xs text-[var(--ink-muted)]">
            {polygon
              ? `Area ready · ${polygon.lat.toFixed(5)}, ${polygon.lng.toFixed(5)}`
              : "No area yet"}
          </p>
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Address label (optional)"
            className="rounded-xl border border-[var(--line)] px-3 py-2 text-sm"
          />
        </div>
      )}

      <select
        value={language}
        onChange={(e) => setLanguage(e.target.value as Lang)}
        className="rounded-xl border border-[var(--line)] px-3 py-2 text-sm"
      >
        {LANGS.map((lang) => (
          <option key={lang} value={lang}>
            {LANG_LABELS[lang]}
          </option>
        ))}
      </select>

      <fieldset className="flex flex-wrap gap-2">
        <legend className="mb-1 w-full text-xs text-[var(--ink-muted)]">
          Categories
        </legend>
        {categories.map((item) => {
          const checked = categoryIds.includes(item._id);
          return (
            <label
              key={item._id}
              className={`ui-interactive cursor-pointer rounded-full px-2.5 py-1 text-xs ring-1 ${
                checked
                  ? "bg-primary text-primary-foreground ring-primary"
                  : "bg-white ring-[var(--line)]"
              }`}
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={checked}
                onChange={() =>
                  setCategoryIds((prev) =>
                    checked
                      ? prev.filter((id) => id !== item._id)
                      : [...prev, item._id],
                  )
                }
              />
              {item.label}
            </label>
          );
        })}
      </fieldset>

      <fieldset className="flex flex-wrap gap-2">
        <legend className="mb-1 w-full text-xs text-[var(--ink-muted)]">
          Attributes
        </legend>
        {attributes.map((item) => {
          const checked = attributeIds.includes(item._id);
          return (
            <label
              key={item._id}
              className={`ui-interactive cursor-pointer rounded-full px-2.5 py-1 text-xs ring-1 ${
                checked
                  ? "bg-[var(--accent-soft)] text-[var(--ink)] ring-primary"
                  : "bg-white ring-[var(--line)]"
              }`}
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={checked}
                onChange={() =>
                  setAttributeIds((prev) =>
                    checked
                      ? prev.filter((id) => id !== item._id)
                      : [...prev, item._id],
                  )
                }
              />
              {item.label}
            </label>
          );
        })}
      </fieldset>

      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={busy}
          className="ui-interactive flex-1 rounded-full bg-primary px-3 py-2.5 text-sm font-medium text-primary-foreground hover:brightness-110 disabled:opacity-60"
        >
          {busy ? "Sending…" : "Send for review"}
        </button>
        {onCancel ? (
          <button
            type="button"
            className="ui-interactive rounded-full px-3 py-2.5 text-sm text-[var(--ink-muted)] hover:bg-[#f3f7f3] hover:text-[var(--ink)]"
            onClick={onCancel}
          >
            Cancel
          </button>
        ) : null}
      </div>
      {status ? <p className="text-xs text-[var(--ink-muted)]">{status}</p> : null}
    </form>
  );
}
