import type {
  AssistantChatResponse,
  AssistantChatTurn,
  AssistantDeepLink,
  OptimizationRecommendation,
  ProfitOpsSnapshot,
  ProfitPeriod,
} from '../../../shared/types/profit';

/** Strip control chars / truncate so event names cannot overwhelm the model context. */
function sanitizeEventLine(line: string): string {
  return line
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);
}

export const APP_KNOWLEDGE = `
Hangar Liquor (Wiley, CO) — RuralStock PWA:
- Floating Scan button opens camera barcode scan. On laptop use photo or type UPC. Offline scans queue and sync when online.
- Bottom nav: Home | Scan | Inventory | Forecast | Suggestions | Profit | More.
- Dashboard (Home): stock overview, low-stock alerts, holiday tip, Ask Hangar tip → Profit.
- Inventory: search/filter/edit; Managers can CSV import and add products.
- Events: add local events (Hay Days, hunting, rodeos) with multipliers; national holidays auto-lift demand.
- Forecast: 14-day demand with weekday + event/holiday multipliers (lightweight Lambda stats).
- Suggestions: reorder ideas + holiday stocking with Add to Stock.
- Profit & Ops (Manager+): Saved/Made, category mix, Ask Hangar chat grounded in Hangar numbers.
- Square: More → Connect Square → Sync for live register $. Until then numbers are inventory + forecast proxies.
- Offline: service worker queues scans; look for queued status, then auto-sync on reconnect.
`.trim();

export type AssistantIntent =
  | 'order'
  | 'overstock'
  | 'sales_pulse'
  | 'event'
  | 'sku_detail'
  | 'category'
  | 'how_to'
  | 'square'
  | 'learning'
  | 'money'
  | 'general';

function matchesAny(q: string, phrases: string[]): boolean {
  return phrases.some((p) => q.includes(p));
}

export function classifyIntent(q: string): AssistantIntent {
  if (
    matchesAny(q, [
      'how do i',
      'where is',
      'how to',
      'open scan',
      'scanner',
      'offline',
      'queue',
      'bottom nav',
      'install',
      'pwa',
      'camera',
      'where do i',
      'what screen',
      'navigate',
    ])
  ) {
    return 'how_to';
  }
  if (
    matchesAny(q, [
      'hay days',
      'event',
      'festival',
      'holiday',
      'christmas',
      'thanksgiving',
      'new year',
      'july 4',
      'memorial',
      'labor day',
      'halloween',
      'hunting',
      'rodeo',
      'stock for',
    ])
  ) {
    return 'event';
  }
  if (
    matchesAny(q, ['overstock', 'cash tied', 'tied up', 'slow mover', 'dead stock', 'sitting on'])
  ) {
    return 'overstock';
  }
  if (matchesAny(q, ['order', 'reorder', 'buy', 'stock up', 'this week', 'what should i order'])) {
    return 'order';
  }
  if (matchesAny(q, ['made', 'saved', 'money', 'pocket', 'cash in'])) {
    return 'money';
  }
  if (matchesAny(q, ['sell', 'sales', 'pulse', 'how are we', 'how we doing', 'doing today'])) {
    return 'sales_pulse';
  }
  if (matchesAny(q, ['square', 'live sales', 'register', 'real sales'])) {
    return 'square';
  }
  if (
    matchesAny(q, ['improv', 'accuracy', 'how long', 'history', 'learning', 'data since', 'forecasts improve'])
  ) {
    return 'learning';
  }
  if (matchesAny(q, ['beer', 'spirit', 'vodka', 'whiskey', 'whisky', 'bourbon', 'wine', 'rtd', 'category mix'])) {
    return 'category';
  }
  return 'general';
}

const SKU_ALIASES: Record<string, string[]> = {
  coors: ['coors'],
  "tito's": ['tito', 'titos'],
  tito: ['tito', 'titos'],
  crown: ['crown'],
  'bud light': ['bud light', 'budlight'],
  bud: ['bud light', 'bud'],
  jack: ['jack daniel', 'jack daniels', "jack daniel's"],
  whiskey: ['whiskey', 'whisky', 'jack', 'bourbon'],
};

function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .replace(/['']/g, "'")
    .replace(/[^a-z0-9\s']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function lastMentionedSkuFromHistory(
  history: AssistantChatTurn[] | undefined,
  snapshot: ProfitOpsSnapshot,
): ReturnType<typeof findSkuMention> {
  if (!history?.length) return null;
  const recent = [...history].reverse().slice(0, 4);
  for (const turn of recent) {
    const hit = findSkuMention(normalizeText(turn.content), snapshot);
    if (hit) return hit;
  }
  return null;
}

function buildContextPack(
  snapshot: ProfitOpsSnapshot,
  eventsSummary: string[],
  history?: AssistantChatTurn[],
): string {
  const safeEvents = eventsSummary.map(sanitizeEventLine).filter(Boolean).slice(0, 5);
  const recs = snapshot.optimization.recommendations
    .filter((r) => r.upc !== 'event')
    .slice(0, 6)
    .map((r) => ({
      upc: r.upc,
      name: r.name,
      action: r.action,
      dollarsImpact: r.dollarsImpact,
      daysOfCover: r.daysOfCover ?? null,
      cashTiedUp: r.cashTiedUp ?? 0,
      reason: r.reason.slice(0, 120),
    }));

  return JSON.stringify(
    {
      period: snapshot.periodLabel,
      salesDollars: snapshot.pulse.salesDollars,
      marginPct: snapshot.pulse.marginPct,
      lowStockCount: snapshot.pulse.lowStockCount,
      daysOfSupply: snapshot.pulse.daysOfSupply,
      saved: snapshot.optimization.dollarsSaved,
      made: snapshot.optimization.dollarsMade,
      categoryMix: snapshot.categoryMix.slice(0, 6),
      lowStock: snapshot.health.lowStockItems.slice(0, 5),
      recommendations: recs,
      fastMovers: snapshot.health.fastMovers?.slice(0, 4) ?? [],
      slowMovers: snapshot.health.slowMovers?.slice(0, 4) ?? [],
      velocitySummary: snapshot.health.velocitySummary,
      recentTrend: snapshot.pulse.trend ?? null,
      activeMultipliers: snapshot.activeEvents?.slice(0, 3) ?? [],
      events: safeEvents,
      lastSync: {
        square: snapshot.squareLastSyncAt,
      },
      featureStatus: {
        squareConnected: snapshot.squareConnected,
        forecastReady: (snapshot.learning?.monthsOfHistory ?? 0) > 0,
        isProxy: snapshot.isProxy,
      },
      learning: snapshot.learning
        ? {
            basis: snapshot.learning.basis,
            salesDataSince: snapshot.learning.salesDataSince,
            monthsOfHistory: snapshot.learning.monthsOfHistory,
            expectedImprovementPctPerMonth: snapshot.learning.expectedImprovementPctPerMonth,
            illustrativeAccuracyPct: snapshot.learning.illustrativeAccuracyPct,
            holidaysWithActuals: snapshot.learning.holidaysWithActuals,
          }
        : null,
      recentTurns: (history ?? [])
        .slice(-4)
        .map((t) => ({ role: t.role, content: t.content.slice(0, 280) })),
    },
    null,
    0,
  );
}

function extractDollarAmounts(text: string): number[] {
  const amounts: number[] = [];
  const re = /\$\s*([\d,]+(?:\.\d+)?)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    amounts.push(Number(match[1].replace(/,/g, '')));
  }
  return amounts.filter((n) => Number.isFinite(n));
}

function extractCoverDays(text: string): number[] {
  const amounts: number[] = [];
  const re = /~?(\d+)\s*d(?:ays?)?(?:\s+cover|\s+of\s+supply|\s+supply)?/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    amounts.push(Number(match[1]));
  }
  return amounts.filter((n) => Number.isFinite(n));
}

/** Reject Bedrock replies that invent dollars or cover/stock figures outside the snapshot. */
function bedrockReplyIsGrounded(reply: string, snapshot: ProfitOpsSnapshot): boolean {
  const allowedDollars = new Set(
    [
      snapshot.pulse.salesDollars,
      snapshot.optimization.dollarsSaved,
      snapshot.optimization.dollarsMade,
      ...snapshot.categoryMix.map((c) => c.salesDollars),
      ...snapshot.optimization.recommendations.map((r) => r.dollarsImpact),
      ...snapshot.optimization.recommendations.map((r) => r.cashTiedUp ?? 0),
    ].map((n) => Math.round(n)),
  );

  const claimed = extractDollarAmounts(reply);
  const dollarsOk =
    claimed.length === 0 ||
    claimed.every((n) => {
      const rounded = Math.round(n);
      if (allowedDollars.has(rounded)) return true;
      return [...allowedDollars].some((a) => Math.abs(a - rounded) <= Math.max(1, a * 0.02));
    });
  if (!dollarsOk) return false;

  const allowedCovers = new Set(
    [
      snapshot.pulse.daysOfSupply,
      ...snapshot.optimization.recommendations.map((r) => r.daysOfCover ?? -1),
      ...snapshot.health.lowStockItems.map((l) => l.daysOfCover ?? -1),
      ...snapshot.health.fastMovers.map((m) => m.daysOfCover ?? -1),
      ...snapshot.health.slowMovers.map((m) => m.daysOfCover ?? -1),
      ...snapshot.health.lowStockItems.map((l) => l.currentStock),
      ...snapshot.health.lowStockItems.map((l) => l.reorderPoint),
    ].filter((n) => n >= 0),
  );

  const covers = extractCoverDays(reply);
  if (covers.length === 0) return true;
  return covers.every((n) => {
    if (allowedCovers.has(n)) return true;
    return [...allowedCovers].some((a) => Math.abs(a - n) <= Math.max(1, a * 0.05));
  });
}

function skuRecs(snapshot: ProfitOpsSnapshot): OptimizationRecommendation[] {
  return snapshot.optimization.recommendations.filter((r) => r.upc !== 'event');
}

function formatRecLine(r: OptimizationRecommendation): string {
  const cover = r.daysOfCover != null ? `, ~${r.daysOfCover}d cover` : '';
  const tied = r.cashTiedUp != null && r.cashTiedUp > 0 ? `, $${r.cashTiedUp} tied up` : '';
  return `${r.action} ${r.name} (~$${r.dollarsImpact}${cover}${tied}) — ${r.reason}`;
}

function topByAction(
  recs: OptimizationRecommendation[],
  action: OptimizationRecommendation['action'],
  n = 3,
): OptimizationRecommendation[] {
  return [...recs]
    .filter((r) => r.action === action)
    .sort((a, b) => b.dollarsImpact - (a.dollarsImpact || 0))
    .slice(0, n);
}

function overstockSorted(recs: OptimizationRecommendation[]): OptimizationRecommendation[] {
  return [...recs]
    .filter(
      (r) =>
        (r.cashTiedUp ?? 0) > 0 ||
        r.action === 'hold' ||
        (r.action === 'promote' && (r.cashTiedUp ?? 0) > 0),
    )
    .sort((a, b) => (b.cashTiedUp ?? b.dollarsImpact) - (a.cashTiedUp ?? a.dollarsImpact));
}

function proxyPrefix(snapshot: ProfitOpsSnapshot): string {
  if (!snapshot.isProxy && snapshot.squareConnected) return '';
  const sync = snapshot.squareLastSyncAt
    ? ` last Square sync ${snapshot.squareLastSyncAt.slice(0, 10)}`
    : '';
  if (!snapshot.squareConnected) {
    return `Using inventory + forecast estimates (Square not connected${sync}). `;
  }
  return `Using inventory + forecast estimates (proxy data${sync}). `;
}

function withProxy(
  snapshot: ProfitOpsSnapshot,
  reply: string,
  citations: string[],
  deepLinks?: AssistantDeepLink[],
): AssistantChatResponse {
  const prefixed = `${proxyPrefix(snapshot)}${reply}`.trim();
  return {
    reply: prefixed.length > 900 ? `${prefixed.slice(0, 880)}…` : prefixed,
    citations: citations.slice(0, 10),
    source: 'grounded_fallback',
    deepLinks,
  };
}

/** Build citations + multi-SKU briefing lines from the snapshot. */
export function buildStoreBriefing(
  snapshot: ProfitOpsSnapshot,
  eventsSummary: string[],
): { lines: string[]; citations: string[] } {
  const { pulse, optimization, health } = snapshot;
  const safeEvents = eventsSummary.map(sanitizeEventLine).filter(Boolean).slice(0, 3);
  const recs = skuRecs(snapshot);
  const orders = topByAction(recs, 'order', 3);
  const holds = topByAction(recs, 'hold', 2);
  const promotes = topByAction(recs, 'promote', 2);
  const lows = health.lowStockItems.slice(0, 3);

  const citations: string[] = [
    `Saved $${optimization.dollarsSaved}`,
    `Made $${optimization.dollarsMade}`,
    `Sales ~$${pulse.salesDollars}`,
  ];
  for (const e of safeEvents) citations.push(e);
  for (const r of [...orders, ...holds].slice(0, 4)) {
    citations.push(`${r.action} ${r.name}: $${r.dollarsImpact}`);
  }
  for (const low of lows) {
    citations.push(`Low stock: ${low.name} (${low.currentStock})`);
  }

  const lines: string[] = [];
  lines.push(
    `${snapshot.periodLabel}: ~$${pulse.salesDollars} sales${snapshot.isProxy ? ' (proxy/demo estimate)' : ''}, $${optimization.dollarsSaved} saved / $${optimization.dollarsMade} made, ~${pulse.daysOfSupply}d supply, ${pulse.lowStockCount} low-stock SKUs.`,
  );

  if (snapshot.activeEvents?.length) {
    lines.push(
      `Active lifts: ${snapshot.activeEvents
        .slice(0, 3)
        .map((e) => `${e.name} ×${e.multiplier}`)
        .join('; ')}.`,
    );
  } else if (safeEvents.length > 0) {
    lines.push(`Events on the calendar: ${safeEvents.join('; ')}.`);
  } else {
    lines.push(
      'No local events listed — add Hay Days, hunting, or rodeos under Events so demand lifts show up.',
    );
  }

  if (health.fastMovers?.length) {
    lines.push(
      `Fast movers: ${health.fastMovers
        .slice(0, 3)
        .map((m) => `${m.name} (~${m.daysOfCover ?? '?'}d cover)`)
        .join(', ')}.`,
    );
  }
  if (health.slowMovers?.length) {
    lines.push(
      `Slow movers: ${health.slowMovers
        .slice(0, 3)
        .map((m) => `${m.name}${m.cashTiedUp ? ` ($${m.cashTiedUp} tied)` : ''}`)
        .join(', ')}.`,
    );
  }

  if (orders.length > 0) {
    lines.push(`Order next: ${orders.map((r) => formatRecLine(r)).join(' · ')}`);
  }
  if (holds.length > 0 || promotes.length > 0) {
    const slow = [...holds, ...promotes].slice(0, 3).map(formatRecLine);
    lines.push(`Hold / promote: ${slow.join(' · ')}`);
  }
  if (lows.length > 0) {
    lines.push(
      `Low stock: ${lows.map((l) => `${l.name} (${l.currentStock}/${l.reorderPoint})`).join(', ')}.`,
    );
  }
  if (!snapshot.squareConnected) {
    lines.push('Square not connected — numbers use inventory + forecast proxies until Owner connects under More.');
  }

  return { lines, citations: citations.slice(0, 10) };
}

export function findSkuMention(
  q: string,
  snapshot: ProfitOpsSnapshot,
): {
  rec?: OptimizationRecommendation;
  low?: { upc: string; name: string; currentStock: number; reorderPoint: number; daysOfCover?: number | null };
} | null {
  const nq = normalizeText(q);
  const recs = skuRecs(snapshot);
  const lows = snapshot.health.lowStockItems;
  const movers = [...(snapshot.health.fastMovers ?? []), ...(snapshot.health.slowMovers ?? [])];

  const candidates = [
    ...recs.map((r) => ({ kind: 'rec' as const, name: r.name, rec: r, upc: r.upc })),
    ...lows.map((l) => ({ kind: 'low' as const, name: l.name, low: l, upc: l.upc })),
    ...movers.map((m) => {
      const rec = recs.find((r) => r.upc === m.upc);
      const low = lows.find((l) => l.upc === m.upc);
      if (rec) return { kind: 'rec' as const, name: m.name, rec, upc: m.upc };
      if (low) return { kind: 'low' as const, name: m.name, low, upc: m.upc };
      return null;
    }),
  ].filter(Boolean) as Array<
    | { kind: 'rec'; name: string; rec: OptimizationRecommendation; upc: string }
    | {
        kind: 'low';
        name: string;
        low: { upc: string; name: string; currentStock: number; reorderPoint: number; daysOfCover?: number | null };
        upc: string;
      }
  >;

  // Alias expansion: if query mentions "coors", treat as matching names containing those tokens
  for (const [alias, tokens] of Object.entries(SKU_ALIASES)) {
    if (tokens.some((t) => nq.includes(t)) || nq.includes(alias)) {
      const hit = candidates.find((c) => {
        const nn = normalizeText(c.name);
        return tokens.some((t) => nn.includes(t)) || nn.includes(alias);
      });
      if (hit) return hit.kind === 'rec' ? { rec: hit.rec } : { low: hit.low };
    }
  }

  const sorted = [...candidates].sort((a, b) => b.name.length - a.name.length);
  for (const c of sorted) {
    const tokens = normalizeText(c.name)
      .split(/\s+/)
      .filter((t) => t.length >= 3);
    if (tokens.length === 0) continue;
    const full = normalizeText(c.name);
    if (nq.includes(full)) return c.kind === 'rec' ? { rec: c.rec } : { low: c.low };
    if (tokens.every((t) => nq.includes(t))) return c.kind === 'rec' ? { rec: c.rec } : { low: c.low };
    const brand = tokens[0];
    if (brand && brand.length >= 4 && nq.includes(brand)) {
      return c.kind === 'rec' ? { rec: c.rec } : { low: c.low };
    }
  }
  return null;
}

function categoryFromQuery(q: string): string | null {
  if (q.includes('beer') || q.includes('rtd')) return 'Beer';
  if (
    q.includes('spirit') ||
    q.includes('vodka') ||
    q.includes('whiskey') ||
    q.includes('whisky') ||
    q.includes('bourbon')
  ) {
    return 'Spirits';
  }
  if (q.includes('wine')) return 'Wine';
  return null;
}

function categoryHintInName(name: string, category: string): boolean {
  const n = name.toLowerCase();
  if (category === 'Beer') return /light|ipa|lager|ale|beer|coors|bud/.test(n);
  if (category === 'Spirits') return /vodka|whiskey|whisky|bourbon|rum|gin|tito|jack/.test(n);
  if (category === 'Wine') return /wine|cabernet|chardon|merlot|pinot/.test(n);
  return false;
}

function howToReply(q: string): AssistantChatResponse {
  const citations = ['Hangar PWA features'];
  let reply =
    'Use bottom nav for Home, Scan, Inventory, Forecast, Suggestions, Profit, and More. Floating Scan opens the camera; offline scans queue until you reconnect.';
  const deepLinks: AssistantDeepLink[] = [];

  if (matchesAny(q, ['scan', 'camera', 'upc', 'barcode'])) {
    reply =
      'Tap the floating Scan button (or Scan in the bottom nav). Point at the UPC, or take a photo / type the UPC on a laptop. Offline scans queue and sync when you are back online.';
    deepLinks.push({ type: 'route', label: 'Open Scan', path: '/scan' });
  } else if (matchesAny(q, ['offline', 'queue', 'sync'])) {
    reply =
      'When offline, scans are saved in a queue on the device and show as queued. When connection returns they sync automatically and forecasts refresh.';
  } else if (matchesAny(q, ['event', 'hay', 'holiday', 'multiplier'])) {
    reply =
      'Open Events to add local lifts (Hay Days, hunting, rodeos) with a multiplier. National holidays already boost demand. Suggestions → Holiday stocking shows what to prep.';
    deepLinks.push({ type: 'route', label: 'Open Events', path: '/events' });
    deepLinks.push({ type: 'route', label: 'Open Suggestions', path: '/suggestions' });
  } else if (matchesAny(q, ['profit', 'ask hangar', 'saved', 'made'])) {
    reply =
      'Profit & Ops (Manager+) shows Saved/Made and Ask Hangar. Answers use Hangar inventory, events, and the period you pick — not web trends.';
    deepLinks.push({ type: 'route', label: 'Open Profit', path: '/profit' });
  } else if (matchesAny(q, ['square', 'register'])) {
    reply =
      'Owner: More → Connect Square, then Sync. Until connected, Profit and Ask Hangar use inventory + forecast proxies.';
    deepLinks.push({ type: 'route', label: 'Open More', path: '/more' });
  } else if (matchesAny(q, ['inventory', 'csv', 'stock'])) {
    reply =
      'Inventory lists on-hand stock with search and filters. Managers can edit quantities, import CSV, or add products. Low stock also shows on Home.';
    deepLinks.push({ type: 'route', label: 'Open Inventory', path: '/inventory' });
  }

  return { reply, citations, source: 'grounded_fallback', deepLinks };
}

export function groundedAssistantReply(
  message: string,
  snapshot: ProfitOpsSnapshot,
  eventsSummary: string[],
  history?: AssistantChatTurn[],
): AssistantChatResponse {
  const q = normalizeText(message);
  const { pulse, optimization, categoryMix, health } = snapshot;
  const safeEvents = eventsSummary.map(sanitizeEventLine).filter(Boolean);
  const recs = skuRecs(snapshot);
  const briefing = buildStoreBriefing(snapshot, safeEvents);
  let intent = classifyIntent(q);

  // Follow-ups like "what about the whiskey?" / "and that one?"
  const followUp =
    matchesAny(q, ['what about', 'and that', 'that one', 'the whiskey', 'same for', 'how about']) ||
    (q.split(/\s+/).length <= 5 && matchesAny(q, ['whiskey', 'beer', 'vodka', 'wine', 'it', 'that']));

  let skuHit = findSkuMention(q, snapshot);
  if (!skuHit && (intent === 'sku_detail' || followUp)) {
    skuHit = lastMentionedSkuFromHistory(history, snapshot);
    if (skuHit) intent = 'sku_detail';
  }
  if (skuHit && (intent === 'general' || intent === 'category' || intent === 'sku_detail' || followUp)) {
    intent = 'sku_detail';
  }

  if (intent === 'how_to') {
    return howToReply(q);
  }

  if (intent === 'sku_detail' && (skuHit?.rec || skuHit?.low)) {
    const deepLinks: AssistantDeepLink[] = [];
    if (skuHit.rec) {
      const r = skuHit.rec;
      deepLinks.push({ type: 'sku', label: r.name, upc: r.upc });
      deepLinks.push({ type: 'route', label: 'Open Suggestions', path: '/suggestions' });
      const peers = recs.filter((x) => x.upc !== r.upc).slice(0, 2);
      return withProxy(
        snapshot,
        [
          formatRecLine(r),
          peers.length > 0 ? `Also on the list: ${peers.map(formatRecLine).join(' · ')}` : null,
          `Period totals: $${optimization.dollarsSaved} saved / $${optimization.dollarsMade} made (${snapshot.periodLabel}).`,
        ]
          .filter(Boolean)
          .join(' '),
        [
          `${r.action} ${r.name}: $${r.dollarsImpact}`,
          ...(r.cashTiedUp ? [`Tied up $${r.cashTiedUp}`] : []),
          ...(r.daysOfCover != null ? [`Cover ~${r.daysOfCover}d`] : []),
          ...peers.map((p) => `${p.action} ${p.name}: $${p.dollarsImpact}`),
        ],
        deepLinks,
      );
    }
    if (skuHit.low) {
      const l = skuHit.low;
      deepLinks.push({ type: 'sku', label: l.name, upc: l.upc });
      deepLinks.push({ type: 'route', label: 'Open Inventory', path: '/inventory' });
      const top = topByAction(recs, 'order', 2);
      return withProxy(
        snapshot,
        `${l.name} is low at ${l.currentStock} on hand (reorder ${l.reorderPoint})${
          l.daysOfCover != null ? `, ~${l.daysOfCover}d cover` : ''
        }. ${top.length ? `Top orders nearby: ${top.map(formatRecLine).join(' · ')}` : 'Open Suggestions for reorder ideas.'}`,
        [
          `Low stock: ${l.name} (${l.currentStock})`,
          ...top.map((r) => `${r.action} ${r.name}: $${r.dollarsImpact}`),
        ],
        deepLinks,
      );
    }
  }

  if (intent === 'event') {
    const eventLine =
      safeEvents[0] ||
      (snapshot.activeEvents?.[0]
        ? `${snapshot.activeEvents[0].name} ×${snapshot.activeEvents[0].multiplier}`
        : 'National holidays auto-lift demand; add a local event under Events for Hay Days, hunting, or rodeos.');
    const orders = topByAction(recs, 'order', 3);
    const lows = health.lowStockItems.slice(0, 2);
    const parts = [
      eventLine,
      'Stock focused categories early (beer/ice for summer holidays; spirits/wine for Thanksgiving–NYE).',
      `Keep days-of-supply near ${pulse.daysOfSupply}. Estimated event-ready money this period: about $${optimization.dollarsMade}.`,
    ];
    if (orders.length > 0) parts.push(`Priority orders: ${orders.map(formatRecLine).join(' · ')}`);
    if (lows.length > 0) {
      parts.push(`Watch low stock: ${lows.map((l) => `${l.name} (${l.currentStock})`).join(', ')}.`);
    }
    parts.push('See Suggestions → Holiday stocking.');
    return withProxy(snapshot, parts.join(' '), briefing.citations, [
      { type: 'route', label: 'Open Suggestions', path: '/suggestions' },
      { type: 'route', label: 'Open Events', path: '/events' },
    ]);
  }

  if (intent === 'overstock') {
    const overs = overstockSorted(recs);
    if (overs.length > 0) {
      const top = overs.slice(0, 3);
      return withProxy(
        snapshot,
        `Biggest cash-tied SKUs this ${snapshot.periodLabel}: ${top
          .map((r) => {
            const tied = r.cashTiedUp ?? r.dollarsImpact;
            return `${r.name} (~$${tied}${r.daysOfCover != null ? `, ~${r.daysOfCover}d cover` : ''}) — ${r.reason}`;
          })
          .join(' · ')}. Storewide overstock avoided ≈ $${optimization.dollarsSaved}.`,
        [
          ...top.map((r) => `${r.name}: $${r.cashTiedUp ?? r.dollarsImpact} cash tied up`),
          `Saved $${optimization.dollarsSaved} (overstock avoided storewide)`,
        ],
        [
          { type: 'sku', label: top[0].name, upc: top[0].upc },
          { type: 'route', label: 'Open Profit', path: '/profit' },
        ],
      );
    }
    return withProxy(
      snapshot,
      `I don’t see a single SKU with cashTiedUp yet. Storewide overstock avoided is about $${optimization.dollarsSaved} for ${snapshot.periodLabel}.`,
      [`Saved $${optimization.dollarsSaved} (overstock avoided storewide)`],
    );
  }

  if (intent === 'category') {
    const cat = categoryFromQuery(q) ?? 'Beer';
    const slice = categoryMix.find((c) => c.category === cat);
    const catRecs = recs
      .filter((r) => r.name.toLowerCase().includes(cat.toLowerCase().slice(0, 4)) || categoryHintInName(r.name, cat))
      .slice(0, 3);
    return withProxy(
      snapshot,
      slice
        ? `${cat} is about ${slice.sharePct}% of sales mix (~$${slice.salesDollars}). Shelf cash shows ~${pulse.daysOfSupply}d supply storewide. ${
            catRecs.length
              ? `Moves: ${catRecs.map(formatRecLine).join(' · ')}`
              : 'Use Holds on slow movers and Orders on low-stock winners.'
          }`
        : `I don’t see a ${cat} slice yet. Overall days of supply is ~${pulse.daysOfSupply} with ${pulse.lowStockCount} low-stock SKUs.`,
      [
        slice ? `${cat} ~$${slice.salesDollars} (${slice.sharePct}% of mix)` : `${cat} mix not available`,
        `Days of supply ~${pulse.daysOfSupply}`,
        ...catRecs.map((r) => `${r.action} ${r.name}: $${r.dollarsImpact}`),
      ],
    );
  }

  if (intent === 'money') {
    const orders = topByAction(recs, 'order', 2);
    const holds = overstockSorted(recs).slice(0, 2);
    return withProxy(
      snapshot,
      [
        `For ${snapshot.periodLabel}: about $${optimization.dollarsSaved} saved (avoided overbuy) and $${optimization.dollarsMade} made (stockouts/events).`,
        optimization.explanation,
        orders.length ? `Protect margin by ordering: ${orders.map((r) => r.name).join(', ')}.` : null,
        holds.length ? `Free cash by holding/promoting: ${holds.map((r) => r.name).join(', ')}.` : null,
      ]
        .filter(Boolean)
        .join(' '),
      [
        `Saved $${optimization.dollarsSaved}`,
        `Made $${optimization.dollarsMade}`,
        ...orders.map((r) => `${r.action} ${r.name}: $${r.dollarsImpact}`),
        ...holds.map((r) => `${r.name}: $${r.cashTiedUp ?? r.dollarsImpact} tied`),
      ],
    );
  }

  if (intent === 'sales_pulse') {
    const mix = categoryMix
      .slice(0, 3)
      .map((c) => `${c.category} ${c.sharePct}% (~$${c.salesDollars})`)
      .join(', ');
    const vs = health.velocitySummary;
    return withProxy(
      snapshot,
      [
        `${snapshot.periodLabel}: sales about $${pulse.salesDollars}${snapshot.isProxy ? ' (demo/proxy estimate)' : ''}, margin proxy ~${pulse.marginPct}%, ${pulse.lowStockCount} low-stock items, ~${pulse.daysOfSupply} days of supply.`,
        mix ? `Category mix: ${mix}.` : null,
        vs
          ? `Cover: ${vs.itemsUnder7d} SKUs under 7d, ${vs.itemsOver45d} over 45d.`
          : null,
        `Optimization: $${optimization.dollarsSaved} saved / $${optimization.dollarsMade} made.`,
      ]
        .filter(Boolean)
        .join(' '),
      [
        `Sales ~$${pulse.salesDollars}`,
        `Margin proxy ~${pulse.marginPct}%`,
        `Saved $${optimization.dollarsSaved}`,
        `Made $${optimization.dollarsMade}`,
      ],
    );
  }

  if (intent === 'order') {
    const orders = topByAction(recs, 'order', 3);
    const lows = health.lowStockItems.slice(0, 3);
    if (orders.length === 0 && lows.length === 0) {
      return withProxy(
        snapshot,
        `You have ${pulse.lowStockCount} low-stock SKUs. Open Suggestions for reorder ideas. Period impact: $${optimization.dollarsSaved} saved / $${optimization.dollarsMade} made.`,
        [`Saved $${optimization.dollarsSaved}`, `Made $${optimization.dollarsMade}`],
        [{ type: 'route', label: 'Open Suggestions', path: '/suggestions' }],
      );
    }
    return withProxy(
      snapshot,
      [
        orders.length ? `Order this period: ${orders.map(formatRecLine).join(' · ')}` : null,
        lows.length
          ? `Low stock watch: ${lows.map((l) => `${l.name} (${l.currentStock}/${l.reorderPoint})`).join(', ')}.`
          : null,
        health.fastMovers?.length
          ? `Fast movers: ${health.fastMovers
              .slice(0, 2)
              .map((m) => m.name)
              .join(', ')}.`
          : null,
        `Totals: $${optimization.dollarsSaved} saved / $${optimization.dollarsMade} made (${snapshot.periodLabel}).`,
      ]
        .filter(Boolean)
        .join(' '),
      [
        ...orders.map((r) => `${r.action} ${r.name}: $${r.dollarsImpact}`),
        ...lows.map((l) => `Low stock: ${l.name} (${l.currentStock})`),
      ],
      [
        ...(orders[0] ? [{ type: 'sku' as const, label: orders[0].name, upc: orders[0].upc }] : []),
        { type: 'route', label: 'Open Suggestions', path: '/suggestions' },
      ],
    );
  }

  if (intent === 'square') {
    if (!snapshot.squareConnected) {
      return withProxy(
        snapshot,
        'I don’t have live Square sales yet — Owner can Connect Square under More, then Sync. Until then I’m using inventory + forecast proxies. Ask about orders, overstock, or holidays with those Hangar numbers.',
        ['Square not connected', ...briefing.citations.slice(0, 3)],
        [{ type: 'route', label: 'Open More', path: '/more' }],
      );
    }
    return withProxy(
      snapshot,
      `Square is connected${snapshot.squareLastSyncAt ? ` (last sync ${snapshot.squareLastSyncAt})` : ''}. ${briefing.lines[0]}`,
      briefing.citations,
    );
  }

  if (intent === 'learning') {
    const L = snapshot.learning;
    if (L) {
      return withProxy(
        snapshot,
        `${L.plainEnglish} Right now: $${optimization.dollarsSaved} saved / $${optimization.dollarsMade} made for ${snapshot.periodLabel}.`,
        [
          L.plainEnglish.slice(0, 160),
          ...(L.salesDataSince ? [`Sales since ${L.salesDataSince}`] : []),
          `~${L.expectedImprovementPctPerMonth}% / month (illustrative)`,
        ],
      );
    }
  }

  return withProxy(
    snapshot,
    [
      ...briefing.lines,
      'Try asking: what to order this week, biggest overstock, beer cash, the next holiday, or how to scan offline.',
    ].join(' '),
    briefing.citations,
    [
      { type: 'route', label: 'Open Suggestions', path: '/suggestions' },
      { type: 'route', label: 'Open Profit', path: '/profit' },
    ],
  );
}

function normalizeHistory(raw: unknown): AssistantChatTurn[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .slice(-4)
    .map((t) => {
      if (!t || typeof t !== 'object') return null;
      const role = (t as { role?: string }).role;
      const content = String((t as { content?: string; text?: string }).content ?? (t as { text?: string }).text ?? '')
        .trim()
        .slice(0, 500);
      if ((role !== 'user' && role !== 'assistant') || !content) return null;
      return { role, content } as AssistantChatTurn;
    })
    .filter(Boolean) as AssistantChatTurn[];
}

export async function runAssistantChat(input: {
  message: string;
  snapshot: ProfitOpsSnapshot;
  eventsSummary: string[];
  period?: ProfitPeriod;
  history?: AssistantChatTurn[];
}): Promise<AssistantChatResponse> {
  const trimmed = input.message.trim().slice(0, 2000);
  const safeEvents = input.eventsSummary.map(sanitizeEventLine).filter(Boolean);
  const history = normalizeHistory(input.history);

  if (!trimmed) {
    return {
      reply: 'Ask me about sales, money in your pocket, events, what to order, or how to use Scan / Events.',
      citations: [],
      source: 'grounded_fallback',
    };
  }

  const modelId = process.env.BEDROCK_MODEL_ID;
  if (!modelId) {
    return groundedAssistantReply(trimmed, input.snapshot, safeEvents, history);
  }

  try {
    const { BedrockRuntimeClient, ConverseCommand } =
      await import('@aws-sdk/client-bedrock-runtime');
    const client = new BedrockRuntimeClient({});
    const context = buildContextPack(input.snapshot, safeEvents, history);
    const messages = [
      ...history.map((t) => ({
        role: t.role as 'user' | 'assistant',
        content: [{ text: t.content }],
      })),
      {
        role: 'user' as const,
        content: [{ text: trimmed }],
      },
    ];

    const response = await client.send(
      new ConverseCommand({
        modelId,
        system: [
          {
            text:
              'You are Hangar Liquor’s store assistant for Wiley, CO. Answer in 2–5 short bullets or sentences for phone use. ' +
              'Use ONLY the JSON store context numbers. Never invent dollars, stock, or days-of-cover. ' +
              'If Square is disconnected or isProxy is true, start with a one-line estimate disclaimer. ' +
              'Name specific SKUs from recommendations when relevant. For how-to / navigation questions, use the app features block.',
          },
          { text: `App features:\n${APP_KNOWLEDGE}` },
          { text: `Authoritative store context (JSON):\n${context}` },
        ],
        messages,
      }),
    );

    const text =
      response.output?.message?.content?.map((c) => ('text' in c ? c.text : '')).join('\n') || '';

    if (!text.trim() || !bedrockReplyIsGrounded(text, input.snapshot)) {
      return groundedAssistantReply(trimmed, input.snapshot, safeEvents, history);
    }

    return {
      reply: text.trim().slice(0, 900),
      citations: [
        `Sales ~$${input.snapshot.pulse.salesDollars}`,
        `Saved $${input.snapshot.optimization.dollarsSaved}`,
        `Made $${input.snapshot.optimization.dollarsMade}`,
      ],
      source: 'bedrock',
      deepLinks: [
        { type: 'route', label: 'Open Suggestions', path: '/suggestions' },
        { type: 'route', label: 'Open Profit', path: '/profit' },
      ],
    };
  } catch (err) {
    console.warn('Bedrock assistant failed, using grounded fallback', err);
    return groundedAssistantReply(trimmed, input.snapshot, safeEvents, history);
  }
}
