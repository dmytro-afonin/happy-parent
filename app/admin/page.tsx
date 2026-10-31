"use client";

import { useConvexAuth, useQuery } from "convex/react";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  CatalogEditor,
} from "@/components/admin/CatalogEditor";
import {
  PlaceEditor,
  type AdminPlaceDraft,
  type AdminQueueItem,
} from "@/components/admin/PlaceEditor";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import type { CatalogItem, CatalogKind } from "@/lib/catalog";
import { emptyLangNames, emptyPlaceCopy } from "@/lib/copy";
import { isLang, LANGS, LANG_LABELS, type Lang } from "@/lib/langs";

type Tab = "places" | "catalog";
type SortKey = "action" | "updated" | "nameAsc" | "nameDesc";
type Kind = AdminQueueItem["kind"];

const KIND_LABEL: Record<Kind, string> = {
  place: "New place",
  edit: "Edit",
  translation: "Translation",
  photo: "Photo",
  comment: "Comment",
};

const KINDS: Kind[] = ["place", "edit", "translation", "photo", "comment"];

export default function AdminPage() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const me = useQuery(api.users.me);
  const adminData = useQuery(api.places.listAdmin);
  const catalog = useQuery(api.catalog.list) as CatalogItem[] | undefined;

  const [tab, setTab] = useState<Tab>("places");
  const [screen, setScreen] = useState<"list" | "place" | "catalogItem">("list");
  const [draft, setDraft] = useState<AdminPlaceDraft | null>(null);
  const [catalogDraft, setCatalogDraft] = useState<
    CatalogItem | { kind: CatalogKind; names: ReturnType<typeof emptyLangNames>; slug: string } | null
  >(null);
  const [focusKind, setFocusKind] = useState<Kind | "all">("all");
  const [sort, setSort] = useState<SortKey>("action");
  const [actionsOn, setActionsOn] = useState<Kind[]>([]);
  const [categoriesOn, setCategoriesOn] = useState<string[]>([]);
  const [langsOn, setLangsOn] = useState<Lang[]>([]);
  const [query, setQuery] = useState("");
  const [groupByPlace, setGroupByPlace] = useState(true);
  const [catalogKind, setCatalogKind] = useState<"all" | CatalogKind>("all");
  const [catalogQuery, setCatalogQuery] = useState("");
  const [catalogMissing, setCatalogMissing] = useState<Lang | "all">("all");

  const places = useMemo(() => adminData?.places ?? [], [adminData?.places]);
  const categories = useMemo(
    () => (catalog ?? []).filter((item) => item.kind === "category"),
    [catalog],
  );

  const visiblePlaces = useMemo(() => {
    return places
      .filter((place) => {
        if (
          categoriesOn.length > 0 &&
          !place.categoryIds.some((id) => categoriesOn.includes(id))
        ) {
          return false;
        }
        if (actionsOn.length === 0 && langsOn.length > 0) {
          if (!place.filledLangs.some((id) => langsOn.includes(id as Lang))) {
            return false;
          }
        }
        if (actionsOn.length > 0) {
          const waiting = place.queue.filter((item) => {
            if (!actionsOn.includes(item.kind)) return false;
            if (
              actionsOn.length > 0 &&
              langsOn.length > 0 &&
              (!item.language || !langsOn.includes(item.language as Lang))
            ) {
              return false;
            }
            return true;
          });
          if (waiting.length === 0) return false;
        }
        const needle = query.trim().toLowerCase();
        if (!needle) return true;
        const hay = [
          place.name,
          place.description,
          place.address,
          ...place.categories,
          ...place.attributes,
          ...place.queue.map(
            (item) => `${item.detail} ${item.body ?? ""} ${item.who}`,
          ),
        ]
          .join(" ")
          .toLowerCase();
        return hay.includes(needle);
      })
      .sort((a, b) => {
        const byName = a.name.localeCompare(b.name, "pl");
        if (sort === "nameAsc") return byName;
        if (sort === "nameDesc") return -byName;
        if (sort === "updated") return b.updatedAt - a.updatedAt || byName;
        const aw = a.queue.length;
        const bw = b.queue.length;
        if ((aw > 0) !== (bw > 0)) return aw > 0 ? -1 : 1;
        if (aw !== bw) return bw - aw;
        return byName;
      });
  }, [places, categoriesOn, actionsOn, langsOn, query, sort]);

  const visibleActions = useMemo(() => {
    const rows: Array<{
      item: (typeof places)[number]["queue"][number];
      place: (typeof places)[number];
    }> = [];
    for (const place of visiblePlaces) {
      for (const item of place.queue) {
        if (actionsOn.length > 0 && !actionsOn.includes(item.kind)) continue;
        if (
          actionsOn.length > 0 &&
          langsOn.length > 0 &&
          (!item.language || !langsOn.includes(item.language as Lang))
        ) {
          continue;
        }
        rows.push({ item, place });
      }
    }
    return rows;
  }, [visiblePlaces, actionsOn, langsOn]);

  const visibleCatalog = useMemo(() => {
    return (catalog ?? []).filter((row) => {
      if (catalogKind !== "all" && row.kind !== catalogKind) return false;
      if (catalogMissing !== "all" && row.names[catalogMissing]?.trim()) {
        return false;
      }
      const needle = catalogQuery.trim().toLowerCase();
      if (!needle) return true;
      return Object.values(row.names).join(" ").toLowerCase().includes(needle);
    });
  }, [catalog, catalogKind, catalogMissing, catalogQuery]);

  function openPlace(
    place: (typeof places)[number],
    focus: Kind | "all",
  ) {
    setDraft({
      _id: place._id as Id<"places">,
      copy: place.copy,
      categoryIds: place.categoryIds as Id<"catalogItems">[],
      attributeIds: place.attributeIds as Id<"catalogItems">[],
      publishStatus: place.publishStatus,
      lat: place.lat,
      lng: place.lng,
      geometryType: place.geometryType,
      boundary: place.boundary,
      name: place.name,
      queue: place.queue as AdminQueueItem[],
    });
    setFocusKind(focus);
    setScreen("place");
    setTab("places");
  }

  function startPlace() {
    setDraft({
      copy: emptyPlaceCopy(),
      categoryIds: [],
      attributeIds: [],
      publishStatus: "draft",
      lat: 52.2297,
      lng: 21.0122,
      geometryType: "point",
      name: "New place",
      queue: [],
    });
    setFocusKind("all");
    setScreen("place");
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
        <Link href="/sign-in" className="text-primary underline">
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
          Your Convex role is{" "}
          <code className="text-[var(--ink)]">{me?.role ?? "unknown"}</code>.
          An admin must promote your user before you can moderate places.
        </p>
        <Link href="/map" className="mt-4 inline-block text-primary underline">
          Back to map
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl text-[var(--ink)]">
            Admin
          </h1>
          <p className="mt-1 text-sm text-[var(--ink-muted)]">
            Moderate places, translations, photos, and comments. Manage the
            catalog.
            {adminData ? ` · ${adminData.queueCount} waiting` : ""}
          </p>
        </div>
        <Link href="/map" className="text-sm text-primary underline">
          Public map
        </Link>
      </div>

      <div className="flex gap-1 border-b border-[var(--line)]">
        {(["places", "catalog"] as Tab[]).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              setTab(id);
              setScreen("list");
            }}
            className={`ui-interactive -mb-px border-b-2 px-4 py-2.5 text-sm ${
              tab === id
                ? "border-primary font-semibold text-[var(--ink)]"
                : "border-transparent text-[var(--ink-muted)] hover:text-[var(--ink)]"
            }`}
          >
            {id === "places" ? "Places" : "Catalog"}
          </button>
        ))}
      </div>

      {tab === "places" && screen === "list" ? (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="rounded-md border border-[var(--line)] px-2 py-1.5 text-sm"
            >
              <option value="action">Action required</option>
              <option value="updated">Last update</option>
              <option value="nameAsc">A–Z</option>
              <option value="nameDesc">Z–A</option>
            </select>
            <div className="ml-auto flex flex-wrap gap-2">
              <MultiFilter
                label="Action"
                options={KINDS.map((kind) => ({
                  id: kind,
                  label: KIND_LABEL[kind],
                }))}
                selected={actionsOn}
                onChange={(next) =>
                  setActionsOn(next.filter((id): id is Kind => KINDS.includes(id as Kind)))
                }
              />
              <MultiFilter
                label="Category"
                options={categories.map((row) => ({
                  id: row._id,
                  label: row.label,
                }))}
                selected={categoriesOn}
                onChange={setCategoriesOn}
              />
              <MultiFilter
                label="Language"
                options={LANGS.map((lang) => ({
                  id: lang,
                  label: LANG_LABELS[lang],
                }))}
                selected={langsOn}
                onChange={(next) => setLangsOn(next.filter(isLang))}
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search places"
              className="min-w-0 flex-1 rounded-md border border-[var(--line)] px-3 py-2 text-sm"
            />
            <div className="flex overflow-hidden rounded-md border border-[var(--line)]">
              <button
                type="button"
                title="Group by place"
                aria-pressed={groupByPlace}
                onClick={() => setGroupByPlace(true)}
                className={`px-3 py-1.5 text-xs ${
                  groupByPlace
                    ? "bg-primary text-primary-foreground"
                    : "bg-white text-[var(--ink-muted)]"
                }`}
              >
                By place
              </button>
              <button
                type="button"
                title="Each action"
                aria-pressed={!groupByPlace}
                onClick={() => setGroupByPlace(false)}
                className={`px-3 py-1.5 text-xs ${
                  !groupByPlace
                    ? "bg-primary text-primary-foreground"
                    : "bg-white text-[var(--ink-muted)]"
                }`}
              >
                Actions
              </button>
            </div>
            <button
              type="button"
              onClick={startPlace}
              className="ui-interactive rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:brightness-110"
            >
              New place
            </button>
          </div>

          {groupByPlace ? (
            <div className="overflow-hidden rounded-md border border-[var(--line)]">
              {visiblePlaces.map((place) => (
                <button
                  key={place._id}
                  type="button"
                  onClick={() => openPlace(place, "all")}
                  className="ui-row flex w-full items-start gap-3 border-t border-[var(--line)] px-3 py-2.5 text-left first:border-t-0"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {place.queue.length > 0 ? (
                        <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                          {place.queue.length}
                        </span>
                      ) : null}
                      <span className="font-semibold text-[var(--ink)]">
                        {place.name}
                      </span>
                      {place.publishStatus === "draft" ? (
                        <span className="text-xs text-[var(--ink-muted)]">
                          Draft
                        </span>
                      ) : null}
                    </div>
                    <p className="truncate text-xs text-[var(--ink-muted)]">
                      {place.description} · {place.address}
                    </p>
                    {place.queue.length > 0 ? (
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {KINDS.filter((kind) =>
                          place.queue.some((item) => item.kind === kind),
                        ).map((kind) => (
                          <span
                            key={kind}
                            className="rounded-md bg-white px-2 py-0.5 text-[11px] ring-1 ring-[var(--line)]"
                          >
                            {KIND_LABEL[kind]} ·{" "}
                            {
                              place.queue.filter((item) => item.kind === kind)
                                .length
                            }
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <span className="shrink-0 text-xs text-[var(--ink-muted)]">
                    {place.geometryType === "polygon" ? "Area" : "Point"}
                  </span>
                  <span className="shrink-0 text-xs text-[var(--ink-muted)]">
                    {place.categories.join(", ")}
                  </span>
                  <span
                    className={`inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold ${
                      place.filledLangs.length === 5
                        ? "bg-[var(--panel)] text-[var(--ink-muted)]"
                        : "bg-primary text-primary-foreground"
                    }`}
                  >
                    {place.filledLangs.length}
                  </span>
                </button>
              ))}
              {visiblePlaces.length === 0 ? (
                <p className="p-3 text-sm text-[var(--ink-muted)]">
                  No places match.
                </p>
              ) : null}
            </div>
          ) : (
            <div className="overflow-hidden rounded-md border border-[var(--line)]">
              {visibleActions.map(({ item, place }) => (
                <button
                  key={item._id}
                  type="button"
                  onClick={() => openPlace(place, item.kind)}
                  className="ui-row flex w-full items-center gap-2 border-t border-[var(--line)] px-3 py-2 text-left text-sm first:border-t-0"
                >
                  <span className="font-semibold">{place.name}</span>
                  <span className="text-[var(--ink-muted)]">{item.detail}</span>
                  <span className="text-xs text-[var(--ink-muted)]">
                    {item.who}
                  </span>
                </button>
              ))}
              {visibleActions.length === 0 ? (
                <p className="p-3 text-sm text-[var(--ink-muted)]">
                  No actions match.
                </p>
              ) : null}
            </div>
          )}
        </div>
      ) : null}

      {tab === "places" && screen === "place" && draft ? (
        <PlaceEditor
          draft={draft}
          catalog={catalog ?? []}
          focusKind={focusKind}
          onBack={() => setScreen("list")}
          onSaved={() => setScreen("list")}
        />
      ) : null}

      {tab === "catalog" && screen === "list" ? (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={catalogQuery}
              onChange={(e) => setCatalogQuery(e.target.value)}
              placeholder="Search catalog"
              className="min-w-0 flex-1 rounded-md border border-[var(--line)] px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={() => {
                setCatalogDraft({
                  kind: "attribute",
                  slug: "",
                  names: emptyLangNames(),
                });
                setScreen("catalogItem");
              }}
              className="rounded-md bg-white px-3 py-2 text-sm ring-1 ring-[var(--line)]"
            >
              New attribute
            </button>
            <button
              type="button"
              onClick={() => {
                setCatalogDraft({
                  kind: "category",
                  slug: "",
                  names: emptyLangNames(),
                });
                setScreen("catalogItem");
              }}
              className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
            >
              New category
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              value={catalogKind}
              onChange={(e) =>
                setCatalogKind(
                  e.target.value === "category" || e.target.value === "attribute"
                    ? e.target.value
                    : "all",
                )
              }
              className="rounded-md border border-[var(--line)] px-2 py-1.5 text-sm"
            >
              <option value="all">Categories and attributes</option>
              <option value="category">Categories</option>
              <option value="attribute">Attributes</option>
            </select>
            <select
              value={catalogMissing}
              onChange={(e) =>
                setCatalogMissing(
                  isLang(e.target.value) ? e.target.value : "all",
                )
              }
              className="rounded-md border border-[var(--line)] px-2 py-1.5 text-sm"
            >
              <option value="all">Any coverage</option>
              {LANGS.map((lang) => (
                <option key={lang} value={lang}>
                  Missing {LANG_LABELS[lang]}
                </option>
              ))}
            </select>
          </div>
          <div className="overflow-hidden rounded-md border border-[var(--line)]">
            {visibleCatalog.map((row) => {
              const catalogId = row._id as Id<"catalogItems">;
              const used = places.filter(
                (place) =>
                  place.categoryIds.includes(catalogId) ||
                  place.attributeIds.includes(catalogId),
              ).length;
              return (
                <button
                  key={row._id}
                  type="button"
                  onClick={() => {
                    setCatalogDraft(row);
                    setScreen("catalogItem");
                  }}
                  className="ui-row flex w-full items-center gap-3 border-t border-[var(--line)] px-3 py-2 text-left first:border-t-0"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-[var(--ink)]">
                      {row.label}
                    </p>
                    <p className="truncate text-xs text-[var(--ink-muted)]">
                      {LANGS.map((lang) => row.names[lang]?.trim() || "—").join(
                        " · ",
                      )}
                    </p>
                  </div>
                  <span className="text-xs text-[var(--ink-muted)]">
                    {row.kind === "category" ? "Category" : "Attribute"}
                  </span>
                  <span className="text-xs text-[var(--ink-muted)]">{used}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {tab === "catalog" && screen === "catalogItem" && catalogDraft ? (
        <CatalogEditor
          draft={catalogDraft}
          onBack={() => setScreen("list")}
          onSaved={() => setScreen("list")}
        />
      ) : null}
    </main>
  );
}

function MultiFilter({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: { id: string; label: string }[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const names = selected
    .map((id) => options.find((option) => option.id === id)?.label)
    .filter((name): name is string => Boolean(name));
  const valueText =
    names.length === 0
      ? "All"
      : names.length <= 2
        ? names.join(", ")
        : `${names[0]} +${names.length - 1}`;

  return (
    <div className="relative">
      {open ? (
        <>
          <button
            type="button"
            aria-label="Close menu"
            className="fixed inset-0 z-10 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 z-20 mt-8 w-56 rounded-md border border-[var(--line)] bg-white p-2 shadow">
            {names.length > 0 ? (
              <button
                type="button"
                className="mb-1 text-xs text-primary"
                onClick={() => onChange([])}
              >
                Clear
              </button>
            ) : null}
            <div className="flex max-h-56 flex-col gap-1 overflow-y-auto">
              {options.map((option) => (
                <label
                  key={option.id}
                  className="flex items-center gap-2 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(option.id)}
                    onChange={(e) =>
                      onChange(
                        e.target.checked
                          ? [...selected, option.id]
                          : selected.filter((id) => id !== option.id),
                      )
                    }
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </div>
        </>
      ) : null}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="ui-interactive rounded-md border border-[var(--line)] bg-white px-2.5 py-1.5 text-sm hover:bg-[var(--accent-soft)]"
      >
        {label}: {valueText}
      </button>
    </div>
  );
}
