"use client";

import { useMutation } from "convex/react";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import type { CatalogItem, CatalogKind } from "@/lib/catalog";
import { emptyLangNames, type LangNames } from "@/lib/copy";
import { LANGS, LANG_LABELS } from "@/lib/langs";

type Props = {
  draft: CatalogItem | { kind: CatalogKind; names: LangNames; slug: string };
  onBack: () => void;
  onSaved: () => void;
};

export function CatalogEditor({ draft, onBack, onSaved }: Props) {
  const upsert = useMutation(api.catalog.upsert);
  const [kind, setKind] = useState<CatalogKind>(draft.kind);
  const [slug, setSlug] = useState(draft.slug);
  const [names, setNames] = useState<LangNames>(() => ({
    ...emptyLangNames(),
    ...draft.names,
  }));
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const isNew = !("_id" in draft);

  async function onSave() {
    setBusy(true);
    setStatus(null);
    try {
      await upsert({
        id: "_id" in draft ? (draft._id as Id<"catalogItems">) : undefined,
        kind,
        slug,
        names,
      });
      onSaved();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--ink)]">
        {isNew
          ? kind === "category"
            ? "New category"
            : "New attribute"
          : Object.values(names).find((v) => v.trim()) || "Untitled"}
      </h2>
      {isNew ? (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setKind("category")}
            className={`rounded-md px-3 py-1.5 text-sm ${
              kind === "category"
                ? "bg-primary text-primary-foreground"
                : "bg-white ring-1 ring-[var(--line)]"
            }`}
          >
            Category
          </button>
          <button
            type="button"
            onClick={() => setKind("attribute")}
            className={`rounded-md px-3 py-1.5 text-sm ${
              kind === "attribute"
                ? "bg-primary text-primary-foreground"
                : "bg-white ring-1 ring-[var(--line)]"
            }`}
          >
            Attribute
          </button>
        </div>
      ) : (
        <p className="text-xs text-[var(--ink-muted)]">
          {kind === "category" ? "Category" : "Attribute"}
        </p>
      )}
      <label className="text-xs font-semibold">Slug</label>
      <input
        value={slug}
        onChange={(e) => setSlug(e.target.value)}
        className="rounded-md border border-[var(--line)] px-3 py-2 text-sm"
      />
      {LANGS.map((lang) => (
        <div key={lang} className="flex flex-col gap-1">
          <label className="text-xs font-semibold">{LANG_LABELS[lang]}</label>
          <input
            value={names[lang]}
            onChange={(e) =>
              setNames((prev) => ({ ...prev, [lang]: e.target.value }))
            }
            placeholder={`${LANG_LABELS[lang]} name`}
            className="rounded-md border border-[var(--line)] px-3 py-2 text-sm"
          />
        </div>
      ))}
      <div className="flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void onSave()}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
        >
          {busy ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={onBack}
          className="rounded-md px-3 py-2 text-sm text-[var(--ink-muted)]"
        >
          Back
        </button>
      </div>
      {status ? <p className="text-sm text-[var(--ink-muted)]">{status}</p> : null}
    </div>
  );
}
