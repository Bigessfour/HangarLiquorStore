# Feature Specification: SageMaker Optimization & Hangar AI Assistant

**Feature Branch**: `006-sagemaker-optimization-assistant`

**Created**: 2026-07-21

**Status**: Draft stub — **specs-only**; expand before any build; after 004/005

**Trial role:** Computes the dollars behind 005’s impact card; AI chat is P3 spitball with grounded Hangar data only.

**Input**: Implement the SageMaker / inventory **optimization** function so forecasts become actionable money outcomes, and (optionally) a **custom AI chat** where Chris uses everyday language to discuss Hangar Liquor–specific data — spitball ideas, ask questions, query store metrics.

## Relationship to other specs

- **005** shows “money in pocket” — this spec **computes** Saved/Made and richer recommendations.
- **004** supplies Square sales/catalog/inventory for training and live features.
- Primary runtime forecast remains lightweight Lambda stats ([constitution](../../.specify/memory/constitution.md)); SageMaker is the higher-accuracy / optimization path.

## User Scenarios (summary)

1. **P1** — Optimization job/endpoint produces reorder + cash-impact estimates consumed by Profit & Ops (005).
2. **P2** — Canvas / Serverless Inference path documented and toggleable (existing UI hooks).
3. **P3** — Hangar AI chat: natural language over inventory, events, forecasts, Square analytics; citations to numbers; Manager/Owner only.

## Out of scope for this stub

Full detailed FR list — expand when starting 006 after 003–005 MVP lessons. Do not implement chat before Profit & Ops has real KPIs to ground answers.

## Assumptions

- No heavy ML in the hot scan path
- Chat must not invent dollars; refuse when data missing
