import { createHmac, timingSafeEqual } from "node:crypto";

export const GEOCODE_COOKIE = "hp_geo";
const TTL_MS = 12 * 60 * 60 * 1000;

function secret(): string {
  return (
    process.env.GEOCODE_PROXY_SECRET ||
    process.env.CLERK_SECRET_KEY ||
    ""
  );
}

/** Mint an httpOnly map-session cookie that authorizes `/api/geocode`. */
export function mintGeocodeCookieValue(now = Date.now()): string | null {
  const s = secret();
  if (!s) return null;
  const payload = String(now + TTL_MS);
  const sig = createHmac("sha256", s).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function verifyGeocodeCookieValue(
  value: string | undefined,
  now = Date.now(),
): boolean {
  if (!value) return false;
  const s = secret();
  if (!s) return false;
  const dot = value.indexOf(".");
  if (dot <= 0) return false;
  const payload = value.slice(0, dot);
  const sig = value.slice(dot + 1);
  const exp = Number(payload);
  if (!Number.isFinite(exp) || exp < now) return false;
  const expected = createHmac("sha256", s).update(payload).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
