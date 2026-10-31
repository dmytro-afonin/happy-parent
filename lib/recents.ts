export type Recent =
  | { kind: "search"; query: string; at: number }
  | { kind: "place"; placeId: string; at: number };

const KEY = "hp-map-recents-v1";

export function loadRecents(): Recent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Recent[];
    return Array.isArray(parsed) ? parsed.slice(0, 8) : [];
  } catch {
    return [];
  }
}

export function rememberRecent(list: Recent[], next: Recent): Recent[] {
  const rest = list.filter((item) => {
    if (next.kind === "search" && item.kind === "search") {
      return item.query.toLowerCase() !== next.query.toLowerCase();
    }
    if (next.kind === "place" && item.kind === "place") {
      return item.placeId !== next.placeId;
    }
    return true;
  });
  const updated = [next, ...rest].slice(0, 8);
  if (typeof window !== "undefined") {
    window.localStorage.setItem(KEY, JSON.stringify(updated));
  }
  return updated;
}
