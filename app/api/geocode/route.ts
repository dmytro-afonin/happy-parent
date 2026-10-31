import { NextResponse } from "next/server";
import { shortenAddress } from "@/lib/format-address";

type LocationIqHit = {
  place_id: string | number;
  display_name: string;
  lat: string;
  lon: string;
};

type GeocodeHit = {
  id: string;
  label: string;
  subtitle: string;
  lat: number;
  lng: number;
};

const MAX_Q_LEN = 80;
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 20;
const RESULT_CACHE_TTL_MS = 60 * 60 * 1000;
const RESULT_CACHE_MAX = 200;

/** Simple in-memory IP throttle for the shared LocationIQ key. */
const hitsByIp = new Map<string, { count: number; resetAt: number }>();
/** Cache non-empty successful lookups to cut quota burn on repeat typing. */
const resultCache = new Map<string, { at: number; hits: GeocodeHit[] }>();

function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip") || "unknown";
}

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const row = hitsByIp.get(ip);
  if (!row || now >= row.resetAt) {
    hitsByIp.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  row.count += 1;
  return row.count > RATE_MAX;
}

/**
 * Only allow browser calls from this app. Blocks raw curl/bots that would
 * burn the shared LocationIQ quota without loading the map UI.
 */
function isSameAppBrowserRequest(request: Request): boolean {
  const site = request.headers.get("sec-fetch-site");
  if (site === "same-origin" || site === "same-site") return true;
  if (site === "cross-site" || site === "none") return false;

  const host = request.headers.get("host");
  if (!host) return false;

  const origin = request.headers.get("origin");
  if (origin) {
    try {
      return new URL(origin).host === host;
    } catch {
      return false;
    }
  }

  const referer = request.headers.get("referer");
  if (referer) {
    try {
      return new URL(referer).host === host;
    } catch {
      return false;
    }
  }

  return false;
}

function cachedHits(q: string): GeocodeHit[] | null {
  const row = resultCache.get(q);
  if (!row) return null;
  if (Date.now() - row.at > RESULT_CACHE_TTL_MS) {
    resultCache.delete(q);
    return null;
  }
  return row.hits;
}

function storeHits(q: string, hits: GeocodeHit[]) {
  if (hits.length === 0) return;
  if (resultCache.size >= RESULT_CACHE_MAX) {
    const oldest = resultCache.keys().next().value;
    if (oldest !== undefined) resultCache.delete(oldest);
  }
  resultCache.set(q, { at: Date.now(), hits });
}

const noStore = { "Cache-Control": "no-store" } as const;

/**
 * Warsaw-biased forward geocode. Empty/error responses are never cached.
 */
export async function GET(request: Request) {
  if (!isSameAppBrowserRequest(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: noStore });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return NextResponse.json([]);
  }
  if (q.length > MAX_Q_LEN) {
    return NextResponse.json(
      { error: "Query too long" },
      { status: 400, headers: noStore },
    );
  }

  const cacheKey = q.toLowerCase();
  const cached = cachedHits(cacheKey);
  if (cached) {
    return NextResponse.json(cached, { headers: noStore });
  }

  if (rateLimited(clientIp(request))) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: noStore },
    );
  }

  const key = process.env.LOCATIONIQ_API_KEY;
  if (!key) {
    return NextResponse.json([], { status: 200, headers: noStore });
  }

  const params = new URLSearchParams({
    key,
    q:
      q.toLowerCase().includes("warsaw") || q.toLowerCase().includes("warszawa")
        ? q
        : `${q}, Warszawa`,
    format: "json",
    limit: "6",
    countrycodes: "pl",
    "accept-language": "pl,en",
    viewbox: "20.80,52.40,21.30,52.05",
    addressdetails: "0",
  });

  try {
    const res = await fetch(
      `https://eu1.locationiq.com/v1/search?${params.toString()}`,
      {
        cache: "no-store",
        headers: { Accept: "application/json" },
      },
    );
    if (!res.ok) {
      return NextResponse.json([], { headers: noStore });
    }
    const data = (await res.json()) as LocationIqHit[];
    if (!Array.isArray(data)) {
      return NextResponse.json([], { headers: noStore });
    }
    const hits: GeocodeHit[] = data.map((hit) => {
      const label =
        hit.display_name.split(",")[0]?.trim() || hit.display_name;
      return {
        id: `liq-${hit.place_id}`,
        label,
        subtitle: shortenAddress(hit.display_name, label),
        lat: Number(hit.lat),
        lng: Number(hit.lon),
      };
    });
    storeHits(cacheKey, hits);
    return NextResponse.json(hits, { headers: noStore });
  } catch {
    return NextResponse.json([], { headers: noStore });
  }
}
