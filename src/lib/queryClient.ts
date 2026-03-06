import { QueryClient } from '@tanstack/react-query';

/**
 * Global React Query client with sensible production defaults.
 * - staleTime: 5 min → data is considered fresh for 5 minutes, so navigating
 *   between pages won't trigger unnecessary re-fetches.
 * - gcTime: 10 min → cached data stays in memory for 10 minutes after the
 *   query becomes unused (e.g. component unmounts).
 * - retry: 2 → automatically retries failed requests twice before surfacing an error.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,   // 5 minutes
      gcTime: 1000 * 60 * 10,     // 10 minutes
      retry: 2,
      refetchOnWindowFocus: false, // don't re-fetch just because user switched tabs
    },
  },
});
