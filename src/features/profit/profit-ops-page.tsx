import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { DollarSign, MessageCircle, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { hasRole } from '@/lib/auth';
import { DEMO_PROFIT_DISCLAIMER, isDemoProfitSimulated } from '@/lib/demo-sim';
import { askHangarAssistant, fetchProfitOps } from '@/lib/profit-api';
import type { ProfitPeriod } from '@/types/profit';
import { cn } from '@/lib/utils';

const PERIODS: { id: ProfitPeriod; label: string }[] = [
  { id: 'day', label: 'Day' },
  { id: 'month', label: 'Month' },
  { id: 'year', label: 'Year' },
];

const SUGGESTED = [
  'What should I stock for Hay Days?',
  'Why is beer cash tied up?',
  'Show me the biggest overstock dollars this month.',
  'How much money is in my pocket this month?',
  'How do forecasts improve with more Square history?',
];

function money(n: number): string {
  return `$${n.toLocaleString()}`;
}

export function ProfitOpsPage() {
  const allowed = hasRole('Manager');
  const [period, setPeriod] = useState<ProfitPeriod>('month');
  const [chatInput, setChatInput] = useState('');
  const [chatLog, setChatLog] = useState<
    Array<{ role: 'user' | 'assistant'; text: string; citations?: string[] }>
  >([]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['profit', period],
    queryFn: () => fetchProfitOps(period),
    enabled: allowed,
  });

  const chatMutation = useMutation({
    mutationFn: (message: string) => askHangarAssistant(message, period),
    onSuccess: (res, message) => {
      setChatLog((prev) => [
        ...prev,
        { role: 'user', text: message },
        { role: 'assistant', text: res.reply, citations: res.citations },
      ]);
      setChatInput('');
    },
  });

  const chartData = useMemo(
    () =>
      (data?.categoryMix ?? []).map((c) => ({
        name: c.category,
        sales: c.salesDollars,
      })),
    [data],
  );

  if (!allowed) {
    return (
      <div className="space-y-4 p-4">
        <h1 className="text-2xl font-bold">Profit & Ops</h1>
        <p className="text-muted-foreground">
          Managers and Owners only — money metrics stay off the floor for ReadOnly.
        </p>
        <Button asChild variant="outline" className="min-h-12">
          <Link to="/">Back to Dashboard</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5 p-4 pb-24">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Profit & Ops</h1>
          <p className="text-sm text-muted-foreground">
            How Hangar is doing — and cash staying in your pocket.
          </p>
        </div>
        <div className="flex rounded-lg border border-border p-1" role="group" aria-label="Period">
          {PERIODS.map((p) => (
            <button
              key={p.id}
              type="button"
              className={cn(
                'min-h-11 min-w-16 rounded-md px-3 text-sm font-medium',
                period === p.id
                  ? 'bg-hanger-amber text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted',
              )}
              onClick={() => setPeriod(p.id)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Loading store pulse…</p>}
      {error && (
        <p className="text-sm text-destructive">
          {error instanceof Error ? error.message : 'Could not load profit data'}
        </p>
      )}

      {data && (
        <>
          {isDemoProfitSimulated() && (
            <p className="rounded-md border border-hanger-amber/40 bg-hanger-amber/10 px-3 py-2 text-sm text-foreground">
              {DEMO_PROFIT_DISCLAIMER}
              {data.squareConnected
                ? ` Simulated last sync: ${data.squareLastSyncAt ? new Date(data.squareLastSyncAt).toLocaleString() : 'just now'}.`
                : ' Square not simulated as connected — live Profit dollars still need Owner Connect.'}
            </p>
          )}
          {data.isProxy && !isDemoProfitSimulated() && (
            <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
              Demo / proxy estimate — connect Square and sync for live register dollars. Without
              Square, Saved/Made and mix are sample figures only.
            </p>
          )}
          {data.isProxy && isDemoProfitSimulated() && (
            <p className="text-xs text-muted-foreground">
              Still marked proxy: category margin (~28%) until real Square costs/catalog map in.
            </p>
          )}

          {data.learning && (
            <section
              className="space-y-2 rounded-lg border border-border bg-muted/30 px-3 py-3"
              aria-labelledby="learning-heading"
            >
              <h2 id="learning-heading" className="text-sm font-semibold">
                Based on your sales data
              </h2>
              <p className="text-sm text-foreground">{data.learning.plainEnglish}</p>
              <dl className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                <div>
                  <dt className="text-muted-foreground">Data since</dt>
                  <dd className="font-medium tabular-nums">
                    {data.learning.salesDataSince
                      ? new Date(`${data.learning.salesDataSince}T12:00:00Z`).toLocaleDateString(
                          undefined,
                          { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' },
                        )
                      : 'Not yet'}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">History</dt>
                  <dd className="font-medium tabular-nums">
                    ~{data.learning.monthsOfHistory} mo
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Illustrative trust</dt>
                  <dd className="font-medium tabular-nums">
                    ~{data.learning.illustrativeAccuracyPct}% → ~
                    {data.learning.illustrativeAccuracyNextMonthPct}%
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Per month</dt>
                  <dd className="font-medium tabular-nums">
                    ~+{data.learning.expectedImprovementPctPerMonth}%
                  </dd>
                </div>
              </dl>
              <p className="text-xs text-muted-foreground">
                Trust % is illustrative (not a guarantee). Holiday/event actuals (
                {data.learning.holidaysWithActuals}
                {data.learning.pastHolidaysOnCalendar > 0
                  ? ` of ${data.learning.pastHolidaysOnCalendar} past events`
                  : ''}
                ) further tighten seasonal forecasts.
              </p>
            </section>
          )}

          <section className="space-y-2" aria-labelledby="pulse-heading">
            <h2
              id="pulse-heading"
              className="text-sm font-semibold uppercase tracking-wide text-muted-foreground"
            >
              Store pulse · {data.periodLabel}
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Metric label="Sales" value={money(data.pulse.salesDollars)} />
              <Metric label="Margin" value={`~${data.pulse.marginPct}%`} hint="proxy" />
              <Metric label="Low stock" value={String(data.pulse.lowStockCount)} />
              <Metric label="Days supply" value={`~${data.pulse.daysOfSupply}`} />
            </div>
          </section>

          <section aria-labelledby="pocket-heading">
            <Card className="border-hanger-amber/40 bg-gradient-to-br from-hanger-amber/10 to-transparent">
              <CardContent className="space-y-3 p-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-hanger-amber" aria-hidden />
                  <h2 id="pocket-heading" className="font-semibold">
                    Money in your pocket
                  </h2>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Saved</p>
                    <p className="text-2xl font-bold tabular-nums">
                      {money(data.optimization.dollarsSaved)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Made</p>
                    <p className="text-2xl font-bold tabular-nums">
                      {money(data.optimization.dollarsMade)}
                    </p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Saved ~{money(data.optimization.dollarsSaved)} by not over-ordering slow movers.
                  Protected ~{money(data.optimization.dollarsMade)} in margin by covering demand
                  (events + stockouts).
                </p>
                {data.optimization.recommendations[0] && (
                  <p className="rounded-md border border-border/60 bg-background/60 px-3 py-2 text-sm">
                    <span className="font-medium">Top action: </span>
                    {data.optimization.recommendations[0].action}{' '}
                    {data.optimization.recommendations[0].name}
                    {' — '}
                    {money(data.optimization.recommendations[0].dollarsImpact)}
                    {data.optimization.recommendations[0].cashTiedUp
                      ? ` (${money(data.optimization.recommendations[0].cashTiedUp)} cash tied up)`
                      : ''}
                    {data.optimization.recommendations[0].daysOfCover != null
                      ? ` · ~${data.optimization.recommendations[0].daysOfCover}d cover`
                      : ''}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">{data.optimization.explanation}</p>
                <p className="text-xs text-muted-foreground">
                  Confidence: {data.optimization.confidence} ·{' '}
                  {data.optimization.provenance.replace(/_/g, ' ')}
                </p>
              </CardContent>
            </Card>
          </section>

          <section className="space-y-2" aria-labelledby="mix-heading">
            <h2
              id="mix-heading"
              className="text-sm font-semibold uppercase tracking-wide text-muted-foreground"
            >
              Category mix
            </h2>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} width={40} />
                  <Tooltip formatter={(v: number) => money(v)} />
                  <Bar dataKey="sales" fill="hsl(38 92% 50%)" radius={[4, 4, 0, 0]} />                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="space-y-2" aria-labelledby="health-heading">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-hanger-amber" aria-hidden />
              <h2
                id="health-heading"
                className="text-sm font-semibold uppercase tracking-wide text-muted-foreground"
              >
                Inventory health
              </h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Turns ~{data.health.turnsPerYear ?? '—'} / year · {data.pulse.lowStockCount} below
              reorder
            </p>
            <ul className="space-y-2">
              {data.health.lowStockItems.map((item) => (
                <li key={item.upc}>
                  <Link
                    to="/inventory"
                    className="flex min-h-12 items-center justify-between rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted/50"
                  >
                    <span className="truncate font-medium">{item.name}</span>
                    <span className="shrink-0 text-muted-foreground">
                      {item.currentStock} / {item.reorderPoint}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            {!data.squareConnected && (
              <Button asChild variant="outline" className="min-h-12 w-full sm:w-auto">
                <Link to="/more">Connect Square for live sales</Link>
              </Button>
            )}
          </section>

          <section className="space-y-3" aria-labelledby="ask-heading">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-hanger-amber" aria-hidden />
              <h2
                id="ask-heading"
                className="text-sm font-semibold uppercase tracking-wide text-muted-foreground"
              >
                Ask Hangar
              </h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED.map((prompt) => (
                <Button
                  key={prompt}
                  type="button"
                  variant="outline"
                  className="min-h-11 text-left text-xs sm:text-sm"
                  disabled={chatMutation.isPending}
                  onClick={() => chatMutation.mutate(prompt)}
                >
                  {prompt}
                </Button>
              ))}
            </div>
            <div className="space-y-2 rounded-lg border border-border p-3">
              {chatLog.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Spitball ideas against Hangar numbers — no invented dollars.
                </p>
              )}
              {chatLog.map((entry, idx) => (
                <div
                  key={`${entry.role}-${idx}`}
                  className={cn(
                    'rounded-md px-3 py-2 text-sm',
                    entry.role === 'user' ? 'bg-muted' : 'bg-hanger-amber/10',
                  )}
                >
                  <p>{entry.text}</p>
                  {entry.citations && entry.citations.length > 0 && (
                    <ul className="mt-1 list-disc pl-4 text-xs text-muted-foreground">
                      {entry.citations.map((c) => (
                        <li key={c}>{c}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
              <form
                className="flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!chatInput.trim()) return;
                  chatMutation.mutate(chatInput.trim());
                }}
              >
                <input
                  className="min-h-12 flex-1 rounded-md border border-input bg-background px-3 text-sm"
                  placeholder="Ask about sales, events, or orders…"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  aria-label="Ask Hangar"
                />
                <Button
                  type="submit"
                  className="min-h-12 min-w-20"
                  disabled={chatMutation.isPending}
                >
                  Ask
                </Button>
              </form>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <p className="text-xs text-muted-foreground">
        {label}
        {hint ? ` (${hint})` : ''}
      </p>
      <p className="text-xl font-bold tabular-nums">{value}</p>
    </div>
  );
}
