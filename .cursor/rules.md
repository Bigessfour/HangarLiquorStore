# Hanger Liquor Store — Cursor Rules

You are building the mobile-first inventory PWA for **Hanger Liquor Store** in Wiley, CO.

## Never break

1. **Mobile-first** — Design for phone screens first. Touch targets ≥48px. Bottom navigation on all main screens. Large, friendly tap areas for rural store staff.
2. **Scan Bottle FAB** — The floating "Scan Bottle" button is the #1 primary action on every screen. Centered above bottom nav, always visible.
3. **Camera scanning** — Use `html5-qrcode` only. No native plugins, no `@zxing` unless explicitly switched.
4. **Data** — TanStack Query for all server state. React Hook Form + Zod for forms. Optimistic updates on scans and stock changes.
5. **UI** — shadcn/ui components only. Dark/light mode via `next-themes`. No PrimeNG, no MUI, no custom unstyled primitives.
6. **PWA** — Offline-first: service worker + IndexedDB queue for spotty Wiley internet. Show sync toasts when draining queue.
7. **TypeScript** — Strict mode. Shared types in `src/types/` and `backend/shared/types/`.
8. **Charts** — Recharts only, keep bundles small. Lazy-load routes.

## Folder structure

```
src/app/           App shell, router, layout
src/components/ui/ shadcn primitives
src/components/common/ BottomNav, ScanBottleFab, SyncToast, PageHeader
src/features/scan/     Camera UPC scanning
src/features/inventory/ Stock list, adjustments
src/features/forecast/  Demand forecast (existing)
src/features/events/    Local events (existing)
src/features/dashboard/ Store overview cards
src/lib/           api-client, utils
src/hooks/         use-online-status, etc.
src/stores/        Zustand ephemeral + offline queue
src/types/         InventoryItem, Forecast, LocalEvent
src/pwa/           SW registration, offline queue
```

## Hanger Liquor Store examples

Use realistic product names in UI and docs:
- **Beer:** Coors Light 12pk, Bud Light
- **Spirits:** Tito's Handmade Vodka 1L, Jack Daniel's Tennessee Whiskey 750ml
- **Alerts:** "Jack Daniel's 750ml — 3 bottles left"
- **Events:** July 4th (+40% beer), Wiley football season (+25% spirits)

## MCP servers (IDE)

- **terraform** — `hashicorp/terraform-mcp-server:1.0.0` via Docker (public registry + optional HCP/TFE with `TFE_TOKEN` / `TFE_ADDRESS`)
- **playwright-mcp / playwright-test / chrome-devtools** — browser testing and PWA inspection

## Backend

- AWS Lambda (TypeScript) + API Gateway + DynamoDB
- Lightweight forecast in Lambda hot path; SageMaker Canvas optional for training
- Tables: `HangerSalesHistory`, `HangerLocalEvents`, `HangerInventory`

## Testing

- Playwright e2e for scan, dashboard, events (mobile Pixel 7 viewport)
- Vitest for backend forecast engine

## Docs

Architecture and flows live in `docs/`. Update docs when changing scan, sync, or dashboard behavior.