import type { WarsawAddress } from "./warsaw-addresses";

/** Calls our `/api/geocode` proxy (LocationIQ key stays server-side). */
export async function searchLocationIq(
  query: string,
): Promise<WarsawAddress[]> {
  if (query.trim().length < 2) return [];
  try {
    const res = await fetch(
      `/api/geocode?q=${encodeURIComponent(query.trim())}`,
      { signal: AbortSignal.timeout(5000) },
    );
    if (!res.ok) return [];
    return (await res.json()) as WarsawAddress[];
  } catch {
    return [];
  }
}
