import {
  authServerMetadataHandlerClerk,
  metadataCorsOptionsRequestHandler,
} from "@clerk/mcp-tools/next";
import { mcpMetadataConfigError } from "@/lib/mcp-auth";

const NO_STORE = { "Cache-Control": "no-store" };

export async function GET(): Promise<Response> {
  const configError = mcpMetadataConfigError();
  if (configError) {
    return Response.json({ error: configError }, { status: 503, headers: NO_STORE });
  }

  try {
    return await authServerMetadataHandlerClerk()();
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY")) {
      return Response.json(
        { error: "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is not set" },
        { status: 503, headers: NO_STORE },
      );
    }
    return Response.json(
      { error: "Clerk authorization server metadata is unavailable" },
      { status: 503, headers: NO_STORE },
    );
  }
}

export function OPTIONS(): Response {
  return metadataCorsOptionsRequestHandler()();
}
