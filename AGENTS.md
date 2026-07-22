# Hanger Liquor Store Inventory Tool - Agent Rules

You are building the mobile-first inventory optimization PWA for Hanger Liquor Store.

## Core Principles (Never Break)
- Mobile-first: Every component uses Tailwind mobile utilities first. Touch targets ≥48px. Bottom nav on mobile. Large tap areas.
- Simplicity: Rural liquor store users. Clean UI, minimal clicks, intuitive flows. No complex configuration.
- Performance: Small bundles. Lazy load routes. PWA offline support. Fast camera scanning.
- Type Safety: Strict TypeScript. Define interfaces for InventoryItem, Forecast, LocalEvent, etc.
- State: TanStack Query for all server data. Zustand/Jotai only for ephemeral UI state. Optimistic updates on scans/sales.
- Forecasting (Updated):
  - Primary runtime: Lightweight statistical forecasting inside AWS Lambda (weekday patterns + trend + holiday/event multipliers). No heavy ML dependencies in hot path.
  - Model training: AWS SageMaker Canvas (no-code) for building and retraining demand models on historical sales exported from DynamoDB.
  - Optional: SageMaker Serverless Inference endpoints for higher-accuracy on-demand forecasts when needed.
  - Always support local events + static holidays as multipliers.
- Forms: React Hook Form + Zod everywhere.
- Charts: Recharts (lightweight).
- Camera/Scanning: Browser camera (`@zxing/browser` or `html5-qrcode`); Android may use Capacitor ML Kit. Prefer web path unless native packaging is in scope.
- Accessibility & Security: Proper ARIA, input sanitization, no sensitive data logging.
- Testing: Playwright for critical flows (scan, forecast dashboard, event management).

## Folder Structure (Enforce)
```
src/
├── app/
├── components/
├── features/
│   ├── inventory/
│   ├── scan/
│   ├── forecast/
│   └── events/
├── lib/
├── hooks/
├── stores/
├── types/
├── pwa/
└── assets/

backend/
├── lambdas/
│   ├── forecast/
│   └── inventory/
└── shared/
```

## Naming
- Files: kebab-case
- Components: PascalCase
- Types: PascalCase interfaces

## Tech Decisions
- Frontend: React 19 + Vite + TypeScript + Tailwind + shadcn/ui + TanStack Query + Recharts + PWA
- Backend: AWS Lambda (TypeScript) + API Gateway + DynamoDB
- Auth (future): Cognito if multi-user needed
- No heavy state managers. No Redux. No PrimeNG.

## Spec Kit
Optional Spec-Driven Development (no mandatory phases). Constitution: `.specify/memory/constitution.md`. Usage: `docs/spec-kit.md`. Homecoming north star: `specs/001-client-homecoming/spec.md`.

## Repository
https://github.com/Bigessfour/HangarLiquorStore
