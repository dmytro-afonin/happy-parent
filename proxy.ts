import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import {
  GEOCODE_COOKIE,
  mintGeocodeCookieValue,
  verifyGeocodeCookieValue,
} from "@/lib/geocode-gate";

export default clerkMiddleware(async (auth, request) => {
  if (request.nextUrl.pathname.startsWith("/admin")) {
    await auth.protect();
  }

  const response = NextResponse.next();

  // Issue a short-lived signed cookie so `/api/geocode` is not an open proxy.
  // Browsers that load the app receive it; raw unauthenticated scrapers do not.
  if (
    request.method === "GET" &&
    !request.nextUrl.pathname.startsWith("/api/")
  ) {
    const existing = request.cookies.get(GEOCODE_COOKIE)?.value;
    if (!verifyGeocodeCookieValue(existing)) {
      const minted = mintGeocodeCookieValue();
      if (minted) {
        response.cookies.set(GEOCODE_COOKIE, minted, {
          httpOnly: true,
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
          path: "/",
          maxAge: 12 * 60 * 60,
        });
      }
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
