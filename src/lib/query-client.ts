import { QueryClient } from '@tanstack/react-query';
import { ApiError } from '@/lib/api-client';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (failureCount, error) => {
        // Don't retry auth failures — refresh already ran in apiClient
        if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
          return false;
        }
        return failureCount < 1;
      },
    },
  },
});
