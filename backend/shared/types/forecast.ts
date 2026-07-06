export interface ForecastPoint {
  date: string;
  actual?: number;
  predicted: number;
  lower: number;
  upper: number;
}

export type ForecastConfidence = 'high' | 'medium' | 'low';
export type ForecastSource = 'statistical' | 'sagemaker';

export interface ItemForecast {
  upc: string;
  name: string;
  category: string;
  currentStock: number;
  predictedDemand14d: number;
  suggestedOrder: number;
  confidence: ForecastConfidence;
  source: ForecastSource;
  chartData: ForecastPoint[];
}

export interface LocalEvent {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  multiplier: number;
  notes?: string;
}

export interface StaticHoliday {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  multiplier: number;
}

export interface SalesRecord {
  upc: string;
  date: string;
  quantity: number;
}

export interface InventoryRecord {
  upc: string;
  name: string;
  category: string;
  currentStock: number;
}

export interface CreateLocalEventInput {
  name: string;
  startDate: string;
  endDate: string;
  multiplier: number;
  notes?: string;
}

export interface TrendingSuggestion {
  name: string;
  upc: string;
  change: string;
  reason: string;
  suggestedAdd: number;
}