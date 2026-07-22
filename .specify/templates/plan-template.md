# Implementation Plan: [FEATURE]

**Branch**: `[###-feature-name]` | **Date**: [DATE] | **Spec**: [link]

**Input**: Feature specification from `/specs/[###-feature-name]/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

[Extract from feature spec: primary requirement + technical approach from research]

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: TypeScript (strict) — React 19 frontend, Node.js Lambda backend

**Primary Dependencies**: Vite, Tailwind, shadcn/ui, TanStack Query, React Hook Form + Zod, Recharts, Capacitor (Android), AWS Lambda/API Gateway/DynamoDB, Terraform

**Storage**: DynamoDB (inventory, sales, events); IndexedDB offline queue on device

**Testing**: Playwright critical flows (scan, forecast dashboard, events); backend unit/integration via `npm run test:backend`

**Target Platform**: Mobile-first PWA (phone); Android APK via Capacitor when packaged; desktop browsers secondary

**Project Type**: Mobile inventory PWA + serverless AWS API

**Performance Goals**: Fast camera/scan feedback; small frontend bundles; Lambda forecast without heavy ML in hot path

**Constraints**: Touch ≥48px; offline-capable core flows; no Redux/PrimeNG; Canvas/SageMaker optional only; client AWS account owns prod cost

**Scale/Scope**: Single store (Hanger Liquor, Wiley CO); small staff; hundreds–low thousands of SKUs

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [ ] Store-first simplicity (rural staff, minimal clicks)
- [ ] Mobile/offline reality preserved
- [ ] Typed contracts + TanStack Query (no Redux)
- [ ] Forecast stays lightweight in Lambda hot path
- [ ] YAGNI — complexity justified or cut

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)
<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```text
src/
├── app/
├── components/
├── features/{inventory,scan,forecast,events}/
├── lib/ hooks/ stores/ types/ pwa/
backend/
├── lambdas/{forecast,inventory}/
└── shared/
android/                 # Capacitor native shell when packaging APK
e2e/                     # Playwright
terraform/
```

**Structure Decision**: Use the Hangar monorepo layout above unless the feature
explicitly needs a new top-level area (justify in Complexity Tracking).

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation                  | Why Needed         | Simpler Alternative Rejected Because |
| -------------------------- | ------------------ | ------------------------------------ |
| [e.g., 4th project]        | [current need]     | [why 3 projects insufficient]        |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient]  |
