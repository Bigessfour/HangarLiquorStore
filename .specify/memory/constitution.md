<!--
  Sync Impact Report
  Version change: (template) → 1.0.0
  Modified principles: placeholders → Hangar-specific principles
  Added sections: Tech Stack Constraints; Spec Kit Application (Bring Home)
  Removed sections: none (template placeholders filled)
  Templates: plan-template.md ✅ (Technical Context defaults); spec/tasks templates ⚠ unchanged (still generic, fine)
  Follow-up: AGENTS.md remains day-to-day agent rules; this constitution is Spec Kit governance source
-->

# Hangar Liquor Store Constitution

## Core Principles

### I. Store-First Simplicity
Build for rural liquor-store staff in Wiley, CO: clean UI, minimal clicks, no complex configuration.
Touch targets ≥48px, mobile-first Tailwind, bottom nav on phone, large tap areas.
If a flow needs training to use, redesign it.

### II. Mobile & Offline Reality
Primary surface is phone (PWA and/or Android Capacitor). Offline queue and fast scanning are first-class.
Browser camera scanning remains supported; Android may use Capacitor ML Kit for native barcode speed.
Never assume perfect connectivity on the sales floor.

### III. Typed Contracts & Lean State
Strict TypeScript. Shared interfaces for InventoryItem, Forecast, LocalEvent, and API contracts.
TanStack Query for all server data; Zustand/Jotai only for ephemeral UI; optimistic updates on scans/sales.
React Hook Form + Zod for forms. Recharts only for charts.

### IV. Forecast Without Hot-Path ML
Primary runtime is lightweight statistical demand + cash-impact cover math in AWS Lambda (weekday patterns + trend + holiday/event multipliers + days-of-cover / excess / stockout-risk $).
SageMaker Canvas / Serverless Inference are optional accuracy paths — never required for core reorder or Profit impact. Do not use Amazon Forecast (closed to new customers 2024-07-29).
Local events + static US holidays always influence multipliers.

### V. YAGNI With Proof
Ship the smallest version that gets Hangar staff productive. Prefer Done Detector “good enough” over ceremony.
Complexity must earn its place: justify new services, auth, or UI surfaces against store value.
Critical paths (scan, forecast dashboard, events) stay covered by Playwright.

## Tech Stack Constraints

- Frontend: React 19 + Vite + TypeScript + Tailwind + shadcn/ui + TanStack Query + PWA (+ Capacitor Android when packaging native)
- Backend: AWS Lambda (TypeScript) + API Gateway + DynamoDB
- Infra: Terraform in-repo; client AWS account owns production cost
- Auth: optional Cognito only if multi-user becomes a real store need
- Forbidden by default: Redux, PrimeNG, heavy ML in the request path, native plugins except Capacitor paths already adopted
- Folder layout: `src/features/{inventory,scan,forecast,events}`, `backend/lambdas/{forecast,inventory}`, kebab-case files, PascalCase components/types

`AGENTS.md` is the concise day-to-day agent checklist. This constitution is the Spec Kit governance source; keep them aligned when either changes.

## Spec Kit Application (Bring Home)

Spec Kit exists to replace “prompt and pray” with durable intent — not to add mandatory phases.

**Use Spec Kit when** the work changes product behavior, staff workflow, AWS contracts, or handoff readiness (e.g. offline sync hardening, client deploy polish, forecast UX, Android packaging).

**Skip Spec Kit when** the change is a typo, style tweak, one-line bugfix, or obvious local refactor.

**Default loop (only as needed):** specify → plan → tasks → implement.
Optional skills (`clarify`, `checklist`, `analyze`, `taskstoissues`, `converge`) are tools, never gates.

**Bring-home north star:** Hangar staff can install, scan, see stock/forecasts, manage local events, and sync on real devices against the client AWS account — without developer babysitting.

## Governance

1. Constitution principles supersede ad-hoc agent improvisation when they conflict.
2. Amendments: update this file, bump version (MAJOR = principle removal/redefinition; MINOR = new principle/section; PATCH = clarification), sync `AGENTS.md` if day-to-day rules change.
3. Before merging mid/large features: confirm mobile-first UX, typed contracts, and no hot-path ML unless explicitly scoped.
4. Prefer evidence (device test, Playwright critical suite, terraform apply notes) over narrative “done.”

**Version**: 1.0.0 | **Ratified**: 2026-07-21 | **Last Amended**: 2026-07-21
