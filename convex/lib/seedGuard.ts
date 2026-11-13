/**
 * Production Convex deployment (Vercel production builds push here).
 * `seed:run` and `seed:clearDemo` refuse this host.
 * If production is ever replaced, update this constant or the guard
 * will not recognize the new deployment.
 */
export const PRODUCTION_CONVEX_HOST = "calculating-lark-523.convex.cloud";

export function assertDemoSeedAllowed(cloudUrl: string | undefined): void {
  if (!cloudUrl || cloudUrl.trim() === "") {
    throw new Error(
      "Refusing demo seed: CONVEX_CLOUD_URL is missing, so this deployment is not a known dev or preview target.",
    );
  }
  let host: string;
  try {
    host = new URL(cloudUrl).host;
  } catch {
    throw new Error("Refusing demo seed: CONVEX_CLOUD_URL is not a valid URL.");
  }
  if (host === PRODUCTION_CONVEX_HOST) {
    throw new Error(
      `Refusing demo seed on production (${PRODUCTION_CONVEX_HOST}). seed:run and seed:clearDemo do not run there.`,
    );
  }
}
