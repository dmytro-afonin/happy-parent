import { createMcpHandler, withMcpAuth } from "mcp-handler";
import { z } from "zod";
import {
  MCP_RESOURCE_METADATA_PATH,
  MCP_SCOPES,
  clerkUserIdFromAuthInfo,
  invalidMcpToken,
  lookupMcpRole,
  mcpEndpointConfigError,
  mcpResourceUrl,
  verifyMcpOauth,
} from "@/lib/mcp-auth";

const NO_STORE = { "Cache-Control": "no-store" };

function misconfigured(message: string): Response {
  return Response.json({ error: message }, { status: 503, headers: NO_STORE });
}

function mcpHandler(resourceUrl: string) {
  const handler = createMcpHandler(
    (server) => {
      server.registerTool(
        "whoami",
        {
          title: "Who am I",
          description:
            "Returns the Happy Parent users.role for the Clerk user in the verified OAuth token. Does not accept a user id.",
          inputSchema: z.object({}),
        },
        async (_args, ctx) => {
          const clerkUserId = clerkUserIdFromAuthInfo(ctx.http?.authInfo);
          if (!clerkUserId) {
            return {
              isError: true,
              content: [{ type: "text", text: "Admin required" }],
            };
          }
          const lookup = await lookupMcpRole(clerkUserId);
          if (lookup.kind === "misconfigured") {
            return {
              isError: true,
              content: [{ type: "text", text: lookup.message }],
            };
          }
          if (lookup.role !== "admin") {
            return {
              isError: true,
              content: [{ type: "text", text: "Admin required" }],
            };
          }
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({ role: lookup.role, clerkUserId }),
              },
            ],
          };
        },
      );
    },
    {
      serverInfo: { name: "happy-parent", version: "0.1.0" },
      instructions:
        "Happy Parent admin MCP. Sign in once with Clerk OAuth; the client refreshes the access token. whoami reads users.role in Convex.",
      maxSubscriptions: 0,
    },
  );

  return withMcpAuth(
    handler,
    async (request) => {
      const oauth = await verifyMcpOauth(request, resourceUrl);
      if (oauth.kind === "invalid") throw invalidMcpToken();
      if (oauth.kind !== "authenticated") return undefined;
      return oauth.authInfo;
    },
    {
      required: true,
      requiredScopes: [...MCP_SCOPES],
      resourceUrl: new URL(resourceUrl).origin,
      resourceMetadataPath: MCP_RESOURCE_METADATA_PATH,
    },
  );
}

async function handleMcp(request: Request): Promise<Response> {
  const configError = mcpEndpointConfigError();
  if (configError) return misconfigured(configError);

  const resource = mcpResourceUrl();
  if (resource.kind !== "ok") return misconfigured(resource.message);

  const oauth = await verifyMcpOauth(request, resource.url);
  if (oauth.kind === "authenticated") {
    const lookup = await lookupMcpRole(oauth.clerkUserId);
    if (lookup.kind === "misconfigured") return misconfigured(lookup.message);
    if (lookup.role !== "admin") {
      return Response.json(
        { error: "Admin required" },
        { status: 403, headers: NO_STORE },
      );
    }
  }

  return mcpHandler(resource.url)(request);
}

export function GET(request: Request): Promise<Response> {
  return handleMcp(request);
}

export function POST(request: Request): Promise<Response> {
  return handleMcp(request);
}

export function DELETE(request: Request): Promise<Response> {
  return handleMcp(request);
}
