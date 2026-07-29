export type ProfitPeriod = 'day' | 'month' | 'year';

export type ProfitProvenance =
  | 'demo_proxy'
  | 'square_sync'
  | 'statistical'
  | 'sagemaker'
  | 'hybrid';

export type ForecastLearningBasis =
  | 'demo_simulation'
  | 'inventory_proxy'
  | 'square_sales';

/** Honest owner messaging: data since date + illustrative learning curve */
export interface ForecastLearningStatus {
  basis: ForecastLearningBasis;
  salesDataSince: string | null;
  monthsOfHistory: number;
  expectedImprovementPctPerMonth: number;
  illustrativeAccuracyPct: number;
  illustrativeAccuracyNextMonthPct: number;
  holidaysWithActuals: number;
  pastHolidaysOnCalendar: number;
  plainEnglish: string;
}

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

export interface VelocityMover {
  upc: string;
  name: string;
  unitsPerDay: number;
  daysOfCover: number | null;
  cashTiedUp?: number;
  action?: OptimizationRecommendation['action'];
}

export interface ActiveEventLift {
  name: string;
  multiplier: number;
  startDate: string;
  endDate: string;
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
    trend?: { sales7d: number; salesPrior7d: number; pctChange: number } | null;
  };
  categoryMix: CategoryMixSlice[];
  health: {
    lowStockItems: Array<{
      upc: string;
      name: string;
      currentStock: number;
      reorderPoint: number;
      daysOfCover?: number | null;
    }>;
    turnsPerYear: number | null;
    fastMovers: VelocityMover[];
    slowMovers: VelocityMover[];
    velocitySummary: {
      avgDaysOfCover: number;
      itemsUnder7d: number;
      itemsOver45d: number;
    };
  };
  activeEvents: ActiveEventLift[];
  optimization: OptimizationImpact;
  squareConnected: boolean;
  squareLastSyncAt: string | null;
  /** How much real sales history backs the numbers + expected improvement */
  learning: ForecastLearningStatus;
}

export interface AssistantChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface AssistantDeepLink {
  type: 'sku' | 'route';
  label: string;
  upc?: string;
  path?: string;
}

export interface AssistantChatResponse {
  reply: string;
  citations: string[];
  source: 'bedrock' | 'grounded_fallback' | 'demo';
  deepLinks?: AssistantDeepLink[];
}
