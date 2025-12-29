"use client";

import React from "react";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import * as Sentry from "@sentry/react";
// import { NotificationCountProvider } from '@/context/NotificationCountContext'; // NEW - REMOVED

// Initialize Sentry
// This should be placed at the very top of your application's entry point.
// It's best practice to use environment variables for this.
const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN; // Load from environment variable

if (SENTRY_DSN) { // Initialize only if DSN is provided
  Sentry.init({
    dsn: SENTRY_DSN,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    // Performance Monitoring
    tracesSampleRate: 1.0, //  Capture 100% of the transactions
    // Set 'tracePropagationTargets' to control for which URLs distributed tracing should be enabled
    tracePropagationTargets: ["localhost", /^https:\/\/yourserver\.io\/api/],
    // Session Replay
    replaysSessionSampleRate: 0.1, // This sets the sample rate at 10%. You may want to change it to 100% while in development and then sample at a lower rate in production.
    replaysOnErrorSampleRate: 1.0, // If you're not already sampling the entire session, change the sample rate to 100% when sampling sessions where errors occur.
  });
}


function Providers({ children }: React.PropsWithChildren) {
  const [client] = React.useState(
    new QueryClient({
      defaultOptions: {
        queries: {
          refetchOnWindowFocus: false, // Disables refetching on window focus
        },
      },
    })
  );

  return (
    <Sentry.ErrorBoundary fallback={<p>Une erreur est survenue</p>}>
      <QueryClientProvider client={client}>
        
          {children}
        
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </Sentry.ErrorBoundary>
  );
}

export default Providers;
