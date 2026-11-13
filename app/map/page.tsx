import { MapScreen } from "@/components/map/MapScreen";
import { parseMapVariant } from "@/lib/map-variant";

type MapSearchParams = {
  variant?: string | string[];
};

export default async function MapPage({
  searchParams,
}: {
  searchParams: Promise<MapSearchParams>;
}) {
  const params = await searchParams;
  const raw = params.variant;
  const variant = parseMapVariant(Array.isArray(raw) ? raw[0] : raw);
  return <MapScreen variant={variant} />;
}
