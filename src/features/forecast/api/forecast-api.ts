import { apiClient } from '@/lib/api-client';
import type { ItemForecast } from '@/types/forecast';

export const forecastApi = {
  getAll(horizon = 14, model: 'statistical' | 'canvas' = 'statistical') {
    return apiClient<ItemForecast[]>(`/api/forecast?horizon=${horizon}&model=${model}`);
  },

  getByUpc(upc: string, horizon = 14) {
    return apiClient<ItemForecast>(
      `/api/forecast?horizon=${horizon}&upc=${encodeURIComponent(upc)}`,
    );
  },
};
