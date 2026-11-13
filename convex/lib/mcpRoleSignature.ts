/** HMAC proof for the MCP admin-role lookup. No Node built-ins. */

export const MCP_ROLE_TTL_MS = 30_000;
export const MCP_ROLE_MAX_TTL_MS = 60_000;
export const MCP_ROLE_CLOCK_SKEW_MS = 15_000;

const CLERK_USER_ID_RE = /^user_[0-9A-Za-z]{8,64}$/;

export type ClerkUserId = string & { readonly __brand: "ClerkUserId" };

export function isClerkUserId(input: string): input is ClerkUserId {
  return CLERK_USER_ID_RE.test(input);
}

export function mcpRolePayload(clerkUserId: string, expiresAt: number): string {
  return `${clerkUserId}.${expiresAt}`;
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

export async function signMcpRolePayload(
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

function timingSafeEqualStrings(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

export async function assertMcpRoleProof(
  args: { clerkUserId: string; expiresAt: number; signature: string },
  now = Date.now(),
): Promise<void> {
  const secret = process.env.MCP_ROLE_SECRET?.trim() ?? "";
  if (!secret) throw new Error("MCP_ROLE_SECRET is not set");
  if (!isClerkUserId(args.clerkUserId)) throw new Error("Invalid MCP role proof");
  if (!Number.isSafeInteger(args.expiresAt)) {
    throw new Error("Invalid MCP role proof");
  }
  if (
    args.expiresAt < now - MCP_ROLE_CLOCK_SKEW_MS ||
    args.expiresAt > now + MCP_ROLE_MAX_TTL_MS
  ) {
    throw new Error("Invalid MCP role proof");
  }
  if (!args.signature || args.signature.length > 128) {
    throw new Error("Invalid MCP role proof");
  }
  const expected = await signMcpRolePayload(
    secret,
    mcpRolePayload(args.clerkUserId, args.expiresAt),
  );
  if (!timingSafeEqualStrings(expected, args.signature)) {
    throw new Error("Invalid MCP role proof");
  }
}
