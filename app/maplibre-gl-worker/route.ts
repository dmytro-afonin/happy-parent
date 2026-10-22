import { readFileSync } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export function GET() {
  const workerPath = path.join(
    process.cwd(),
    "node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs",
  );
  const body = readFileSync(workerPath);

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
