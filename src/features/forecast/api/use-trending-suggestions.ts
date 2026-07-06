import { useQuery } from '@tanstack/react-query';
import { forecastApi } from './forecast-api';

export function useTrendingSuggestions() {
  return useQuery({
    queryKey: ['trending-suggestions'],
    queryFn: () => forecastApi.getTrending(),
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}
