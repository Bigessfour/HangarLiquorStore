# Hangar Liquor Store

Mobile-first inventory optimization PWA for Hanger Liquor Store in Wiley, CO.

Repository: https://github.com/Bigessfour/HangarLiquorStore

## Documentation

See [`docs/README.md`](docs/README.md) for architecture and flow diagrams (scan, dashboard, offline sync).

## Forecast Module

The forecast feature uses a lightweight statistical engine in AWS Lambda:

- Weekday sales patterns + recent trend
- Static US retail holidays (July 4th, Thanksgiving, etc.)
- User-managed local events (Wiley festivals, sports weekends, etc.)
- Suggested reorder quantities and confidence bands

SageMaker Canvas is supported as an optional offline training path (`?model=canvas` when an endpoint is configured).

## Project Structure

```
src/app/                   # App shell, router, layout (FAB + bottom nav)
src/features/dashboard/    # Stock overview, alerts, reorder cards
src/features/scan/         # Camera UPC scanning
src/features/inventory/    # Stock list
src/features/forecast/     # Forecast dashboard and charts
src/features/events/       # Local event management
src/pwa/                   # Service worker + offline queue
backend/lambdas/forecast/  # get-forecast and manage-events handlers
backend/shared/types/      # Shared TypeScript contracts
```

## Getting Started

```bash
npm install
npm --prefix backend install

# Frontend dev server
npm run dev

# Backend unit tests
npm run test:backend

# E2E tests
npx playwright install
npm run test:e2e
```

Copy `.env.example` to `.env` and set `VITE_API_URL` to your API Gateway base URL.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/forecast?horizon=14&upc=` | Demand forecasts |
| GET | `/api/events` | Local events + static holidays |
| POST | `/api/events` | Create local event multiplier |
| DELETE | `/api/events/{id}` | Remove local event |

## DynamoDB Tables

| Table | PK | SK |
|-------|----|----|
| `HangerSalesHistory` | `upc` | `date` |
| `HangerLocalEvents` | `storeId` | `eventId` |
| `HangerInventory` | `upc` | — |