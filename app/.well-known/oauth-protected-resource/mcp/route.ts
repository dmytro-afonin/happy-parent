import {
  metadataCorsOptionsRequestHandler,
  protectedResourceHandlerClerk,
} from "@clerk/mcp-tools/next";
import { MCP_SCOPES, mcpMetadataConfigError, mcpResourceUrl } from "@/lib/mcp-auth";

const NO_STORE = { "Cache-Control": "no-store" };

export function GET(request: Request): Response {
  const configError = mcpMetadataConfigError();
  if (configError) {
    return Response.json({ error: configError }, { status: 503, headers: NO_STORE });
  }
  const resource = mcpResourceUrl();
  if (resource.kind !== "ok") {
    return Response.json(
      { error: resource.message },
      { status: 503, headers: NO_STORE },
    );
  }

  return protectedResourceHandlerClerk({
    resource: resource.url,
    scopes_supported: [...MCP_SCOPES],
  })(request);
}

export function OPTIONS(): Response {
  return metadataCorsOptionsRequestHandler()();
}
