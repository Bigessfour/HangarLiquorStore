# Offline Sync Flow

Wiley, CO has spotty internet. The PWA queues staff actions locally and syncs when connectivity returns.

```mermaid
sequenceDiagram
  participant Staff
  participant App
  participant IDB as IndexedDB
  participant API as Backend
  Staff->>App: Scan Titos Vodka offline
  App->>IDB: Queue scan action
  App->>Staff: Queued badge plus sync toast
  Note over App: Connection restored
  App->>IDB: Drain queue oldest first
  App->>API: Batch POST queued actions
  API-->>App: Confirm updates
  App->>Staff: Sync complete toast
```

## Queued action shape

```typescript
interface QueuedAction {
  id: string;
  type: 'scan' | 'adjust' | 'sale';
  payload: { upc: string; delta: number };
  timestamp: number;
}
```

## UX rules

- Always show queued count in sync toast
- Optimistic UI updates immediately even when offline
- Retry failed sync items with exponential backoff