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

SageMaker Canvas is supported as an **optional** offline training path (`?model=canvas` when an endpoint is configured). The primary forecast engine is a lightweight statistical model that runs inside Lambda with no extra services required.

See [Docs/client-deployment.md](Docs/client-deployment.md) for how to deploy the backend into Hangar Liquor's own AWS account (they pay AWS bills directly) and the Canvas training workflow.

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

# AWS profile (run this first in PowerShell)
npm run aws:profile
# or: .\scripts\set-aws-profile.ps1
```

Copy `.env.example` to `.env` and set `VITE_API_URL` to your API Gateway base URL.

### AWS Account Setup (Important)

This project uses AWS (Lambda + API Gateway + DynamoDB). You have two AWS accounts configured locally.

**Use your personal account (starts with 5). Do not use the Code Platoon account (starts with 3).**

Run this script in PowerShell from the repo root to configure the correct account for this project:

```powershell
.\scripts\set-aws-profile.ps1
```

This sets `AWS_PROFILE=hanger-personal` for the current session and verifies the identity.

**Tips:**
- Run the script at the start of every terminal session when working on this repo.
- In VS Code / Cursor, also select the `hanger-personal` profile in the AWS Toolkit or Amazon Q extension settings.
- The `aico` profile (Code Platoon) is left untouched.
- The AWS SDK in the backend Lambdas and CLI commands will automatically use this profile.

See `scripts/set-aws-profile.ps1` for details.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/inventory?search=&category=` | List inventory items |
| GET | `/api/inventory/{upc}` | Get single item |
| POST | `/api/inventory` | Add or increment stock |
| PATCH | `/api/inventory/{upc}` | Update item fields |
| POST | `/api/inventory/scan` | Adjust stock by delta (sale scan) |
| POST | `/api/inventory/import` | Bulk CSV import |
| POST | `/api/inventory/sync` | Replay offline queued actions |
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