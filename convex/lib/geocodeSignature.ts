/** Shared geocode-session HMAC and quota constants. No Node built-ins. */

export const GEOCODE_SESSION_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export const GEOCODE_COOKIE_TTL_MS = 12 * 60 * 60 * 1000;
export const GEOCODE_COOKIE_MAX_AGE_SEC = GEOCODE_COOKIE_TTL_MS / 1000;
export const GEOCODE_WINDOW_MS = 60 * 60 * 1000;
export const GUEST_GEOCODE_LIMIT = 30;
/** Signed-in callers get a higher hourly ceiling than guests. */
export const USER_GEOCODE_LIMIT = 120;

const LIMIT_BY_TIER = {
  guest: GUEST_GEOCODE_LIMIT,
  user: USER_GEOCODE_LIMIT,
} as const;

export type GeocodeTier = keyof typeof LIMIT_BY_TIER;

export function geocodeLimitForTier(tier: GeocodeTier): number {
  return LIMIT_BY_TIER[tier];
}

export function geocodeSignaturePayload(
  sessionId: string,
  expiresAt: number | string,
): string {
  return `${sessionId}.${expiresAt}`;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  const alphabet =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const remaining = bytes.length - i;
    const a = bytes[i] ?? 0;
    const b = bytes[i + 1] ?? 0;
    const c = bytes[i + 2] ?? 0;
    const triple = (a << 16) | (b << 8) | c;
    out += alphabet[(triple >> 18) & 63];
    out += alphabet[(triple >> 12) & 63];
    if (remaining > 1) out += alphabet[(triple >> 6) & 63];
    if (remaining > 2) out += alphabet[triple & 63];
  }
  return out;
}

export async function signGeocodePayload(
  secret: string,
  payload: string,
): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload),
  );
  return bytesToBase64Url(new Uint8Array(signature));
}

export function timingSafeEqualStrings(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

export async function geocodeSignaturesMatch(
  secret: string,
  payload: string,
  signature: string,
): Promise<boolean> {
  const expected = await signGeocodePayload(secret, payload);
  return timingSafeEqualStrings(expected, signature);
}
