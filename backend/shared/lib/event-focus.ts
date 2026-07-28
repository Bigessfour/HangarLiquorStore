import type { EventFocusTag } from '../types/forecast';

/** Map inventory category / name heuristics to event focus tags. */
export function itemFocusTags(category: string, name: string): EventFocusTag[] {
  const n = name.toLowerCase();
  const tags: EventFocusTag[] = [];
  if (n.includes('ice') || category === 'Ice') tags.push('Ice');
  if (
    category === 'Beer' ||
    category === 'RTD' ||
    n.includes('seltzer') ||
    n.includes('hard tea') ||
    n.includes('rtd')
  ) {
    tags.push('Beer/RTD');
  }
  if (category === 'Spirits' || n.includes('whiskey') || n.includes('vodka') || n.includes('tequila')) {
    tags.push('Spirits');
  }
  if (category === 'Mixers' || category === 'Wine' || n.includes('mixer') || n.includes('soda')) {
    tags.push('Essentials');
  }
  if (tags.length === 0) tags.push('Essentials');
  return tags;
}

export function itemMatchesFocuses(
  category: string,
  name: string,
  focuses?: EventFocusTag[],
): boolean {
  if (!focuses || focuses.length === 0) return true;
  const itemTags = itemFocusTags(category, name);
  return focuses.some((f) => itemTags.includes(f));
}

/**
 * Apply full holiday/event multiplier to focused categories;
 * dampen for non-matching SKUs when focuses are set (local events / holiday planning).
 */
export function focusAdjustedMultiplier(
  baseMultiplier: number,
  category: string,
  name: string,
  focuses?: EventFocusTag[],
): number {
  if (!focuses || focuses.length === 0) return baseMultiplier;
  if (itemMatchesFocuses(category, name, focuses)) return baseMultiplier;
  // Non-focus SKUs still see a light lift (party spillover), not full spike
  return 1 + (baseMultiplier - 1) * 0.25;
}
