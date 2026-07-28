/**
 * Client-side holiday stocking suggestions (mirrors backend engine).
 * Uses static holidays + local events from /api/events and live forecasts.
 */
import type {
  EventFocusTag,
  InventoryRecord,
  ItemForecast,
  LocalEvent,
  StaticHoliday,
} from '@/types/forecast';

export interface HolidaySkuSuggestion {
  upc: string;
  name: string;
  category: string;
  suggestedExtraUnits: number;
  reason: string;
}

export interface HolidayStockingSuggestion {
  holidayId: string;
  holidayName: string;
  startDate: string;
  endDate: string;
  multiplier: number;
  daysUntil: number;
  focuses: EventFocusTag[];
  stockingNote: string;
  suggestedSkus: HolidaySkuSuggestion[];
}

function itemFocusTags(category: string, name: string): EventFocusTag[] {
  const n = name.toLowerCase();
  const tags: EventFocusTag[] = [];
  if (n.includes('ice') || category === 'Ice') tags.push('Ice');
  if (
    category === 'Beer' ||
    category === 'RTD' ||
    /seltzer|hard tea|\brtd\b/i.test(n)
  ) {
    tags.push('Beer/RTD');
  }
  if (category === 'Spirits' || /whiskey|vodka|tequila|bourbon/i.test(n)) {
    tags.push('Spirits');
  }
  if (category === 'Mixers' || category === 'Wine' || /mixer|soda|wine/i.test(n)) {
    tags.push('Essentials');
  }
  if (tags.length === 0) tags.push('Essentials');
  return tags;
}

function matchesFocus(category: string, name: string, focuses?: EventFocusTag[]): boolean {
  if (!focuses || focuses.length === 0) return true;
  const tags = itemFocusTags(category, name);
  return focuses.some((f) => tags.includes(f));
}

function daysBetween(from: string, to: string): number {
  const a = new Date(`${from}T12:00:00.000Z`).getTime();
  const b = new Date(`${to}T12:00:00.000Z`).getTime();
  return Math.round((b - a) / 86400000);
}

export function buildHolidayStockingSuggestions(input: {
  inventory: Array<Pick<InventoryRecord, 'upc' | 'name' | 'category' | 'currentStock'>>;
  forecasts: ItemForecast[];
  staticHolidays: StaticHoliday[];
  localEvents?: LocalEvent[];
  today?: Date;
  lookAheadDays?: number;
  maxHolidays?: number;
  maxSkusPerHoliday?: number;
}): HolidayStockingSuggestion[] {
  const today = input.today ?? new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const lookAhead = input.lookAheadDays ?? 45;
  const end = new Date(today);
  end.setUTCDate(end.getUTCDate() + lookAhead);
  const endStr = end.toISOString().slice(0, 10);
  const maxHolidays = input.maxHolidays ?? 4;
  const maxSkus = input.maxSkusPerHoliday ?? 5;
  const forecastByUpc = new Map(input.forecasts.map((f) => [f.upc, f]));

  const fromStatic = input.staticHolidays.filter(
    (h) => h.endDate >= todayStr && h.startDate <= endStr,
  );
  const fromLocal: StaticHoliday[] = (input.localEvents ?? [])
    .filter((e) => e.endDate >= todayStr && e.startDate <= endStr)
    .map((e) => ({
      id: e.id,
      name: e.name,
      startDate: e.startDate,
      endDate: e.endDate,
      multiplier: e.multiplier,
      focuses: e.focuses,
      stockingNote:
        e.notes ||
        `Local event ×${e.multiplier} — raise ${e.focuses?.join(', ') || 'storewide'} stock.`,
    }));

  const seen = new Set<string>();
  const combined: StaticHoliday[] = [];
  for (const h of [...fromStatic, ...fromLocal]) {
    const key = `${h.name}|${h.startDate}`;
    if (seen.has(key)) continue;
    seen.add(key);
    combined.push(h);
  }
  combined.sort((a, b) => a.startDate.localeCompare(b.startDate));

  const results: HolidayStockingSuggestion[] = [];

  for (const holiday of combined.slice(0, maxHolidays)) {
    const daysUntil = Math.max(0, daysBetween(todayStr, holiday.startDate));
    const windowDays = Math.max(1, daysBetween(holiday.startDate, holiday.endDate) + 1);
    const focuses = holiday.focuses ?? [];
    const skus: HolidaySkuSuggestion[] = [];

    for (const item of input.inventory) {
      if (!matchesFocus(item.category, item.name, focuses.length ? focuses : undefined)) continue;
      const forecast = forecastByUpc.get(item.upc);
      const daily =
        forecast && forecast.predictedDemand14d > 0
          ? forecast.predictedDemand14d / 14
          : 0.4;
      const holidayDemand = Math.ceil(daily * holiday.multiplier * windowDays);
      const need = Math.max(0, holidayDemand + Math.ceil(daily * 2) - item.currentStock);
      if (need < 2) continue;
      skus.push({
        upc: item.upc,
        name: item.name,
        category: item.category,
        suggestedExtraUnits: need,
        reason: `×${holiday.multiplier} for ${holiday.name} — ~${holidayDemand} needed vs ${item.currentStock} on hand.`,
      });
    }

    skus.sort((a, b) => b.suggestedExtraUnits - a.suggestedExtraUnits);
    results.push({
      holidayId: holiday.id,
      holidayName: holiday.name,
      startDate: holiday.startDate,
      endDate: holiday.endDate,
      multiplier: holiday.multiplier,
      daysUntil,
      focuses,
      stockingNote:
        holiday.stockingNote ||
        `Expect ~${Math.round((holiday.multiplier - 1) * 100)}% higher demand — stock early.`,
      suggestedSkus: skus.slice(0, maxSkus),
    });
  }

  return results;
}
