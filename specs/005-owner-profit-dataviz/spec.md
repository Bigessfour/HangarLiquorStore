# Feature Specification: Owner Profit & Ops Data Viz

**Feature Branch**: `005-owner-profit-dataviz`

**Created**: 2026-07-21

**Status**: Draft — **specs-only** for trial business; refine after 004; mock/proxy OK for first Profit MVP narrative

**Trial role:** Prove to Chris the tool **saves or makes him money** (Day/Month/Year + Saved/Made) — not a chart wall.

**Input**: A kick-ass but calm Manager/Owner data-viz dashboard — industry KPIs liquor store owners actually care about — so Chris can see **daily / monthly / yearly** how Hangar is doing and how inventory optimization is **saving or making him money**. Not a wall of charts. Meaningful signal. Optional everyday-language AI chat (see Spec 006 companion) to spitball ideas against Hangar-specific data.

## Research basis (liquor retail)

Industry sources emphasize a **short KPI list** that protects cash and margin — not vanity dashboards:

| KPI                                                                | Why owners care                                   | Typical healthy signal                                                                                                                                                                       |
| ------------------------------------------------------------------ | ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Sales by category** (Beer / Wine / Spirits / RTD / Mixers & ice) | Beer = volume; spirits/wine often = margin        | Mix, not just total $                                                                                                                                                                        |
| **Gross margin %**                                                 | Reality check vs busy-but-broke                   | ~25–30% blended ([Korona](https://koronapos.com/blog/how-to-run-a-liquor-store/))                                                                                                            |
| **Inventory turnover / days of supply**                            | Cash trapped on the shelf                         | ~6–8 turns/year overall; beer faster, premium spirits slower ([POS Nation](https://www.posnation.com/blog/liquor-store-metrics), [Bottle POS](https://bottlepos.com/blog/inventory-metrics)) |
| **Stockout risk $**                                                | Lost sales on winners                             | Track stockouts / days zero on A-items                                                                                                                                                       |
| **Shrinkage**                                                      | Theft/breakage/admin loss                         | Keep under ~1–2% of revenue                                                                                                                                                                  |
| **GMROI** (gross margin $ per $ inventory)                         | Is inventory earning its keep?                    | Aim > 1.0 at category/SKU ([inventory guides](https://get-creative.co/blog/the-ultimate-guide-to-liquor-store-inventory-management))                                                         |
| **Average basket / ATV**                                           | Upsell without being pushy                        | Often ~$30–50 independents                                                                                                                                                                   |
| **Peak periods**                                                   | Staff + cold vault / ice for weekends & festivals | Day/week/season patterns                                                                                                                                                                     |

Hangar differentiator: turn those into a **“Money in your pocket”** narrative — dollars **saved** (avoided overbuy / dead stock) and dollars **made** (avoided stockouts, event-ready ice & beer) from forecasts + events + (later) SageMaker optimization.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See how the store is doing today / this month / this year (Priority: P1)

Chris opens a Manager/Owner **Profit & Ops** view (new route or elevated Dashboard section). He picks **Day / Month / Year** and sees a few large numbers + one primary chart — not ten competing graphs.

**Why this priority**: Daily ritual; proves the product is about his wallet.

**Independent Test**: Manager+ opens Profit & Ops; toggles Day/Month/Year; numbers update without page chaos.

**Acceptance Scenarios**:

1. **Given** Manager or Owner, **When** opening Profit & Ops, **Then** they see period toggle (Day / Month / Year) and a clear “Store pulse” summary.
2. **Given** ReadOnly, **When** navigating, **Then** they do not get Manager money metrics (or see a limited non-financial stock view only — prefer hide).
3. **Given** mock demo without Square, **When** viewing, **Then** KPIs use inventory + forecast proxies with honest “demo estimate” labeling.

---

### User Story 2 - Money in your pocket from optimization (Priority: P1)

Chris sees a dedicated **Optimization impact** card: estimated **$ saved** (dead stock avoided / better turns) and **$ made** (stockouts avoided / event uplift captured) for the selected period — driven by Hangar forecast/reorder actions and later SageMaker (006). Copy is plain English: “This is cash staying in Hangar’s pocket.”

**Why this priority**: User’s stated north star for Chris.

**Independent Test**: With demo data, impact card shows non-zero or clear “Not enough history yet” state; with Square+006, uses real sales deltas.

**Acceptance Scenarios**:

1. **Given** period = Month, **When** impact card loads, **Then** Chris sees Saved / Made (or pending) with one-sentence explanation.
2. **Given** no optimization history, **When** viewing, **Then** UI explains what will appear after forecasts + Square sync — not a fake precise dollar.

---

### User Story 3 - Category mix & inventory health (Priority: P1)

One category breakdown (Beer / Wine / Spirits / RTD / Mixers·Ice) and a short inventory health strip: turns or days-of-supply, low-stock count, shrink risk flag if available.

**Why this priority**: Matches how liquor owners actually buy and face the floor ([category mix guidance](https://www.posnation.com/blog/liquor-store-metrics)).

**Independent Test**: Category bars/list match inventory+sales mock; ice/mixers visible as essentials.

**Acceptance Scenarios**:

1. **Given** store data, **When** viewing category mix, **Then** Chris can tell volume vs margin story at a glance (labels, not 5 charts).
2. **Given** low-stock SKUs, **When** viewing health strip, **Then** count and top offenders link toward Suggestions/Inventory.

---

### User Story 4 - Optional Hangar AI chat (Priority: P3 — Spec 006 companion)

Chris types everyday language (“What should I stock for Hay Days?” / “Why is beer cash tied up?”) and an AI agent answers using Hangar inventory, events, forecasts, and Square analytics — spitball only, with citations to in-app numbers.

**Why this priority**: Powerful, but depends on data contracts (004) + model path (006); must not block Profit & Ops MVP.

**Independent Test**: Spec’d under 006; stub entry point OK on Profit & Ops (“Coming with optimization”).

---

### Edge Cases

- Square not connected → show inventory/forecast-based proxies + Connect CTA
- Thin history → confidence labels, not false precision
- Mobile: one scroll composition; charts sparse (Recharts, lazy)
- Never show raw tokens or PII

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Manager/Owner Profit & Ops surface with Day / Month / Year period control
- **FR-002**: Hero metrics MUST include store sales (or proxy), margin or margin proxy, and inventory health (turns or days of supply / low stock)
- **FR-003**: MUST include Optimization impact card (Saved / Made) with honest provenance
- **FR-004**: MUST include category mix for Beer, Wine, Spirits, RTD, Mixers/Ice (map to existing categories)
- **FR-005**: Prefer ≤2 charts on the first viewport; remaining signal as numbers/lists
- **FR-006**: Integrate Square sales when connected (004); otherwise labeled demo/proxy
- **FR-007**: Reserve/integrate SageMaker optimization outputs when 006 ships
- **FR-008**: AI chat is optional P3 — implement under Spec 006 unless a thin “Ask Hangar” stub is needed for demo copy

### Non-Functional

- Mobile-first; rural-owner plain English; YAGNI on chart chrome
- Recharts only; TanStack Query for data
- Constitution: no hot-path heavy ML on this dashboard render

### Out of Scope

- Full BI suite / 20-report POS clone
- Customer CRM / loyalty deep dive (unless Square later)
- Labor cost % / sales per sq ft (need data we don’t have yet — future)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Chris understands in &lt;60 seconds whether the period was good for cash (pulse + impact card)
- **SC-002**: First viewport has ≤2 charts and ≥1 money-in-pocket message
- **SC-003**: Demo mode works without Square; live mode improves with 004/006
- **SC-004**: ReadOnly cannot access Manager money dashboard

## Assumptions

- Build after **003** (events) and preferably after **004** (Square groundwork); can ship MVP on mock proxies earlier if demo needs it
- **006** delivers SageMaker optimization + optional Hangar AI chat
- Existing Dashboard remains the ops home; Profit & Ops may live at `/profit` or as a Dashboard tab — plan decides; avoid chart spam on scan path

## Related specs

| Spec                                                   | Role                                                 |
| ------------------------------------------------------ | ---------------------------------------------------- |
| [004](../004-square-analytics-groundwork/spec.md)      | POS sales/catalog/inventory feeds                    |
| [006](../006-sagemaker-optimization-assistant/spec.md) | Optimization engine + everyday-language AI assistant |
| [002](../002-owner-guided-trial/spec.md)               | Tour may later add a Profit stop once shipped        |
