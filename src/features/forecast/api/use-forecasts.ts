import { useQuery } from '@tanstack/react-query';
import { forecastApi } from './forecast-api';

export function useForecasts(horizon = 14, model: 'statistical' | 'canvas' = 'statistical') {
  return useQuery({
    queryKey: ['forecasts', horizon, model],
    queryFn: () => forecastApi.getAll(horizon, model),
  });
}
