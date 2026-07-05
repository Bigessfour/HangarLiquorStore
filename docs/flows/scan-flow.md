# Scan Flow

Staff tap the **Scan Bottle** FAB → camera opens → UPC detected → optimistic stock update → backend sync → forecast refresh.

## Example: Coors Light 12pk

```mermaid
sequenceDiagram
  participant Staff
  participant FAB as ScanFAB
  participant Cam as html5_qrcode
  participant TQ as TanStackQuery
  participant API as LambdaAPI
  participant FC as ForecastEngine
  Staff->>FAB: Tap Scan Bottle
  FAB->>Cam: Open camera modal
  Cam-->>Staff: UPC 071984000012 Coors Light
  Staff->>TQ: Optimistic stock minus 1
  TQ->>API: POST /api/inventory/scan
  API->>FC: Recalc demand
  FC-->>Staff: Reorder suggestion on Dashboard
```

## Offline behavior

If Wiley internet is down, the scan is queued in IndexedDB. See [offline-sync-flow.md](./offline-sync-flow.md).