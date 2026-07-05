# Hanger Liquor Store Documentation

Mobile inventory PWA for Hanger Liquor Store, Wiley, CO.

## Index

| Doc | Description |
|-----|-------------|
| [Architecture](./architecture.md) | PWA + AWS backend system overview |
| [Scan flow](./flows/scan-flow.md) | Scan Bottle FAB → UPC → optimistic update → forecast |
| [Dashboard flow](./flows/dashboard-flow.md) | Stock overview, movers, alerts, reorder suggestions |
| [Offline sync flow](./flows/offline-sync-flow.md) | IndexedDB queue → sync toast → backend drain |
| [Terraform MCP](./terraform-mcp.md) | Docker MCP server for registry + HCP Terraform |

## Quick start

```bash
npm install
npm --prefix backend install
npm run dev
```

Open http://localhost:5173 on a phone-sized viewport or mobile emulator.