import { apiClient } from '@/lib/api-client';
import type { ItemForecast } from '@/types/forecast';

const MOCK_FORECASTS: ItemForecast[] = [
  {
    upc: '018200000103',
    name: 'Bud Light 12pk 12oz Cans',
    category: 'Beer',
    currentStock: 5,
    predictedDemand14d: 68,
    suggestedOrder: 12,
    confidence: 'high',
    source: 'statistical',
    chartData: Array.from({ length: 14 }, (_, i) => ({
      date: `2026-07-${String(6 + i).padStart(2, '0')}`,
      actual: i < 5 ? 4 + Math.floor(Math.random() * 2) : undefined,
      predicted: 4 + (i % 3),
      lower: 2,
      upper: 7,
    })),
  },
  {
    upc: '082184000012',
    name: "Jack Daniel's Tennessee Whiskey 750ml",
    category: 'Spirits',
    currentStock: 3,
    predictedDemand14d: 11,
    suggestedOrder: 6,
    confidence: 'high',
    source: 'statistical',
    chartData: Array.from({ length: 14 }, (_, i) => ({
      date: `2026-07-${String(6 + i).padStart(2, '0')}`,
      actual: i < 3 ? 1 : undefined,
      predicted: 0.7 + (i % 2) * 0.1,
      lower: 0,
      upper: 2,
    })),
  },
  {
    upc: '619947000011',
    name: "Tito's Handmade Vodka 1L",
    category: 'Spirits',
    currentStock: 22,
    predictedDemand14d: 19,
    suggestedOrder: 0,
    confidence: 'medium',
    source: 'statistical',
    chartData: Array.from({ length: 14 }, (_, i) => ({
      date: `2026-07-${String(6 + i).padStart(2, '0')}`,
      actual: 1 + (i % 2),
      predicted: 1.3,
      lower: 0.5,
      upper: 2.5,
    })),
  },
  {
    upc: '071984000012',
    name: 'Coors Light 12pk 12oz Cans',
    category: 'Beer',
    currentStock: 48,
    predictedDemand14d: 29,
    suggestedOrder: 0,
    confidence: 'medium',
    source: 'statistical',
    chartData: Array.from({ length: 14 }, (_, i) => ({
      date: `2026-07-${String(6 + i).padStart(2, '0')}`,
      actual: 2 + Math.floor(i / 4),
      predicted: 2,
      lower: 1,
      upper: 3.5,
    })),
  },
];

function useMockApi(): boolean {
  return !import.meta.env.VITE_API_URL;
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export const forecastApi = {
  async getAll(horizon = 14, model: 'statistical' | 'canvas' = 'statistical') {
    if (useMockApi()) {
      await delay(280);
      // Return copy so consumers don't mutate shared mock
      return MOCK_FORECASTS.map((f) => ({
        ...f,
        chartData: f.chartData.map((p) => ({ ...p })),
      }));
    }
    return apiClient<ItemForecast[]>(`/api/forecast?horizon=${horizon}&model=${model}`);
  },

  async getByUpc(upc: string, horizon = 14) {
    if (useMockApi()) {
      await delay(120);
      const found = MOCK_FORECASTS.find((f) => f.upc === upc);
      if (!found) return null as any; // maintain prior behavior for not-found
      return { ...found, chartData: found.chartData.map((p) => ({ ...p })) };
    }
    return apiClient<ItemForecast>(
      `/api/forecast?horizon=${horizon}&upc=${encodeURIComponent(upc)}`,
    );
  },
};
