# Spec Kit @ Hangar Liquor

Lightweight Spec-Driven Development for finishing and handing off the store inventory PWA.

## Philosophy

No mandatory slash-command runs. Spec Kit holds **durable intent** so agents stop inventing the product mid-code. Use it when the work matters; skip it when it does not.

Constitution: [`.specify/memory/constitution.md`](../.specify/memory/constitution.md)
Day-to-day agent checklist: [`AGENTS.md`](../AGENTS.md)

## When to use

| Situation                                                             | Approach                                    |
| --------------------------------------------------------------------- | ------------------------------------------- |
| Bring-home / handoff work, new staff-facing flow, AWS contract change | Spec → Plan → Tasks → Implement (as needed) |
| Ambiguous requirements                                                | Optional `/speckit-clarify`                 |
| Fear of drift across spec/plan/tasks                                  | Optional `/speckit-analyze`                 |
| Mid-feature “what’s left?”                                            | Optional `/speckit-converge`                |
| Typo, lint, one-line fix, obvious refactor                            | Just code                                   |

## Skills (Cursor)

Installed under `.cursor/skills/speckit-*`. Invoke as `/speckit-specify`, `/speckit-plan`, etc. when you choose to.

## Bring-home north star

See [`specs/001-client-homecoming/spec.md`](../specs/001-client-homecoming/spec.md). That spec defines what “ready for Hanger staff” means. Slice work from it; do not treat every checklist item as a Spec Kit ceremony.

## Active feature specs

| Spec                                                                                            | Intent                                                                                                | Status              |
| ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------- |
| [`001-client-homecoming`](../specs/001-client-homecoming/spec.md)                               | Staff-ready handoff on real devices / client AWS                                                      | North star          |
| [`002-owner-guided-trial`](../specs/002-owner-guided-trial/spec.md)                             | In-UI trial run for Chris — control-by-control discovery                                              | **Shipped**         |
| [`003-manager-event-planning`](../specs/003-manager-event-planning/spec.md)                     | Owner/Manager local events (form/calendar) e.g. Wiley Hay Days 2027-06-18 — ice & essentials planning | **Shipped**         |
| [`004-square-analytics-groundwork`](../specs/004-square-analytics-groundwork/spec.md)           | Square POS connect UX + developer copy-paste groundwork + analytics API contract                      | Spec only (next)    |
| [`005-owner-profit-dataviz`](../specs/005-owner-profit-dataviz/spec.md)                         | Manager/Owner Profit & Ops — Day/Month/Year KPIs + money-in-pocket impact                             | Spec only           |
| [`006-sagemaker-optimization-assistant`](../specs/006-sagemaker-optimization-assistant/spec.md) | SageMaker optimization + optional Hangar AI chat                                                      | Spec only (expand)  |

**Trial / first-use business:** see [`specs/README.md`](../specs/README.md) — shipped wedge is 002+003; refine 004–006 as specs only until a build window opens.

**Gate A:** [`baseline-readiness.md`](./baseline-readiness.md) PASSED before 002/003 builds (historical).
