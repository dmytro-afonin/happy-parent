import posthog from "posthog-js";
import * as Sentry from "@sentry/nextjs";

const sentryDsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    tracesSampleRate: 0.1,
  });
}

const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST;
if (posthogKey) {
  posthog.init(posthogKey, {
    api_host: posthogHost || "https://eu.i.posthog.com",
    capture_pageview: true,
    persistence: "localStorage+cookie",
  });
}
