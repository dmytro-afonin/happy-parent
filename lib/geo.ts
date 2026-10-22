/** Centroid of a closed or open ring (average of vertices, ignoring duplicate close). */
export function ringCentroid(
  ring: Array<{ lat: number; lng: number }>,
): { lat: number; lng: number } {
  if (ring.length === 0) {
    return { lat: 0, lng: 0 };
  }
  let points = ring;
  if (
    ring.length > 1 &&
    ring[0].lat === ring[ring.length - 1].lat &&
    ring[0].lng === ring[ring.length - 1].lng
  ) {
    points = ring.slice(0, -1);
  }
  const n = points.length || 1;
  const sum = points.reduce(
    (acc, p) => ({ lat: acc.lat + p.lat, lng: acc.lng + p.lng }),
    { lat: 0, lng: 0 },
  );
  return { lat: sum.lat / n, lng: sum.lng / n };
}
