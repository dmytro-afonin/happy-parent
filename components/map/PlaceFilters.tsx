"use client";

import {
  PLACE_ATTRIBUTES,
  PLACE_ATTRIBUTE_LABELS,
  PLACE_GROUPS,
  PLACE_GROUP_LABELS,
  PLACE_TYPES,
  PLACE_TYPE_LABELS,
  type PlaceAttribute,
  type PlaceGroup,
  type PlaceType,
} from "@/lib/catalog";

type Props = {
  groups: PlaceGroup[];
  types: PlaceType[];
  attributes: PlaceAttribute[];
  text: string;
  onGroups: (value: PlaceGroup[]) => void;
  onTypes: (value: PlaceType[]) => void;
  onAttributes: (value: PlaceAttribute[]) => void;
  onText: (value: string) => void;
};

function toggle<T extends string>(list: T[], value: T): T[] {
  return list.includes(value)
    ? list.filter((item) => item !== value)
    : [...list, value];
}

export function PlaceFiltersBar({
  groups,
  types,
  attributes,
  text,
  onGroups,
  onTypes,
  onAttributes,
  onText,
}: Props) {
  return (
    <div className="flex flex-col gap-3 border-b border-[var(--line)] bg-[var(--panel)] p-3">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-[var(--ink-muted)]">Search</span>
        <input
          type="search"
          value={text}
          onChange={(e) => onText(e.target.value)}
          placeholder="Name, address…"
          className="rounded-md border border-[var(--line)] bg-white px-3 py-2 text-[var(--ink)] outline-none focus:border-primary"
        />
      </label>

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-[var(--ink-muted)]">Groups</span>
        <div className="flex flex-wrap gap-2">
          {PLACE_GROUPS.map((group) => {
            const active = groups.includes(group);
            return (
              <button
                key={group}
                type="button"
                onClick={() => onGroups(toggle(groups, group))}
                className={`rounded-md px-3 py-1.5 text-sm transition ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "bg-white text-[var(--ink)] ring-1 ring-[var(--line)]"
                }`}
              >
                {PLACE_GROUP_LABELS[group]}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-[var(--ink-muted)]">Types</span>
        <div className="flex flex-wrap gap-2">
          {PLACE_TYPES.map((type) => {
            const active = types.includes(type);
            return (
              <button
                key={type}
                type="button"
                onClick={() => onTypes(toggle(types, type))}
                className={`rounded-md px-3 py-1.5 text-sm transition ${
                  active
                    ? "bg-[var(--ink)] text-[var(--paper)]"
                    : "bg-white text-[var(--ink)] ring-1 ring-[var(--line)]"
                }`}
              >
                {PLACE_TYPE_LABELS[type]}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-[var(--ink-muted)]">
          Attributes
        </span>
        <div className="flex flex-wrap gap-2">
          {PLACE_ATTRIBUTES.map((attr) => {
            const active = attributes.includes(attr);
            return (
              <label
                key={attr}
                className={`flex cursor-pointer items-center gap-2 rounded-md px-3 py-1.5 text-sm ring-1 ${
                  active
                    ? "bg-[var(--accent-soft)] ring-primary"
                    : "bg-white ring-[var(--line)]"
                }`}
              >
                <input
                  type="checkbox"
                  checked={active}
                  onChange={() => onAttributes(toggle(attributes, attr))}
                  className="accent-primary"
                />
                {PLACE_ATTRIBUTE_LABELS[attr]}
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}
