/**
 * Automatic holiday stocking suggestions for expected high-demand periods.
 * Local festivals stay on Manager-created events; national holidays are static.
 */
import type {
  EventFocusTag,
  InventoryRecord,
  ItemForecast,
  LocalEvent,
  StaticHoliday,
} from '../../../shared/types/forecast';
import { itemMatchesFocuses } from '../../../shared/lib/event-focus';
import { getUpcomingHolidays } from './event-multiplier';

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

function daysBetween(from: string, to: string): number {
  const a = new Date(`${from}T12:00:00.000Z`).getTime();
  const b = new Date(`${to}T12:00:00.000Z`).getTime();
  return Math.round((b - a) / 86400000);
}

function holidayWindowDays(holiday: StaticHoliday): number {
  return Math.max(1, daysBetween(holiday.startDate, holiday.endDate) + 1);
}

/**
 * Build stocking recommendations for upcoming static holidays (+ optional local events
 * treated the same way when they have focuses).
 */
export function buildHolidayStockingSuggestions(input: {
  inventory: InventoryRecord[];
  forecasts: ItemForecast[];
  localEvents?: LocalEvent[];
  today?: Date;
  lookAheadDays?: number;
  maxHolidays?: number;
  maxSkusPerHoliday?: number;
}): HolidayStockingSuggestion[] {
  const today = input.today ?? new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const lookAhead = input.lookAheadDays ?? 45;
  const maxHolidays = input.maxHolidays ?? 4;
  const maxSkus = input.maxSkusPerHoliday ?? 5;
  const forecastByUpc = new Map(input.forecasts.map((f) => [f.upc, f]));

  const staticUpcoming = getUpcomingHolidays(today, lookAhead);

  // Local events in the same window (Hay Days, hunting, rodeos) — Manager-owned
  const localAsHolidays: StaticHoliday[] = (input.localEvents ?? [])
    .filter((e) => e.endDate >= todayStr && e.startDate <= (() => {
      const d = new Date(today);
      d.setUTCDate(d.getUTCDate() + lookAhead);
      return d.toISOString().slice(0, 10);
    })())
    .map((e) => ({
      id: e.id,
      name: e.name,
      startDate: e.startDate,
      endDate: e.endDate,
      multiplier: e.multiplier,
      focuses: e.focuses,
      stockingNote:
        e.notes ||
        `Local event ×${e.multiplier} — raise stock on ${
          e.focuses?.length ? e.focuses.join(', ') : 'storewide'
        } categories.`,
    }));

  // Prefer unique by id; static holidays first, then locals not colliding by name
  const seen = new Set<string>();
  const combined: StaticHoliday[] = [];
  for (const h of [...staticUpcoming, ...localAsHolidays]) {
    const key = `${h.name}|${h.startDate}`;
    if (seen.has(key)) continue;
    seen.add(key);
    combined.push(h);
  }

  combined.sort((a, b) => a.startDate.localeCompare(b.startDate));

  const results: HolidayStockingSuggestion[] = [];

  for (const holiday of combined.slice(0, maxHolidays)) {
    const daysUntil = Math.max(0, daysBetween(todayStr, holiday.startDate));
    const windowDays = holidayWindowDays(holiday);
    const focuses = holiday.focuses ?? [];
    const skus: HolidaySkuSuggestion[] = [];

    for (const item of input.inventory) {
      if (!itemMatchesFocuses(item.category, item.name, focuses.length ? focuses : undefined)) {
        continue;
      }
      const forecast = forecastByUpc.get(item.upc);
      const daily =
        forecast && forecast.predictedDemand14d > 0
          ? forecast.predictedDemand14d / 14
          : Math.max(0.3, item.currentStock > 0 ? 0.5 : 0.3);
      const holidayDemand = Math.ceil(daily * holiday.multiplier * windowDays);
      const buffer = Math.ceil(daily * 2);
      const need = Math.max(0, holidayDemand + buffer - item.currentStock);
      if (need < 2) continue;

      skus.push({
        upc: item.upc,
        name: item.name,
        category: item.category,
        suggestedExtraUnits: need,
        reason: `×${holiday.multiplier} ${holiday.name} (~${windowDays}d) — need ~${holidayDemand} units vs ${item.currentStock} on hand.`,
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
        `Expect ~${Math.round((holiday.multiplier - 1) * 100)}% higher demand — stock focused categories early.`,
      suggestedSkus: skus.slice(0, maxSkus),
    });
  }

  return results;
}
