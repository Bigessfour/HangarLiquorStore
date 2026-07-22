# Feature Specification: Square Analytics Connection Groundwork

**Feature Branch**: `004-square-analytics-groundwork`

**Created**: 2026-07-21

**Status**: Shipped — full outline + implementation (no YAGNI cut)

**Trial role:** Unlocks real POS sales for the “money in pocket” story (005/006). Chris only taps Connect / Sync; Steve gets copy-paste Part A + helper script.

**Input**: Prepare Hangar Liquor’s data / inventory connection to [Square’s platform](https://developer.squareup.com/us/en) for analytics — Owner connection stays simple (“tap Connect”), developer prep is copy-paste, and connected Square data **actually lands** in Hangar tables for forecasting and Profit & Ops.

## Current status (brownfield → target)

| Piece                                | Before 004    | After 004                                                      |
| ------------------------------------ | ------------- | -------------------------------------------------------------- |
| Owner OAuth connect/disconnect       | Exists        | Polished checklist + sync CTA                                  |
| Read-only OAuth scopes               | Exists        | Unchanged (no write scopes)                                    |
| SSM app id/secret + Dynamo tokens    | Exists        | Helper script + docs                                           |
| Token refresh                        | Missing       | Implemented before every sync                                  |
| Orders → `HangerSalesHistory`        | Missing       | On-demand + scheduled sync                                     |
| Catalog → UPC map / `HangerProducts` | Missing       | Sync barcodes → product stubs                                  |
| Inventory → stock reconcile          | Missing       | Optional overwrite of `currentStock` when Square count present |
| Payments rollup                      | Missing       | Period totals stored on connection / returned by sync          |
| Mock demo Square                     | Mocked status | Sync mocked; no live Square calls                              |

Official platform overview: [Square APIs & SDKs](https://developer.squareup.com/us/en).

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Chris connects in plain language (Priority: P1)

As Owner, Chris opens More → Square, sees a short checklist (“credentials ready?” / “use register Square login”), taps **Connect Square account**, authorizes read-only access, and returns to **Connected** with business name — no API keys on the phone.

**Acceptance Scenarios**:

1. **Given** credentials configured, **When** Owner taps Connect, **Then** Square OAuth opens with Hangar’s registered redirect URL (including `redirect_uri` on authorize).
2. **Given** successful Allow, **When** returned to app, **Then** Connected state shows merchant/location without exposing tokens.
3. **Given** mock demo, **When** Owner views Square card, **Then** copy explains Square needs live backend — no red failure.

---

### User Story 2 - Steve groundwork is copy-paste simple (Priority: P1)

Developer completes Part A with a single checklist + helper:

```bash
npx tsx scripts/setup-square-ssm.ts --application-id=sq0idp-... --application-secret=sq0csp-...
```

Script reads terraform outputs (`square_ssm_prefix`, `square_oauth_redirect_uri`), prints the redirect URL to paste into Square Developer OAuth, and writes SSM parameters.

**Acceptance Scenarios**:

1. **Given** terraform outputs, **When** script runs with id+secret, **Then** `/api/square/status` reports `credentialsConfigured: true`.
2. **Given** docs, **When** Steve follows them, **Then** each step names Square console label ↔ Hangar field/command.

---

### User Story 3 - Owner syncs analytics into Hangar (Priority: P1)

Connected Owner taps **Sync Square data** (or nightly schedule runs). Hangar pulls:

| Square API                   | Hangar target                                           | Purpose                 |
| ---------------------------- | ------------------------------------------------------- | ----------------------- |
| Orders (`ORDERS_READ`)       | `HangerSalesHistory` (`upc` + `date` + `quantity`)      | Forecast + Profit sales |
| Catalog (`ITEMS_READ`)       | `HangerProducts` (+ barcode→UPC map on connection)      | Name/UPC resolution     |
| Inventory (`INVENTORY_READ`) | `HangerInventory.currentStock` (when mapped UPC exists) | Stock reconcile         |
| Payments (`PAYMENTS_READ`)   | Sync summary totals (gross / fees proxy)                | Profit pulse            |

**Acceptance Scenarios**:

1. **Given** connected merchant with orders, **When** sync completes, **Then** sales rows appear keyed by UPC/date.
2. **Given** catalog items with barcodes, **When** sync runs, **Then** products table gains/updates those UPCs.
3. **Given** inventory counts for mapped catalog objects, **When** sync runs, **Then** Hangar stock updates for matching UPCs only (never invents unmapped SKUs as sales without barcode).
4. **Given** expired access token + valid refresh, **When** sync starts, **Then** tokens refresh transparently and sync proceeds.
5. **Given** mock demo, **When** Owner taps Sync, **Then** mock returns success summary without calling Square.

---

### User Story 4 - Nightly automatic sync (Priority: P2)

EventBridge schedule invokes Square Lambda with `{ "source": "scheduled-sync" }` once per day (store timezone approx America/Denver → 05:00 UTC default). Owner can still force sync anytime.

**Acceptance Scenarios**:

1. **Given** connected store, **When** schedule fires, **Then** same sync path runs as manual.
2. **Given** not connected, **When** schedule fires, **Then** Lambda no-ops with logged skip (not error storm).

---

### Edge Cases

- Sandbox vs production Square apps (`SQUARE_SANDBOX`)
- Expired OAuth state (~10 min) — retry Connect
- Wrong seller account — Disconnect + reconnect
- Line items without barcode/UPC — skip with `unmappedLineItems` count in summary (do not invent UPCs)
- ReadOnly/Manager never see connect/sync controls
- Mock demo must not call live Square
- Sync timeout: default lookback 90 days; paginate Square cursors

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: Owner-only connect/disconnect/sync MUST be the only mutation path for Square tokens and ingest
- **FR-002**: OAuth MUST use read-only scopes: `MERCHANT_PROFILE_READ`, `ORDERS_READ`, `PAYMENTS_READ`, `ITEMS_READ`, `INVENTORY_READ`
- **FR-003**: Authorize URL MUST include `client_id`, `scope`, `state`, `session=false`, and `redirect_uri`
- **FR-004**: Developer setup MUST include helper script `scripts/setup-square-ssm.ts` + side-by-side docs
- **FR-005**: In-app Square UX MUST stay calm in mock mode
- **FR-006**: `POST /api/square/sync` MUST run catalog → sales → inventory → payments (order flexible) and return a summary
- **FR-007**: Sync MUST refresh OAuth tokens when needed before Square API calls
- **FR-008**: Orders MUST aggregate into `HangerSalesHistory` by barcode/UPC and calendar date (YYYY-MM-DD)
- **FR-009**: Catalog MUST upsert `HangerProducts` for items with barcodes
- **FR-010**: Inventory MUST update `currentStock` only for Hangar inventory rows whose UPC matches a Square barcode
- **FR-011**: Connection record MUST store `lastSyncAt`, `lastSyncSummary` (no tokens)
- **FR-012**: Status response MUST include last sync metadata when present
- **FR-013**: Tokens MUST never appear in client logs, git, or UI
- **FR-014**: Terraform MUST wire table env vars, sync route, and EventBridge schedule for daily sync

### Non-Functional

- Mobile-first Owner UX; rural-store plain English
- Square OAuth + Commerce APIs from [developer.squareup.com](https://developer.squareup.com/us/en)
- Least privilege — no write scopes
- Sync Lambda timeout ≥ 60s; memory enough for pagination

### Analytics ingest contract

```
Square Orders (COMPLETED / OPEN completed) line_items
  → barcode / catalog_object_id → UPC
  → sold date (created_at local date)
  → quantity sum
  → PutItem HangerSalesHistory { upc, date, quantity, source: "square" }

Square Catalog ITEM_VARIATION
  → upc = item_variation_data.upc || first barcode
  → PutItem HangerProducts { upc, name, category?, squareCatalogObjectId, squareVariationId, updatedAt }

Square Inventory counts
  → variation → UPC map
  → if HangerInventory[upc] exists: Update currentStock = quantity

Square Payments (optional rollup)
  → sum amount_money for period → lastSyncSummary.paymentsGrossCents
```

### Out of Scope

- Square App Marketplace listing
- Write-back inventory/orders to Square
- Guided trial requiring Square (002 keeps Square optional)
- Multi-location picker UI (uses primary ACTIVE location; sync all locations when location list returned)

## Success Criteria _(mandatory)_

- **SC-001**: Steve completes Part A with helper script in under ~15 minutes
- **SC-002**: Chris connects with tap Connect → Allow only
- **SC-003**: After sync, sales history and/or sync summary visible to Owner
- **SC-004**: Mock demo Square panel remains error-free
- **SC-005**: Backend tests cover scopes + sync summary shaping (unit); e2e covers Owner sync CTA in mock

## Assumptions

- Hangar owns forecasting; Square is POS source of truth for sales when connected
- Existing Lambda OAuth remains transport; this feature completes the analytics path
- 005/006 consume synced sales + inventory

## Related specs

| Spec                                                   | Role                                       |
| ------------------------------------------------------ | ------------------------------------------ |
| [005](../005-owner-profit-dataviz/spec.md)             | Consumes sales for Profit & Ops            |
| [006](../006-sagemaker-optimization-assistant/spec.md) | Uses sales for optimization + AI grounding |
