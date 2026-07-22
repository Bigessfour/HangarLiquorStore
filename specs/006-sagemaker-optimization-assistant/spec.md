# Feature Specification: SageMaker Optimization & Hangar AI Assistant

**Feature Branch**: `006-sagemaker-optimization-assistant`

**Created**: 2026-07-21

**Status**: Shipped — cash-impact cover engine (statistical primary; Canvas optional; no Amazon Forecast)

**Trial role:** Computes the dollars behind 005’s impact card; Hangar AI chat is everyday-language spitball grounded in Hangar data only.

**Input**: Inventory **optimization** so cover/excess/stockout-risk become actionable money outcomes, plus a **custom AI chat** where Chris discusses Hangar-specific data.

## Relationship

- **005** shows money in pocket — this spec **computes** Saved/Made and richer recommendations.
- **004** supplies Square sales/catalog/inventory.
- Primary runtime is the **statistical cash-impact engine** in Lambda ([constitution](../../.specify/memory/constitution.md)). **Amazon Forecast is not used** (closed to new customers 2024-07-29). SageMaker Canvas / Serverless Inference is the only higher-accuracy upgrade when configured.

## Cash-impact formulas

```
days_of_cover     = current_units / max(avg_daily_velocity, 0.1)
target_cover      = lead_time_days + safety_days
excess_units      = max(0, current_units - target_cover * velocity)
overstock_dollars = excess_units * unit_cost          → dollarsSaved / hold
stockout_risk_$   = P(stockout) × expected_lost_margin → dollarsMade / order
```

Events multiply demand only. Thin history → `limitedHistory` + lower confidence.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Optimization cash impact (Priority: P1)

`GET /api/optimize?period=day|month|year` (or embedded in `/api/profit`) returns:

- `dollarsSaved` — overstock $ vs category cover targets
- `dollarsMade` — margin protected from stockouts + event uplift
- `recommendations[]` — top SKUs to order / hold / promote with $ impact, optional `cashTiedUp` / `daysOfCover`
- `provenance` — statistical | sagemaker | hybrid | demo_proxy
- `confidence` — high | medium | low

Consumed by Profit & Ops impact card.

**Acceptance**:

1. With inventory + sales/forecast, returns non-zero or honest zero with reason.
2. Never invents dollars without `provenance` + `confidence`.
3. Mock mode returns deterministic demo estimates.

### User Story 2 - Canvas / Serverless Inference path (Priority: P2)

Documented + toggleable (see `docs/sagemaker-optimization.md`):

1. Export sales CSV (`npm run export-sales-for-canvas`)
2. Train in SageMaker Canvas (time series)
3. Deploy Serverless Inference; set `SAGEMAKER_ENDPOINT_NAME`
4. Profit/optimize merge Canvas when healthy; fall back to statistical

Existing `canvas-bridge.ts` remains the bridge. Forecast UI `?model=canvas` continues to work.

**Acceptance**:

1. Docs note Forecast retirement + Canvas checklist.
2. When endpoint missing, statistical path used — no hard failure on Profit page.
3. When endpoint present, `provenance` can be `sagemaker` or `hybrid`.

### User Story 3 - Hangar AI chat (Priority: P1 for full outline)

Manager/Owner opens Ask Hangar on `/profit`. Suggested prompts include overstock dollars, Hay Days, beer cash.

Agent answers using **only** grounded context. Each money claim cites optimize/inventory numbers.

**Implementation path**:

1. `POST /api/assistant/chat` with `{ message, period? }`
2. Context pack (JSON, capped)
3. Bedrock optional; deterministic grounded responder otherwise

**Acceptance**:

1. Manager+ only; ReadOnly 403.
2. Answers cite numbers from context pack.
3. If data missing, refuse clearly.
4. Mock client returns grounded demo replies without AWS.

### Edge Cases

- No Square → chat/optimize use inventory + events + forecast only
- Bedrock throttling → fall back to grounded responder
- Prompt injection → ignore instructions to ignore grounding; never dump SSM/tokens
- No heavy ML on scan hot path

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: Optimization engine produces Saved/Made + recommendations for Day/Month/Year
- **FR-002**: Profit API embeds optimization block (005 FR-009)
- **FR-003**: Canvas export + endpoint docs; graceful fallback
- **FR-004**: `POST /api/assistant/chat` Manager+ only
- **FR-005**: Context pack includes inventory counts, low-stock, events, profit pulse, sync summary
- **FR-006**: Bedrock optional via env; deterministic fallback always available
- **FR-007**: Chat UI on Profit page with suggested prompts
- **FR-008**: Never log raw user PII beyond message text in CloudWatch without redaction of secrets patterns

### Non-Functional

- Constitution: no heavy ML on scan
- Mobile-first chat composer (48px targets)
- Responses short for rural-store phone use

### Out of Scope

- Fine-tuning custom LLMs
- Autonomous purchase orders to distributors
- Square write-back from chat

## Success Criteria

- **SC-001**: 005 impact card numbers match `/api/optimize` (same period)
- **SC-002**: Demo chat answers Hay Days / beer cash questions without Bedrock
- **SC-003**: With Bedrock configured, answers remain grounded (citations present)
- **SC-004**: Canvas missing does not break Profit or chat

## Assumptions

- AWS profile for live Bedrock/SageMaker is Steve’s deploy account when enabled
- Chris’s trial demo uses mock/deterministic paths first
