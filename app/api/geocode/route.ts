import { NextResponse } from "next/server";

type LocationIqHit = {
  place_id: string | number;
  display_name: string;
  lat: string;
  lon: string;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return NextResponse.json([]);
  }

  const key = process.env.LOCATIONIQ_API_KEY;
  if (!key) {
    return NextResponse.json([]);
  }

  const params = new URLSearchParams({
    key,
    q: `${q}, Warsaw`,
    format: "json",
    limit: "5",
    countrycodes: "pl",
    "accept-language": "en",
    viewbox: "20.85,52.37,21.28,52.09",
    bounded: "1",
  });

  try {
    const res = await fetch(
      `https://us1.locationiq.com/v1/search?${params.toString()}`,
      { next: { revalidate: 3600 } },
    );
    if (!res.ok) {
      return NextResponse.json([]);
    }
    const data = (await res.json()) as LocationIqHit[];
    return NextResponse.json(
      data.map((hit) => ({
        id: `liq-${hit.place_id}`,
        label: hit.display_name.split(",")[0]?.trim() || hit.display_name,
        subtitle: hit.display_name,
        lat: Number(hit.lat),
        lng: Number(hit.lon),
      })),
    );
  } catch {
    return NextResponse.json([]);
  }
}
