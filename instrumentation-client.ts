// Browser-side Sentry setup. Next.js loads this file automatically
// (it replaces the old sentry.client.config.ts, which Turbopack builds ignore).
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Error reports only: no session replay, and no personal data (IP address,
  // cookies, request bodies) attached to events.
  sendDefaultPii: false,

  // Performance tracing for 10% of page loads is plenty for a small app and
  // keeps usage well inside Sentry's free quota.
  tracesSampleRate: 0.1,

  debug: false,
});

// Lets Sentry time client-side navigations between pages.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
