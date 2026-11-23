import { MapScreen } from "@/components/map/MapScreen";
import { parseMapVariant } from "@/lib/map-variant";

type HomeSearchParams = {
  variant?: string | string[];
};

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<HomeSearchParams>;
}) {
  const params = await searchParams;
  const raw = params.variant;
  const variant = parseMapVariant(Array.isArray(raw) ? raw[0] : raw);
  return <MapScreen variant={variant} />;
}
