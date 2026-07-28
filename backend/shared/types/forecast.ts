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
  /** Planning focus for ice, beer, spirits, essentials (Manager event planning). */
  focuses?: EventFocusTag[];
}

/** Demand-planning chips for local events (Hay Days, festivals, etc.). */
export type EventFocusTag = 'Ice' | 'Beer/RTD' | 'Spirits' | 'Essentials';

export const EVENT_FOCUS_TAGS: EventFocusTag[] = ['Ice', 'Beer/RTD', 'Spirits', 'Essentials'];

export interface StaticHoliday {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  multiplier: number;
  /** Category focus for automatic holiday stocking suggestions. */
  focuses?: EventFocusTag[];
  /** Plain-English stocking guidance for managers. */
  stockingNote?: string;
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
  reorderPoint?: number;
  /** Shelf price in dollars when known (e.g. Square catalog). */
  unitPrice?: number;
  /** Unit cost in dollars when known (Square cost or derived from price × margin). */
  unitCost?: number;
}

export interface CreateLocalEventInput {
  name: string;
  startDate: string;
  endDate: string;
  multiplier: number;
  notes?: string;
  focuses?: EventFocusTag[];
}

export interface TrendingSuggestion {
  name: string;
  upc: string;
  change: string;
  reason: string;
  suggestedAdd: number;
}
