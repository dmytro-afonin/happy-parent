import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import {
  GEOCODE_COOKIE,
  GEOCODE_COOKIE_MAX_AGE_SEC,
  isMissingGeocodeProxySecret,
  mintGeocodeCookieValue,
  verifyGeocodeCookieValue,
} from "@/lib/geocode-gate";

export default clerkMiddleware(async (auth, request) => {
  if (request.nextUrl.pathname.startsWith("/admin")) {
    await auth.protect();
  }

  const response = NextResponse.next();

  // Issue a signed cookie carrying a random session id so `/api/geocode`
  // can share one quota across isolates. A missing GEOCODE_PROXY_SECRET
  // fails closed: no cookie is set, and the route refuses the request.
  if (
    request.method === "GET" &&
    !request.nextUrl.pathname.startsWith("/api/")
  ) {
    try {
      const existing = request.cookies.get(GEOCODE_COOKIE)?.value;
      if (!(await verifyGeocodeCookieValue(existing))) {
        const minted = await mintGeocodeCookieValue();
        response.cookies.set(GEOCODE_COOKIE, minted, {
          httpOnly: true,
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
          path: "/",
          maxAge: GEOCODE_COOKIE_MAX_AGE_SEC,
        });
      }
    } catch (error) {
      if (!isMissingGeocodeProxySecret(error)) throw error;
    }
  }

  return response;
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
