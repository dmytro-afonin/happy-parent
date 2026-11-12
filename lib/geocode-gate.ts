import { randomUUID } from "node:crypto";
import {
  GEOCODE_COOKIE_MAX_AGE_SEC,
  GEOCODE_COOKIE_TTL_MS,
  GEOCODE_SESSION_ID_RE,
  geocodeSignaturePayload,
  geocodeSignaturesMatch,
  signGeocodePayload,
} from "@/convex/lib/geocodeSignature";

export const GEOCODE_COOKIE = "hp_geo";
export { GEOCODE_COOKIE_MAX_AGE_SEC, GEOCODE_COOKIE_TTL_MS };

export class GeocodeProxySecretMissingError extends Error {
  constructor() {
    super("GEOCODE_PROXY_SECRET is not set");
    this.name = "GeocodeProxySecretMissingError";
  }
}

export function isMissingGeocodeProxySecret(error: unknown): boolean {
  return (
    error instanceof GeocodeProxySecretMissingError ||
    (error instanceof Error &&
      error.message === "GEOCODE_PROXY_SECRET is not set")
  );
}

/** HMAC key for `hp_geo`. Missing secret fails closed; never use Clerk's key. */
export function geocodeProxySecret(): string {
  const secret = process.env.GEOCODE_PROXY_SECRET?.trim() ?? "";
  if (!secret) throw new GeocodeProxySecretMissingError();
  return secret;
}

export type GeocodeSession = {
  sessionId: string;
  expiresAt: number;
  signature: string;
};

/**
 * Mint `sessionId.expiresAt.signature`. The session id is what the shared
 * Convex counter keys on.
 */
export async function mintGeocodeCookieValue(now = Date.now()): Promise<string> {
  const secret = geocodeProxySecret();
  const sessionId = randomUUID();
  const expiresAt = now + GEOCODE_COOKIE_TTL_MS;
  const payload = geocodeSignaturePayload(sessionId, expiresAt);
  const signature = await signGeocodePayload(secret, payload);
  return `${payload}.${signature}`;
}

export async function readGeocodeSession(
  value: string | undefined,
  now = Date.now(),
): Promise<GeocodeSession | null> {
  const secret = geocodeProxySecret();
  if (!value) return null;
  const parts = value.split(".");
  if (parts.length !== 3) return null;
  const [sessionId, expiresAtStr, signature] = parts;
  if (!sessionId || !expiresAtStr || !signature) return null;
  if (!GEOCODE_SESSION_ID_RE.test(sessionId)) return null;
  if (!/^\d+$/.test(expiresAtStr)) return null;
  const expiresAt = Number(expiresAtStr);
  if (!Number.isSafeInteger(expiresAt) || expiresAt < now) return null;
  const payload = geocodeSignaturePayload(sessionId, expiresAtStr);
  const ok = await geocodeSignaturesMatch(secret, payload, signature);
  if (!ok) return null;
  return { sessionId, expiresAt, signature };
}

export async function verifyGeocodeCookieValue(
  value: string | undefined,
  now = Date.now(),
): Promise<boolean> {
  return (await readGeocodeSession(value, now)) !== null;
}
