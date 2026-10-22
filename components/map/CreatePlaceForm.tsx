"use client";

import { useMutation } from "convex/react";
import { useState, type FormEvent } from "react";
import { api } from "@/convex/_generated/api";
import {
  PLACE_ATTRIBUTES,
  PLACE_ATTRIBUTE_LABELS,
  PLACE_TYPES,
  PLACE_TYPE_LABELS,
  type PlaceAttribute,
  type PlaceType,
} from "@/lib/catalog";

const DEFAULT_LAT = 52.2297;
const DEFAULT_LNG = 21.0122;

export function CreatePlaceForm() {
  const createPoint = useMutation(api.places.createPoint);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [lat, setLat] = useState(String(DEFAULT_LAT));
  const [lng, setLng] = useState(String(DEFAULT_LNG));
  const [type, setType] = useState<PlaceType>("playground");
  const [attributes, setAttributes] = useState<PlaceAttribute[]>(["free"]);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setStatus(null);
    try {
      await createPoint({
        name,
        description: description || undefined,
        address: address || undefined,
        lat: Number(lat),
        lng: Number(lng),
        type,
        attributes,
      });
      setName("");
      setDescription("");
      setAddress("");
      setStatus("Saved — it should appear on the map.");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-3 border-t border-[var(--line)] bg-[var(--panel)] p-3"
    >
      <h2 className="text-sm font-semibold tracking-wide text-[var(--ink)]">
        Add a point place
      </h2>
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
      <select
        value={type}
        onChange={(e) => setType(e.target.value as PlaceType)}
        className="rounded-md border border-[var(--line)] px-3 py-2 text-sm"
      >
        {PLACE_TYPES.map((t) => (
          <option key={t} value={t}>
            {PLACE_TYPE_LABELS[t]}
          </option>
        ))}
      </select>
      <div className="flex flex-wrap gap-2">
        {PLACE_ATTRIBUTES.map((attr) => {
          const checked = attributes.includes(attr);
          return (
            <label
              key={attr}
              className="flex items-center gap-1.5 text-xs text-[var(--ink)]"
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() =>
                  setAttributes((prev) =>
                    checked
                      ? prev.filter((a) => a !== attr)
                      : [...prev, attr],
                  )
                }
              />
              {PLACE_ATTRIBUTE_LABELS[attr]}
            </label>
          );
        })}
      </div>
      <button
        type="submit"
        disabled={busy}
        className="rounded-md bg-[var(--accent)] px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {busy ? "Saving…" : "Save place"}
      </button>
      {status ? (
        <p className="text-sm text-[var(--ink-muted)]">{status}</p>
      ) : null}
    </form>
  );
}
