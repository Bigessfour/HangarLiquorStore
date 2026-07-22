export type ProfitPeriod = 'day' | 'month' | 'year';

export type ProfitProvenance =
  'demo_proxy' | 'square_sync' | 'statistical' | 'sagemaker' | 'hybrid';

export interface CategoryMixSlice {
  category: string;
  salesDollars: number;
  units: number;
  sharePct: number;
}

export interface OptimizationRecommendation {
  upc: string;
  name: string;
  action: 'order' | 'hold' | 'promote';
  dollarsImpact: number;
  reason: string;
  daysOfCover?: number;
  excessUnits?: number;
  /** Overstock $ currently tied up for this SKU */
  cashTiedUp?: number;
  limitedHistory?: boolean;
}

export interface OptimizationImpact {
  dollarsSaved: number;
  dollarsMade: number;
  confidence: 'high' | 'medium' | 'low';
  provenance: ProfitProvenance;
  explanation: string;
  recommendations: OptimizationRecommendation[];
}

export interface ProfitOpsSnapshot {
  period: ProfitPeriod;
  periodLabel: string;
  generatedAt: string;
  isProxy: boolean;
  pulse: {
    salesDollars: number;
    marginPct: number;
    lowStockCount: number;
    daysOfSupply: number;
    unitsSold: number;
    avgBasketDollars: number | null;
  };
  categoryMix: CategoryMixSlice[];
  health: {
    lowStockItems: Array<{ upc: string; name: string; currentStock: number; reorderPoint: number }>;
    turnsPerYear: number | null;
  };
  optimization: OptimizationImpact;
  squareConnected: boolean;
  squareLastSyncAt: string | null;
}

export interface AssistantChatRequest {
  message: string;
  period?: ProfitPeriod;
}

export interface AssistantChatResponse {
  reply: string;
  citations: string[];
  source: 'bedrock' | 'grounded_fallback' | 'demo';
}
