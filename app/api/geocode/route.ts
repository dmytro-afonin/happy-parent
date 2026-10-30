import { NextResponse } from "next/server";

type LocationIqHit = {
  place_id: string | number;
  display_name: string;
  lat: string;
  lon: string;
};

/**
 * Warsaw-bounded forward geocode. Avoid caching empty/error responses —
 * Next `revalidate` was returning stale `[]` after early key misses.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return NextResponse.json([]);
  }

  const key = process.env.LOCATIONIQ_API_KEY;
  if (!key) {
    return NextResponse.json([], { status: 200 });
  }

  const params = new URLSearchParams({
    key,
    q: q.toLowerCase().includes("warsaw") || q.toLowerCase().includes("warszawa")
      ? q
      : `${q}, Warszawa`,
    format: "json",
    limit: "6",
    countrycodes: "pl",
    "accept-language": "pl,en",
    // left,top,right,bottom — Warsaw metro box
    viewbox: "20.80,52.40,21.30,52.05",
    // Don't force bounded=1 — many street hits sit just outside a tight box
    // and LocationIQ then returns []. Prefer Warsaw bias without hard clip.
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
      data.map((hit) => ({
        id: `liq-${hit.place_id}`,
        label: hit.display_name.split(",")[0]?.trim() || hit.display_name,
        subtitle: hit.display_name,
        lat: Number(hit.lat),
        lng: Number(hit.lon),
      })),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json([], {
      headers: { "Cache-Control": "no-store" },
    });
  }
}
