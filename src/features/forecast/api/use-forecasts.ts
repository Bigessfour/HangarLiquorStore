import { useQuery } from '@tanstack/react-query';
import { forecastApi } from './forecast-api';

export function useForecasts(horizon = 14) {
  return useQuery({
    queryKey: ['forecasts', horizon],
    queryFn: () => forecastApi.getAll(horizon),
  });
}