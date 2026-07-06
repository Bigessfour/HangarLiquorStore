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

**Developed by Steve McKitrick, AWS Certified AI Practitioner** — Premium AI forecasting features (SageMaker Canvas integration).

### UPC Lookup (Free)
UPC product metadata uses Open Food Facts (free open data). We comply with their terms:
- 1 API call per real user scan
- Proper User-Agent and attribution (visible in UI)
- For bulk/offline: Use full data exports loaded into AWS (see terraform/README.md for S3 + DynamoDB product catalog from dump)
- Notify re-use: reuse@openfoodfacts.org (recommended)

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

### Full Development Environment Setup (Clone & Develop)

This project uses **MCP (Model Context Protocol)** servers heavily for AI-assisted development (Terraform, Playwright, Chrome DevTools, GitHub, etc.). The `mcps/` directory contains the shared tool definitions so other developers get the same capabilities.

**Prerequisites**
- Node.js 20+ (LTS recommended)
- Docker Desktop (required for terraform-mcp-server)
- AWS CLI (configured with your profile)
- Git

**Steps**

```bash
git clone https://github.com/Bigessfour/HangarLiquorStore.git
cd HangarLiquorStore

# One-command setup (recommended)
./scripts/dev-setup.sh          # macOS / Linux
# or on Windows PowerShell:
# .\scripts\set-aws-profile.ps1 ; npm install ; npm --prefix backend install ; npx playwright install

# Or manual steps
npm install
npm --prefix backend install
npx playwright install
```

The `dev-setup.sh` script handles dependencies, Playwright, .env, and prints MCP/AWS hints.

**Run the app**
```bash
npm run dev          # Frontend on http://localhost:5173
npm run test:backend
npm run test:e2e
```

### MCP / AI Development Tools

The repo includes ready-to-use MCP configurations:

- [`docs/mcp-setup.md`](docs/mcp-setup.md) – **Canonical server list + sync checklist** (start here)
- `.cursor/mcp.json` – Cursor IDE
- `.vscode/mcp.json` – VS Code
- `.grok/config.toml` – Grok CLI
- `mcps/` – Shared tool definitions (commit this so everyone has the same tools)

**On macOS (after cloning):**
- Install Docker Desktop
- Install recommended extensions (see .vscode/extensions.json)
- Restart Cursor / VS Code so MCP servers load

The MCP servers provide:
- Terraform registry + HCP integration
- Playwright browser control & testing
- Chrome DevTools
- GitHub operations (issues, PRs, etc.)

See `Docs/` for architecture and flows.

Copy `.env.example` to `.env` and set `VITE_API_URL` to your API Gateway base URL (or leave empty for mocks).

### AWS & Environment Setup

This project uses AWS (Lambda + API Gateway + DynamoDB).

**Recommended (Mac / Linux):**
```bash
./scripts/dev-setup.sh
```

**Windows:**
```powershell
.\scripts\set-aws-profile.ps1
npm install
npm --prefix backend install
npx playwright install
```

**Manual cross-platform:**
```bash
export AWS_PROFILE=hanger-personal   # macOS/Linux
# $env:AWS_PROFILE = "hanger-personal"  # Windows PowerShell

npm install
npm --prefix backend install
npx playwright install
```

Use the `hanger-personal` profile (your personal AWS account starting with 5). Never use the Code Platoon account.

See:
- `scripts/dev-setup.sh`
- `scripts/set-aws-profile.sh` / `.ps1`
- `Docs/client-deployment.md` for client AWS + invoicing details.

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