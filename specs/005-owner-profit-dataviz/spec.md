# Feature Specification: Owner Profit & Ops Data Viz

**Feature Branch**: `005-owner-profit-dataviz`

**Created**: 2026-07-21

**Status**: Shipped — full outline + implementation (no YAGNI cut)

**Trial role:** Prove to Chris the tool **saves or makes him money** (Day/Month/Year + Saved/Made) — not a chart wall.

**Input**: Manager/Owner **Profit & Ops** surface — liquor-store KPIs that protect cash and margin — so Chris sees **daily / monthly / yearly** how Hangar is doing and how inventory optimization is **saving or making him money**.

## Research basis (liquor retail)

| KPI                                 | Why owners care                            | Healthy signal             |
| ----------------------------------- | ------------------------------------------ | -------------------------- |
| Sales by category                   | Beer = volume; spirits/wine often = margin | Mix, not just total $      |
| Gross margin %                      | Busy-but-broke check                       | ~25–30% blended            |
| Inventory turnover / days of supply | Cash on the shelf                          | ~6–8 turns/year overall    |
| Stockout risk $                     | Lost sales on winners                      | Days zero on A-items       |
| Shrinkage                           | Theft/breakage                             | Under ~1–2% of revenue     |
| GMROI                               | Inventory earning its keep                 | Aim > 1.0                  |
| Average basket / ATV                | Upsell                                     | Often ~$30–50 independents |
| Peak periods                        | Staff + ice for weekends/festivals         | Day/week patterns          |

Hangar differentiator: **Money in your pocket** — $ **saved** (avoided overbuy / dead stock) and $ **made** (avoided stockouts, event-ready ice & beer).

## First viewport (wireframe in prose)

```
[ Profit & Ops ]     [ Day | Month | Year ]
─────────────────────────────────────────
Store pulse
  Sales $XXXX     Margin ~XX%     Low stock N
  Days of supply ~NN

Money in your pocket
  Saved $XXX   Made $YYY
  “Cash staying in Hangar’s pocket.” + provenance line

Category mix          (one chart: bar or horizontal)
  Beer | Wine | Spirits | RTD | Mixers/Ice

Ask Hangar → (006 chat entry)
```

≤2 charts on first viewport. Remaining signal as numbers/lists.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Period store pulse (Priority: P1)

Manager/Owner opens `/profit`, toggles Day/Month/Year, sees large pulse metrics.

**Acceptance**:

1. **Given** Manager or Owner, **When** opening Profit & Ops, **Then** period toggle works and pulse updates.
2. **Given** ReadOnly, **When** navigating to `/profit`, **Then** redirected or shown “Managers only” (prefer hide from More).
3. **Given** mock demo, **When** viewing, **Then** KPIs labeled demo estimate / proxy.

### User Story 2 - Money in pocket (Priority: P1)

Optimization impact card: **Saved** + **Made** with plain-English provenance (forecast reorder vs flat buy, event uplift, 006 when present).

**Acceptance**:

1. Period = Month → Saved/Made with one-sentence explanation.
2. Thin history → “Not enough history yet” / provisional estimates — never fake precise pennies without label.

### User Story 3 - Category mix & inventory health (Priority: P1)

Category breakdown + health strip (days of supply or turns, low-stock count, top offenders → Inventory/Suggestions).

### User Story 4 - Ask Hangar entry (Priority: P2)

Profit page embeds Ask Hangar chat panel (006). If 006 unavailable, show stub that still answers from local mock grounding rules.

### Edge Cases

- Square not connected → inventory/forecast proxies + Connect CTA
- Thin history → confidence labels
- Mobile: one scroll; Recharts sparse; lazy route
- Never show tokens/PII

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: Route `/profit` — Manager+ only
- **FR-002**: Day / Month / Year period control
- **FR-003**: Hero pulse: sales (or proxy), margin proxy, inventory health (days of supply / low stock)
- **FR-004**: Optimization impact card (Saved / Made) with provenance
- **FR-005**: Category mix Beer / Wine / Spirits / RTD / Mixers·Ice (map existing categories; RTD from name heuristics if needed)
- **FR-006**: ≤2 charts first viewport
- **FR-007**: `GET /api/profit?period=day|month|year` returns typed payload; mock client when no API
- **FR-008**: Integrate Square payment rollup when last sync present
- **FR-009**: Consume 006 optimization fields when present (`optimization` block)
- **FR-010**: More menu link for Manager+; Dashboard shortcut card optional
- **FR-011**: Ask Hangar panel on page (wired to 006)
- **FR-012**: `learning` block on profit payload — `salesDataSince` (earliest Square/sales date), illustrative ~% improvement per month of history, and holiday-actuals note (honest labels; not an SLA)

### Proxy formulas (demo / no Square)

| Metric         | Formula                                                                                                                                                    |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sales $        | `unitsSold * avgUnitPrice` (category heuristics); units from sales history or forecast daily × period                                                      |
| Margin %       | Blended 28% proxy (labeled)                                                                                                                                |
| Days of supply | Storewide `totalStock / max(avgDailyUnits, 0.1)`; per-SKU `days_of_cover = current / velocity`                                                             |
| Saved $        | Sum of `excess_units * unit_cost` where `excess = max(0, current - target_cover * velocity)` and `target_cover = lead_time + safety_days` (category table) |
| Made $         | Sum of `P(stockout) × expected_lost_margin` (+ event demand uplift on velocity only)                                                                       |

Recommendations include optional `cashTiedUp`, `daysOfCover`, `excessUnits`, `limitedHistory`.

### Non-Functional

- Mobile-first; plain English; Recharts; TanStack Query
- No heavy ML on render path

### Out of Scope

- Full BI / 20-report POS clone
- CRM / loyalty
- Labor % / sales per sq ft

## Success Criteria

- **SC-001**: Chris understands cash health in &lt;60 seconds
- **SC-002**: ≤2 charts + ≥1 money-in-pocket message on first viewport
- **SC-003**: Demo works without Square
- **SC-004**: ReadOnly cannot access money dashboard

## Related

| Spec                                                   | Role              |
| ------------------------------------------------------ | ----------------- |
| [004](../004-square-analytics-groundwork/spec.md)      | POS feeds         |
| [006](../006-sagemaker-optimization-assistant/spec.md) | Optimization + AI |
