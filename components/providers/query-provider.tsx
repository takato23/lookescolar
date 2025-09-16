'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, Suspense, lazy } from 'react';

// Lazy load ReactQueryDevtools to avoid chunk loading issues
const ReactQueryDevtools = lazy(() =>
  import('@tanstack/react-query-devtools').then((module) => ({
    default: module.ReactQueryDevtools,
  }))
);

// Devtools wrapper component with error boundary
function DevtoolsWrapper() {
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }
  // Avoid chunk/HMR issues when the page is opened on :3001 without a dev server there
  if (typeof window !== 'undefined' && window.location.origin.includes('localhost:3001')) {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <ReactQueryDevtools initialIsOpen={false} />
    </Suspense>
  );
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            gcTime: 5 * 60 * 1000, // 5 minutes (previously cacheTime)
            retry: (failureCount, error) => {
              // Don't retry on 4xx errors except 429
              if (
                error instanceof Response &&
                error.status >= 400 &&
                error.status < 500 &&
                error.status !== 429
              ) {
                return false;
              }
              return failureCount < 3;
            },
            retryDelay: (attemptIndex) =>
              Math.min(1000 * 2 ** attemptIndex, 30000),
            refetchOnWindowFocus: false,
            networkMode: 'online', // Only fetch when online
          },
          mutations: {
            retry: false, // Don't retry mutations by default
            networkMode: 'online',
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <DevtoolsWrapper />
    </QueryClientProvider>
  );
}
