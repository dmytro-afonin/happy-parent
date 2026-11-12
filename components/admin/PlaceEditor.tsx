"use client";

import { useMutation } from "convex/react";
import { useMemo, useState } from "react";
import { DrawMap, type DrawnPolygon } from "@/components/admin/DrawMap";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import type { CatalogItem } from "@/lib/catalog";
import { LANGS, LANG_LABELS, type Lang } from "@/lib/langs";
import { emptyPlaceCopy, type PlaceCopy } from "@/lib/copy";

export type AdminQueueItem = {
  _id: Id<"moderationQueue">;
  kind: "place" | "edit" | "translation" | "photo" | "comment";
  detail: string;
  body?: string;
  language?: Lang;
  who: string;
  photoId?: Id<"photos">;
  photoUrl?: string | null;
  commentId?: Id<"comments">;
  field?: "name" | "description" | "address";
};

export type AdminPlaceDraft = {
  _id?: Id<"places">;
  copy: PlaceCopy;
  categoryIds: Id<"catalogItems">[];
  attributeIds: Id<"catalogItems">[];
  publishStatus: "public" | "draft";
  lat: number;
  lng: number;
  geometryType: "point" | "polygon";
  boundary?: Array<{ lat: number; lng: number }>;
  name: string;
  queue: AdminQueueItem[];
};

type Props = {
  draft: AdminPlaceDraft;
  catalog: CatalogItem[];
  focusKind: AdminQueueItem["kind"] | "all";
  onBack: () => void;
  onSaved: () => void;
};

export function PlaceEditor({
  draft: initial,
  catalog,
  focusKind,
  onBack,
  onSaved,
}: Props) {
  const save = useMutation(api.places.adminSave);
  const approve = useMutation(api.moderation.approve);
  const reject = useMutation(api.moderation.reject);

  const [copy, setCopy] = useState<PlaceCopy>(() => ({
    ...emptyPlaceCopy(),
    ...initial.copy,
  }));
  const [locale, setLocale] = useState<Lang>(
    initial.queue.find((item) => item.language)?.language ?? "pl",
  );
  const [categoryIds, setCategoryIds] = useState(initial.categoryIds);
  const [attributeIds, setAttributeIds] = useState(initial.attributeIds);
  const [publishStatus, setPublishStatus] = useState(initial.publishStatus);
  const [geometryType, setGeometryType] = useState(initial.geometryType);
  const [lat, setLat] = useState(initial.lat);
  const [lng, setLng] = useState(initial.lng);
  const [boundary, setBoundary] = useState(initial.boundary);
  const [queue, setQueue] = useState(initial.queue);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const categories = catalog.filter((item) => item.kind === "category");
  const attributes = catalog.filter((item) => item.kind === "attribute");
  const pending = useMemo(
    () =>
      queue.filter(
        (item) => focusKind === "all" || item.kind === focusKind,
      ),
    [queue, focusKind],
  );
  const copyPending = pending.filter(
    (item) =>
      item.kind === "place" ||
      item.kind === "edit" ||
      item.kind === "translation",
  );

  function updateCopy(field: keyof PlaceCopy[Lang], value: string) {
    setCopy((prev) => ({
      ...prev,
      [locale]: { ...prev[locale], [field]: value },
    }));
  }

  async function onSave() {
    setBusy(true);
    setStatus(null);
    try {
      await save({
        id: initial._id,
        copy,
        categoryIds,
        attributeIds,
        publishStatus,
        lat,
        lng,
        geometryType,
        boundary: geometryType === "polygon" ? boundary : undefined,
      });
      onSaved();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  async function onApprove(item: AdminQueueItem) {
    await approve({ id: item._id });
    setQueue((prev) => prev.filter((row) => row._id !== item._id));
    if (item.kind === "place") setPublishStatus("public");
    if (
      (item.kind === "edit" || item.kind === "translation") &&
      item.language &&
      item.body &&
      item.field
    ) {
      setCopy((prev) => ({
        ...prev,
        [item.language!]: {
          ...prev[item.language!],
          [item.field!]: item.body!,
        },
      }));
    }
  }

  async function onReject(item: AdminQueueItem) {
    await reject({ id: item._id });
    setQueue((prev) => prev.filter((row) => row._id !== item._id));
  }

  function onPolygon(polygon: DrawnPolygon | null) {
    if (!polygon) return;
    setBoundary(polygon.boundary);
    setLat(polygon.lat);
    setLng(polygon.lng);
    setGeometryType("polygon");
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--ink)]">
          {initial._id ? initial.name : "New place"}
        </h2>
        <span className="text-xs text-[var(--ink-muted)]">
          {geometryType === "polygon" ? "Area" : "Point"}
        </span>
        {publishStatus === "draft" ? (
          <span className="text-xs text-[var(--ink-muted)]">Draft</span>
        ) : null}
      </div>

      {pending
        .filter((item) => item.kind === "place")
        .map((item) => (
          <div
            key={item._id}
            className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-[var(--ink)]"
          >
            Not public yet — {item.who} submitted this place.
          </div>
        ))}

      <div
        className={`flex flex-col gap-2 ${copyPending.length ? "border-l-3 border-primary pl-3" : ""}`}
      >
        <div className="flex flex-wrap gap-1.5">
          {LANGS.map((lang) => (
            <button
              key={lang}
              type="button"
              onClick={() => setLocale(lang)}
              className={`ui-interactive rounded-md px-2.5 py-1 text-xs ${
                locale === lang
                  ? "bg-primary text-primary-foreground"
                  : "bg-white ring-1 ring-[var(--line)] hover:bg-[var(--accent-soft)]"
              }`}
            >
              {LANG_LABELS[lang]}
            </button>
          ))}
        </div>
        <label className="text-xs font-semibold text-[var(--ink)]">Name</label>
        <input
          value={copy[locale].name}
          onChange={(e) => updateCopy("name", e.target.value)}
          placeholder={`${LANG_LABELS[locale]} name`}
          className="rounded-md border border-[var(--line)] px-3 py-2 text-sm"
        />
        <label className="text-xs font-semibold text-[var(--ink)]">
          Description
        </label>
        <textarea
          value={copy[locale].description}
          onChange={(e) => updateCopy("description", e.target.value)}
          placeholder={`${LANG_LABELS[locale]} description`}
          rows={3}
          className="rounded-md border border-[var(--line)] px-3 py-2 text-sm"
        />
        <label className="text-xs font-semibold text-[var(--ink)]">
          Address
        </label>
        <input
          value={copy[locale].address}
          onChange={(e) => updateCopy("address", e.target.value)}
          placeholder={`${LANG_LABELS[locale]} address`}
          className="rounded-md border border-[var(--line)] px-3 py-2 text-sm"
        />
        {copyPending.map((item) => (
          <DecisionRow
            key={item._id}
            text={`${item.who} · ${item.detail}${item.body ? `: ${item.body}` : ""}`}
            onApprove={() => void onApprove(item)}
            onReject={() => void onReject(item)}
          />
        ))}
      </div>

      <hr className="border-[var(--line)]" />
      <h3 className="font-semibold text-[var(--ink)]">Location</h3>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setGeometryType("point")}
          className={`rounded-md px-3 py-1.5 text-sm ${
            geometryType === "point"
              ? "bg-primary text-primary-foreground"
              : "bg-white ring-1 ring-[var(--line)]"
          }`}
        >
          Point
        </button>
        <button
          type="button"
          onClick={() => setGeometryType("polygon")}
          className={`rounded-md px-3 py-1.5 text-sm ${
            geometryType === "polygon"
              ? "bg-primary text-primary-foreground"
              : "bg-white ring-1 ring-[var(--line)]"
          }`}
        >
          Area
        </button>
      </div>
      {geometryType === "point" ? (
        <div className="grid grid-cols-2 gap-2">
          <input
            value={lat}
            onChange={(e) => setLat(Number(e.target.value))}
            type="number"
            step="any"
            className="rounded-md border border-[var(--line)] px-3 py-2 text-sm"
          />
          <input
            value={lng}
            onChange={(e) => setLng(Number(e.target.value))}
            type="number"
            step="any"
            className="rounded-md border border-[var(--line)] px-3 py-2 text-sm"
          />
        </div>
      ) : (
        <DrawMap onPolygon={onPolygon} />
      )}

      <hr className="border-[var(--line)]" />
      <h3 className="font-semibold text-[var(--ink)]">Categories</h3>
      <div className="flex flex-wrap gap-3">
        {categories.map((item) => (
          <label key={item._id} className="flex items-center gap-1.5 text-sm">
            <input
              type="checkbox"
              checked={categoryIds.includes(item._id as Id<"catalogItems">)}
              onChange={(e) =>
                setCategoryIds((prev) =>
                  e.target.checked
                    ? [...prev, item._id as Id<"catalogItems">]
                    : prev.filter((id) => id !== item._id),
                )
              }
            />
            {item.label}
          </label>
        ))}
      </div>
      <h3 className="font-semibold text-[var(--ink)]">Attributes</h3>
      <div className="flex flex-wrap gap-3">
        {attributes.map((item) => (
          <label key={item._id} className="flex items-center gap-1.5 text-sm">
            <input
              type="checkbox"
              checked={attributeIds.includes(item._id as Id<"catalogItems">)}
              onChange={(e) =>
                setAttributeIds((prev) =>
                  e.target.checked
                    ? [...prev, item._id as Id<"catalogItems">]
                    : prev.filter((id) => id !== item._id),
                )
              }
            />
            {item.label}
          </label>
        ))}
      </div>

      <div
        className={`flex flex-col gap-2 ${
          pending.some((item) => item.kind === "photo")
            ? "border-l-3 border-primary pl-3"
            : ""
        }`}
      >
        <h3 className="font-semibold text-[var(--ink)]">Photos</h3>
        {pending
          .filter((item) => item.kind === "photo")
          .map((item) => (
            <div key={item._id} className="flex flex-col gap-2">
              {item.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.photoUrl}
                  alt={`Photo from ${item.who}`}
                  className="max-h-48 w-auto rounded-md object-contain ring-1 ring-[var(--line)]"
                />
              ) : (
                <p className="text-xs text-[var(--ink-muted)]">
                  Preview unavailable
                </p>
              )}
              <DecisionRow
                text={`${item.who} added a photo.`}
                onApprove={() => void onApprove(item)}
                onReject={() => void onReject(item)}
              />
            </div>
          ))}
      </div>

      {pending.some((item) => item.kind === "comment") ? (
        <div className="flex flex-col gap-2 border-l-3 border-primary pl-3">
          <h3 className="font-semibold text-[var(--ink)]">Comments</h3>
          {pending
            .filter((item) => item.kind === "comment")
            .map((item) => (
              <DecisionRow
                key={item._id}
                text={`${item.who} · ${item.language ? LANG_LABELS[item.language] : ""}: ${item.body}`}
                onApprove={() => void onApprove(item)}
                onReject={() => void onReject(item)}
              />
            ))}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={publishStatus === "public"}
            onChange={(e) =>
              setPublishStatus(e.target.checked ? "public" : "draft")
            }
          />
          Public
        </label>
        <button
          type="button"
          disabled={busy}
          onClick={() => void onSave()}
          className="ui-interactive rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:brightness-110 disabled:opacity-60"
        >
          {busy ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={onBack}
          className="ui-interactive rounded-md px-3 py-2 text-sm text-[var(--ink-muted)] hover:bg-[var(--accent-soft)] hover:text-[var(--ink)]"
        >
          Back
        </button>
      </div>
      {status ? <p className="text-sm text-[var(--ink-muted)]">{status}</p> : null}
    </div>
  );
}

function DecisionRow({
  text,
  onApprove,
  onReject,
}: {
  text: string;
  onApprove: () => void;
  onReject: () => void;
}) {
  return (
    <div className="flex flex-col gap-1.5 rounded-md border border-[var(--line)] bg-[var(--panel)] p-2">
      <p className="text-sm text-[var(--ink)]">{text}</p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onApprove}
          className="ui-interactive rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:brightness-110"
        >
          Approve
        </button>
        <button
          type="button"
          onClick={onReject}
          className="ui-interactive rounded-md bg-white px-3 py-1.5 text-xs ring-1 ring-[var(--line)] hover:bg-[var(--accent-soft)]"
        >
          Reject
        </button>
      </div>
    </div>
  );
}
