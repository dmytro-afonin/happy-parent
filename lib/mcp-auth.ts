import { createClerkClient } from "@clerk/nextjs/server";
import { verifyClerkToken } from "@clerk/mcp-tools/server";
import {
  OAuthError,
  OAuthErrorCode,
  type AuthInfo,
} from "@modelcontextprotocol/server";
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import {
  MCP_ROLE_TTL_MS,
  isClerkUserId,
  mcpRolePayload,
  signMcpRolePayload,
  type ClerkUserId,
} from "@/convex/lib/mcpRoleSignature";

export const MCP_RESOURCE_METADATA_PATH =
  "/.well-known/oauth-protected-resource/mcp";

/** Baseline scope. `offline_access` stays off this list; the client requests it. */
export const MCP_SCOPES: readonly ["profile"] = ["profile"];

const ROLE_CHECK_FAILED =
  "MCP role check failed. Confirm MCP_ROLE_SECRET is the same value on this server and on Convex.";

const CONVEX_CONFIG_MESSAGES = [
  "MCP_ROLE_SECRET is not set",
  "CLERK_FRONTEND_API_URL is not set",
  "CLERK_FRONTEND_API_URL must not have a trailing slash",
] as const;

export type McpResourceUrlResult =
  | { kind: "ok"; url: string }
  | { kind: "error"; message: string };

export type McpOauthResult =
  | { kind: "anonymous" }
  | { kind: "invalid" }
  | { kind: "authenticated"; clerkUserId: ClerkUserId; authInfo: AuthInfo };

export function invalidMcpToken(): OAuthError {
  return new OAuthError(OAuthErrorCode.InvalidToken, "Invalid token");
}

function presentedBearer(request: Request): string | undefined {
  const header = request.headers.get("Authorization");
  if (!header) return undefined;
  const [scheme, token] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return undefined;
  return token;
}

export type McpRoleLookup =
  | { kind: "role"; role: "admin" | "user" | null }
  | { kind: "misconfigured"; message: string };

const oauthByRequest = new WeakMap<Request, Promise<McpOauthResult>>();

export function mcpResourceUrl(): McpResourceUrlResult {
  const raw = process.env.MCP_RESOURCE_URL?.trim() ?? "";
  if (!raw) return { kind: "error", message: "MCP_RESOURCE_URL is not set" };

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return {
      kind: "error",
      message:
        "MCP_RESOURCE_URL must be the absolute /mcp URL with no query, hash, or trailing slash",
    };
  }

  const localhost =
    url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (url.protocol === "http:" && !localhost) {
    return {
      kind: "error",
      message:
        "MCP_RESOURCE_URL must use https (http is only allowed for localhost)",
    };
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return {
      kind: "error",
      message:
        "MCP_RESOURCE_URL must be the absolute /mcp URL with no query, hash, or trailing slash",
    };
  }
  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== "/mcp"
  ) {
    return {
      kind: "error",
      message:
        "MCP_RESOURCE_URL must be the absolute /mcp URL with no query, hash, or trailing slash",
    };
  }

  return { kind: "ok", url: url.origin + url.pathname };
}

function clerkKeyError(
  name: "CLERK_SECRET_KEY" | "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
  prefix: "sk_" | "pk_",
): string | null {
  const value = process.env[name]?.trim() ?? "";
  if (!value) return `${name} is not set`;
  if (!value.startsWith(`${prefix}test_`) && !value.startsWith(`${prefix}live_`)) {
    return name === "CLERK_SECRET_KEY"
      ? "CLERK_SECRET_KEY must be a Clerk secret key"
      : "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY must be a Clerk publishable key";
  }
  return null;
}

/** Discovery documents need the resource URL and the Clerk publishable key. */
export function mcpMetadataConfigError(): string | null {
  const problems: string[] = [];
  const resource = mcpResourceUrl();
  if (resource.kind === "error") problems.push(resource.message);
  const publishable = clerkKeyError(
    "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
    "pk_",
  );
  if (publishable) problems.push(publishable);
  return problems.length > 0 ? problems.join("; ") : null;
}

/** The MCP endpoint also needs a secret key, Convex URL, and the role secret. */
export function mcpEndpointConfigError(): string | null {
  const problems: string[] = [];
  const metadata = mcpMetadataConfigError();
  if (metadata) problems.push(metadata);
  const secret = clerkKeyError("CLERK_SECRET_KEY", "sk_");
  if (secret) problems.push(secret);
  if (!process.env.NEXT_PUBLIC_CONVEX_URL?.trim()) {
    problems.push("NEXT_PUBLIC_CONVEX_URL is not set");
  }
  if (!process.env.MCP_ROLE_SECRET?.trim()) {
    problems.push("MCP_ROLE_SECRET is not set");
  }
  return problems.length > 0 ? problems.join("; ") : null;
}

export function mcpResourceMetadataUrl(resourceUrl: string): string {
  return new URL(MCP_RESOURCE_METADATA_PATH, resourceUrl).href;
}

async function verifyMcpOauthUncached(
  request: Request,
  resourceUrl: string,
): Promise<McpOauthResult> {
  if (!presentedBearer(request)) return { kind: "anonymous" };
  try {
    const clerk = createClerkClient({
      secretKey: process.env.CLERK_SECRET_KEY,
      publishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    });
    const requestState = await clerk.authenticateRequest(request, {
      acceptsToken: "oauth_token",
      audience: resourceUrl,
    });
    if (!requestState.isAuthenticated) return { kind: "invalid" };

    const authInfo = verifyClerkToken(requestState.toAuth(), requestState.token);
    if (!authInfo || !isClerkUserId(authInfo.extra.userId)) {
      return { kind: "invalid" };
    }

    return {
      kind: "authenticated",
      clerkUserId: authInfo.extra.userId,
      authInfo: {
        token: authInfo.token,
        clientId: authInfo.clientId,
        scopes: authInfo.scopes,
        extra: { userId: authInfo.extra.userId },
        resourceMetadataUrl: mcpResourceMetadataUrl(resourceUrl),
      },
    };
  } catch {
    return { kind: "invalid" };
  }
}

/** Verifies the OAuth access token. Does not read a browser session. */
export function verifyMcpOauth(
  request: Request,
  resourceUrl: string,
): Promise<McpOauthResult> {
  const cached = oauthByRequest.get(request);
  if (cached) return cached;
  const pending = verifyMcpOauthUncached(request, resourceUrl);
  oauthByRequest.set(request, pending);
  return pending;
}

export function clerkUserIdFromAuthInfo(
  authInfo: AuthInfo | undefined,
): ClerkUserId | undefined {
  const userId = authInfo?.extra?.userId;
  if (typeof userId !== "string" || !isClerkUserId(userId)) return undefined;
  return userId;
}

/**
 * Reads `users.role` for a Clerk user id that was already taken from a
 * verified OAuth token. The bearer is not passed to Convex.
 */
export async function lookupMcpRole(
  clerkUserId: ClerkUserId,
): Promise<McpRoleLookup> {
  const secret = process.env.MCP_ROLE_SECRET?.trim() ?? "";
  if (!secret) {
    return { kind: "misconfigured", message: "MCP_ROLE_SECRET is not set" };
  }
  if (!process.env.NEXT_PUBLIC_CONVEX_URL?.trim()) {
    return {
      kind: "misconfigured",
      message: "NEXT_PUBLIC_CONVEX_URL is not set",
    };
  }

  const expiresAt = Date.now() + MCP_ROLE_TTL_MS;
  const signature = await signMcpRolePayload(
    secret,
    mcpRolePayload(clerkUserId, expiresAt),
  );

  try {
    const result = await fetchQuery(api.mcpAuth.roleForClerkUser, {
      clerkUserId,
      expiresAt,
      signature,
    });
    return { kind: "role", role: result.role };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    for (const known of CONVEX_CONFIG_MESSAGES) {
      if (message.includes(known)) {
        return { kind: "misconfigured", message: known };
      }
    }
    return { kind: "misconfigured", message: ROLE_CHECK_FAILED };
  }
}
