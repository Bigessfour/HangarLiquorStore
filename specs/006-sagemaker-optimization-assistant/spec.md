# Feature Specification: SageMaker Optimization & Hangar AI Assistant

**Feature Branch**: `006-sagemaker-optimization-assistant`

**Created**: 2026-07-21

**Status**: Shipped — full outline + implementation (no YAGNI cut)

**Trial role:** Computes the dollars behind 005’s impact card; Hangar AI chat is everyday-language spitball grounded in Hangar data only.

**Input**: Inventory **optimization** so forecasts become actionable money outcomes, plus a **custom AI chat** where Chris discusses Hangar-specific data.

## Relationship

- **005** shows money in pocket — this spec **computes** Saved/Made and richer recommendations.
- **004** supplies Square sales/catalog/inventory.
- Primary runtime forecast remains lightweight Lambda stats ([constitution](../../.specify/memory/constitution.md)); SageMaker Canvas / Serverless Inference is the higher-accuracy path when configured.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Optimization cash impact (Priority: P1)

`GET /api/optimize?period=day|month|year` (or embedded in `/api/profit`) returns:

- `dollarsSaved` — avoided overbuy / dead stock vs naive reorder
- `dollarsMade` — avoided stockouts + event uplift captured
- `recommendations[]` — top SKUs to order / hold / promote with $ impact
- `provenance` — statistical | sagemaker | hybrid
- `confidence` — high | medium | low

Consumed by Profit & Ops impact card.

**Acceptance**:

1. With inventory + sales/forecast, returns non-zero or honest zero with reason.
2. Never invents dollars without `provenance` + `confidence`.
3. Mock mode returns deterministic demo estimates.

### User Story 2 - Canvas / Serverless Inference path (Priority: P2)

Documented + toggleable:

1. Export sales CSV (`npm run export-sales-for-canvas`)
2. Train in SageMaker Canvas (time series)
3. Deploy Serverless Inference; set `SAGEMAKER_ENDPOINT_NAME`
4. Profit/optimize prefer Canvas predictions when endpoint healthy; fall back to statistical

Existing `canvas-bridge.ts` remains the bridge. Forecast UI `?model=canvas` continues to work.

**Acceptance**:

1. Docs in `docs/sagemaker-optimization.md` with copy-paste steps.
2. When endpoint missing, statistical path used — no hard failure on Profit page.
3. When endpoint present, `provenance` can be `sagemaker` or `hybrid`.

### User Story 3 - Hangar AI chat (Priority: P1 for full outline)

Manager/Owner opens Ask Hangar on `/profit` (or More). Types everyday language:

- “What should I stock for Hay Days?”
- “Why is beer cash tied up?”
- “How much did we make this month?”

Agent answers using **only** grounded context: inventory snapshot, local events, forecast suggestions, profit KPIs, Square sync summary if present. Each money claim cites the in-app number.

**Implementation path**:

1. `POST /api/assistant/chat` with `{ message, period? }`
2. Server builds a **context pack** (JSON summary, capped size)
3. If `BEDROCK_MODEL_ID` set → Amazon Bedrock Converse with system prompt “Hangar Liquor assistant; refuse invented dollars”
4. Else → **deterministic grounded responder** (template + keyword routing over context pack) so demo always works offline

**Acceptance**:

1. Manager+ only; ReadOnly 403.
2. Answers cite numbers from context pack.
3. If data missing for a question, refuse clearly (“I don’t have Square sales yet — connect Square or sync”).
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
