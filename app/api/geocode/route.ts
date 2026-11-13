import { auth } from "@clerk/nextjs/server";
import { fetchMutation } from "convex/nextjs";
import { NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
import { shortenAddress } from "@/lib/format-address";
import {
  GEOCODE_COOKIE,
  isMissingGeocodeProxySecret,
  readGeocodeSession,
} from "@/lib/geocode-gate";

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
const RESULT_CACHE_TTL_MS = 60 * 60 * 1000;
const RESULT_CACHE_MAX = 200;

/** Cache non-empty successful lookups to cut quota burn on repeat typing. */
const resultCache = new Map<string, { at: number; hits: GeocodeHit[] }>();

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

  // Require the signed map-session cookie minted by proxy middleware.
  // Sec-Fetch-Site alone is attacker-spoofable; this HMAC is not.
  const cookieHeader = request.headers.get("cookie") ?? "";
  const geoCookie = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${GEOCODE_COOKIE}=`))
    ?.slice(GEOCODE_COOKIE.length + 1);
  let session: Awaited<ReturnType<typeof readGeocodeSession>>;
  try {
    session = await readGeocodeSession(geoCookie);
  } catch (error) {
    if (isMissingGeocodeProxySecret(error)) {
      return NextResponse.json(
        { error: "GEOCODE_PROXY_SECRET is not set" },
        { status: 503, headers: noStore },
      );
    }
    throw error;
  }
  if (!session) {
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403, headers: noStore },
    );
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

  const { userId } = await auth();
  let quota: {
    allowed: boolean;
    retryAfterMs: number;
  };
  try {
    quota = await fetchMutation(api.geocodeSessions.consume, {
      sessionId: session.sessionId,
      expiresAt: session.expiresAt,
      signature: session.signature,
      tier: userId ? "user" : "guest",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("GEOCODE_PROXY_SECRET is not set")) {
      return NextResponse.json(
        { error: "GEOCODE_PROXY_SECRET is not set" },
        { status: 503, headers: noStore },
      );
    }
    return NextResponse.json(
      { error: "Geocode quota is unavailable" },
      { status: 503, headers: noStore },
    );
  }
  if (!quota.allowed) {
    const retryAfterSec = Math.max(1, Math.ceil(quota.retryAfterMs / 1000));
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { ...noStore, "Retry-After": String(retryAfterSec) } },
    );
  }

  const cacheKey = q.toLowerCase();
  const cached = cachedHits(cacheKey);
  if (cached) {
    return NextResponse.json(cached, { headers: noStore });
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
