# Hanger Liquor Store — Architecture

## System overview

```mermaid
flowchart TB
  subgraph pwa [Hanger PWA]
    UI[React UI]
    FAB[Scan Bottle FAB]
    TQ[TanStack Query]
    IDB[(IndexedDB Queue)]
    SW[Service Worker]
  end
  subgraph aws [AWS Backend]
    APIGW[API Gateway]
    Lambda[Lambda TypeScript]
    DDB[(DynamoDB)]
    Canvas[SageMaker Canvas optional]
  end
  FAB --> UI
  UI --> TQ
  UI --> IDB
  SW --> UI
  TQ -->|online| APIGW
  IDB -->|sync| APIGW
  APIGW --> Lambda --> DDB
  Canvas -.->|train export| DDB
```

## Frontend stack

- React 19 + Vite + TypeScript
- Tailwind CSS + shadcn/ui
- TanStack Query (server state)
- React Hook Form + Zod (forms)
- html5-qrcode (UPC scanning)
- vite-plugin-pwa (offline shell)
- Recharts (forecast charts)

## Backend stack

- AWS Lambda (TypeScript)
- API Gateway
- DynamoDB tables: `HangerSalesHistory`, `HangerLocalEvents`, `HangerInventory`
- Lightweight statistical forecast in Lambda (weekday patterns, holidays, local events)
- Optional SageMaker Canvas for offline model training

## Key routes

| Route | Feature |
|-------|---------|
| `/` | Dashboard — stock overview, alerts |
| `/scan` | Scan page (camera modal) |
| `/inventory` | Full inventory list |
| `/events` | Local events (July 4th, football) |
| `/reports` | Forecast / reorder reports |