"use client";

import { useMutation } from "convex/react";
import { useState, type FormEvent } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import type { CatalogItem } from "@/lib/catalog";
import { LANGS, LANG_LABELS, type Lang } from "@/lib/langs";

const DEFAULT_LAT = 52.2297;
const DEFAULT_LNG = 21.0122;

type Props = {
  categories: CatalogItem[];
  attributes: CatalogItem[];
  defaultLat?: number;
  defaultLng?: number;
  onSubmitted?: () => void;
};

export function SubmitPlaceForm({
  categories,
  attributes,
  defaultLat,
  defaultLng,
  onSubmitted,
}: Props) {
  const submitPoint = useMutation(api.places.submitPoint);
  const [language, setLanguage] = useState<Lang>("pl");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [lat, setLat] = useState(String(defaultLat ?? DEFAULT_LAT));
  const [lng, setLng] = useState(String(defaultLng ?? DEFAULT_LNG));
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [attributeIds, setAttributeIds] = useState<string[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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
      await submitPoint({
        language,
        name: trimmedName,
        description: description || undefined,
        address: address || undefined,
        lat: Number(lat),
        lng: Number(lng),
        categoryIds: categoryIds as Id<"catalogItems">[],
        attributeIds: attributeIds as Id<"catalogItems">[],
      });
      setName("");
      setDescription("");
      setAddress("");
      setStatus("Sent for review — an admin will publish it.");
      onSubmitted?.();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Could not submit");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold text-[var(--ink)]">Suggest a place</h2>
      <p className="text-xs text-[var(--ink-muted)]">
        Submissions go to moderation before they appear on the map.
      </p>
      <select
        value={language}
        onChange={(e) => setLanguage(e.target.value as Lang)}
        className="rounded-md border border-[var(--line)] px-3 py-2 text-sm"
      >
        {LANGS.map((lang) => (
          <option key={lang} value={lang}>
            {LANG_LABELS[lang]}
          </option>
        ))}
      </select>
      <input
        required
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Name"
        className="rounded-md border border-[var(--line)] px-3 py-2 text-sm"
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description (optional)"
        rows={2}
        className="rounded-md border border-[var(--line)] px-3 py-2 text-sm"
      />
      <input
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        placeholder="Address (optional)"
        className="rounded-md border border-[var(--line)] px-3 py-2 text-sm"
      />
      <div className="grid grid-cols-2 gap-2">
        <input
          required
          value={lat}
          onChange={(e) => setLat(e.target.value)}
          placeholder="Latitude"
          className="rounded-md border border-[var(--line)] px-3 py-2 text-sm"
        />
        <input
          required
          value={lng}
          onChange={(e) => setLng(e.target.value)}
          placeholder="Longitude"
          className="rounded-md border border-[var(--line)] px-3 py-2 text-sm"
        />
      </div>
      <fieldset className="flex flex-wrap gap-2">
        <legend className="mb-1 w-full text-xs text-[var(--ink-muted)]">
          Categories
        </legend>
        {categories.map((item) => {
          const checked = categoryIds.includes(item._id);
          return (
            <label key={item._id} className="flex items-center gap-1 text-xs">
              <input
                type="checkbox"
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
            <label key={item._id} className="flex items-center gap-1 text-xs">
              <input
                type="checkbox"
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
      <button
        type="submit"
        disabled={busy}
        className="ui-interactive rounded-full bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:brightness-110 disabled:opacity-60"
      >
        {busy ? "Sending…" : "Send for review"}
      </button>
      {status ? <p className="text-xs text-[var(--ink-muted)]">{status}</p> : null}
    </form>
  );
}
