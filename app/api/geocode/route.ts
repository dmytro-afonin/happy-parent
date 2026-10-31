import { NextResponse } from "next/server";
import { shortenAddress } from "@/lib/format-address";

type LocationIqHit = {
  place_id: string | number;
  display_name: string;
  lat: string;
  lon: string;
};

const MAX_Q_LEN = 120;
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 30;

/** Simple in-memory IP throttle for the shared LocationIQ key. */
const hitsByIp = new Map<string, { count: number; resetAt: number }>();

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
 * Warsaw-biased forward geocode. Avoid caching empty/error responses —
 * Next `revalidate` was returning stale `[]` after early key misses.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return NextResponse.json([]);
  }
  if (q.length > MAX_Q_LEN) {
    return NextResponse.json(
      { error: "Query too long" },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (rateLimited(clientIp(request))) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Cache-Control": "no-store" } },
    );
  }

  const key = process.env.LOCATIONIQ_API_KEY;
  if (!key) {
    return NextResponse.json([], { status: 200 });
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
    // left,top,right,bottom — Warsaw metro box
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
      return NextResponse.json([], {
        headers: { "Cache-Control": "no-store" },
      });
    }
    const data = (await res.json()) as LocationIqHit[];
    if (!Array.isArray(data)) {
      return NextResponse.json([], {
        headers: { "Cache-Control": "no-store" },
      });
    }
    return NextResponse.json(
      data.map((hit) => {
        const label =
          hit.display_name.split(",")[0]?.trim() || hit.display_name;
        return {
          id: `liq-${hit.place_id}`,
          label,
          subtitle: shortenAddress(hit.display_name, label),
          lat: Number(hit.lat),
          lng: Number(hit.lon),
        };
      }),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json([], {
      headers: { "Cache-Control": "no-store" },
    });
  }
}
