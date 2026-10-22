"use client";

import { useConvexAuth, useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import {
  DrawMap,
  type DrawnPolygon,
} from "@/components/admin/DrawMap";
import { api } from "@/convex/_generated/api";
import {
  PLACE_ATTRIBUTES,
  PLACE_ATTRIBUTE_LABELS,
  PLACE_TYPES,
  PLACE_TYPE_LABELS,
  type PlaceAttribute,
  type PlaceType,
} from "@/lib/catalog";

export default function AdminPage() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const me = useQuery(api.users.me);
  const createPolygon = useMutation(api.places.createPolygon);

  const [polygon, setPolygon] = useState<DrawnPolygon | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [type, setType] = useState<PlaceType>("park");
  const [attributes, setAttributes] = useState<PlaceAttribute[]>([
    "free",
    "shade",
  ]);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSave(e: FormEvent) {
    e.preventDefault();
    if (!polygon) {
      setStatus("Draw a polygon on the map first.");
      return;
    }
    setBusy(true);
    setStatus(null);
    try {
      await createPolygon({
        name,
        description: description || undefined,
        address: address || undefined,
        lat: polygon.lat,
        lng: polygon.lng,
        boundary: polygon.boundary,
        type,
        attributes,
      });
      setName("");
      setDescription("");
      setAddress("");
      setStatus("Polygon saved. Open /map to see it.");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  if (isLoading || me === undefined) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10 text-[var(--ink-muted)]">
        Loading…
      </main>
    );
  }

  if (!isAuthenticated) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <p className="text-[var(--ink)]">Sign in required for admin.</p>
        <Link href="/sign-in" className="text-[var(--accent)] underline">
          Sign in
        </Link>
      </main>
    );
  }

  if (me?.role !== "admin") {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="font-[family-name:var(--font-display)] text-2xl text-[var(--ink)]">
          Admin
        </h1>
        <p className="mt-3 text-[var(--ink-muted)]">
          Your Convex role is <code className="text-[var(--ink)]">{me?.role ?? "unknown"}</code>.
          An admin must promote your user before you can draw areas.
        </p>
        <Link href="/map" className="mt-4 inline-block text-[var(--accent)] underline">
          Back to map
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl text-[var(--ink)]">
            Admin draw
          </h1>
          <p className="mt-1 text-sm text-[var(--ink-muted)]">
            Draw a park or area boundary with Terra Draw. The public map renders
            it without loading Terra Draw.
          </p>
        </div>
        <Link href="/map" className="text-sm text-[var(--accent)] underline">
          Public map
        </Link>
      </div>

      <DrawMap onPolygon={setPolygon} />

      <form
        onSubmit={onSave}
        className="grid gap-3 rounded-none border border-[var(--line)] bg-[var(--panel)] p-4 md:grid-cols-2"
      >
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name"
          className="rounded-md border border-[var(--line)] px-3 py-2 text-sm md:col-span-2"
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description (optional)"
          rows={2}
          className="rounded-md border border-[var(--line)] px-3 py-2 text-sm md:col-span-2"
        />
        <input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Address (optional)"
          className="rounded-md border border-[var(--line)] px-3 py-2 text-sm md:col-span-2"
        />
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
        <div className="flex flex-wrap gap-2 self-center">
          {PLACE_ATTRIBUTES.map((attr) => {
            const checked = attributes.includes(attr);
            return (
              <label key={attr} className="flex items-center gap-1 text-xs">
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
        <p className="text-xs text-[var(--ink-muted)] md:col-span-2">
          {polygon
            ? `Boundary ready · centroid ${polygon.lat.toFixed(5)}, ${polygon.lng.toFixed(5)}`
            : "No polygon yet — click the map and close the ring."}
        </p>
        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white disabled:opacity-60 md:col-span-2 md:w-fit"
        >
          {busy ? "Saving…" : "Save area"}
        </button>
        {status ? (
          <p className="text-sm text-[var(--ink-muted)] md:col-span-2">{status}</p>
        ) : null}
      </form>
    </main>
  );
}
