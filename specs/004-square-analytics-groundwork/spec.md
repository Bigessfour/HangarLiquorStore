# Feature Specification: Square Analytics Connection Groundwork

**Feature Branch**: `004-square-analytics-groundwork`

**Created**: 2026-07-21

**Status**: Draft — **specs-only** for trial business; next to refine (no implement until build window)

**Trial role:** Unlocks real POS sales for the “money in pocket” story (005/006). Chris only taps Connect; Steve gets copy-paste Part A.

**Input**: Prepare Hangar Liquor’s data / inventory connection to [Square’s platform](https://developer.squareup.com/us/en) for analytics — groundwork so Owner connection is simple and intuitive (“enter this / tap Connect”), not a developer scavenger hunt. Align with Catalog, Inventory, Orders, and Payments APIs for forecasting inputs.

## Current status (brownfield)

| Piece                                                                                                      | Status                                                                                          |
| ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Owner-only OAuth connect/disconnect UI                                                                     | **Exists** — More + Dashboard cards, `/square-setup`                                            |
| Read-only scopes (`MERCHANT_PROFILE_READ`, `ORDERS_READ`, `PAYMENTS_READ`, `ITEMS_READ`, `INVENTORY_READ`) | **Exists** — [backend/lambdas/square/lib/config.ts](../../backend/lambdas/square/lib/config.ts) |
| SSM app id/secret + Dynamo connection tokens                                                               | **Exists** — docs in [docs/square-owner-setup.md](../../docs/square-owner-setup.md)             |
| Chris “tap Connect → Allow” path                                                                           | **Documented**                                                                                  |
| Steve Part A (Developer Dashboard app, redirect URL, SSM paste)                                            | **Documented** — still multi-step                                                               |
| Pull Orders / Catalog / Inventory into Dynamo for forecasts                                                | **Missing / thin** — connect stores tokens; analytics ingest not the daily path yet             |
| UPC mapping Square catalog ↔ Hangar inventory                                                              | **Future** (called out in square-owner-setup)                                                   |
| Mock demo Square                                                                                           | **Mocked status** (Gate A) — no live OAuth in `npm run demo`                                    |

Official platform overview: [Square APIs & SDKs](https://developer.squareup.com/us/en) — commerce APIs for Catalog, Inventory, Orders; payment/list APIs for sales analytics.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Chris connects in plain language (Priority: P1)

As Owner, Chris opens More → Square, sees a short checklist (“credentials ready?” / “use register Square login”), taps **Connect Square account**, authorizes read-only access, and returns to **Connected** with business name — no API keys typed into the phone.

**Why this priority**: User asked for intuitive connection (“enter this code here” style for *developer* prep; Chris only taps Connect).

**Independent Test**: On live (non-mock) env with SSM credentials set, Owner completes OAuth and status shows connected.

**Acceptance Scenarios**:

1. **Given** credentials configured, **When** Owner taps Connect, **Then** Square OAuth opens with Hangar’s registered redirect URL.
2. **Given** successful Allow, **When** returned to app, **Then** Connected state shows merchant/location without exposing tokens.
3. **Given** mock demo, **When** Owner views Square card, **Then** copy explains Square is optional offline / needs live backend — no red failure.

---

### User Story 2 - Steve groundwork is copy-paste simple (Priority: P1)

Developer completes Part A with a single checklist: create Square app → paste **one** redirect URL from terraform → paste Application ID + Secret into two SSM commands (or a small helper script). No ambiguity about which console field maps where.

**Why this priority**: “Enter this code here” is the developer experience that unblocks Chris.

**Independent Test**: Follow checklist on a fresh environment; status endpoint reports `credentialsConfigured: true`.

**Acceptance Scenarios**:

1. **Given** terraform output `square_oauth_redirect_uri`, **When** pasted into Square Developer OAuth redirect URLs, **Then** it matches Lambda callback exactly.
2. **Given** Application ID + secret, **When** stored under documented SSM paths, **Then** `/api/square/status` reports credentials configured.
3. **Given** docs, **When** Steve follows them, **Then** each step names the Square console label and the Hangar field/command side-by-side.

---

### User Story 3 - Analytics data path prepared (Priority: P2)

Design/prepare how connected Square data feeds Hangar analytics: **Orders** + **Payments** for sales history, **Catalog** (`ITEMS_READ`) for UPC/name mapping, **Inventory** for optional reconciliation. Groundwork may be contracts + stub sync job + docs — full sync can follow in a later slice.

**Why this priority**: Connection without a clear analytics contract is incomplete for “inventory optimization.”

**Independent Test**: Spec/contracts list endpoints and Dynamo targets; optional dry-run or stub Lambda documented.

**Acceptance Scenarios**:

1. **Given** a connected merchant, **When** reviewing architecture, **Then** docs map Square APIs → Hangar tables (sales history, products, inventory).
2. **Given** scopes already granted, **When** implementing sync later, **Then** no new OAuth consent required for these read scopes.

---

### Edge Cases

- Sandbox vs production Square apps (`SQUARE_SANDBOX`)
- Expired OAuth state (~10 min) — retry Connect
- Wrong Square seller account — Disconnect + reconnect
- ReadOnly/Manager never see connect controls
- Mock demo must not call live Square

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Owner-only connect/disconnect MUST remain the only mutation path for Square tokens
- **FR-002**: OAuth MUST continue using read-only scopes aligned with Catalog/Inventory/Orders/Payments analytics needs
- **FR-003**: Developer setup MUST document side-by-side “Square console → Hangar value” (redirect URI, Application ID, Application secret)
- **FR-004**: Prefer a helper script or single README section that prints exact `aws ssm put-parameter` commands after terraform output
- **FR-005**: In-app Square UX MUST stay calm in mock mode (no failed-fetch errors)
- **FR-006**: Spec/docs MUST define the analytics ingest contract (Orders/Payments → sales; Catalog → products; Inventory → optional stock check)
- **FR-007**: Tokens MUST never appear in client logs, git, or UI

### Non-Functional

- Mobile-first Owner UX; rural-store plain English
- Follow [Square OAuth](https://developer.squareup.com/docs/oauth-api/overview) and platform APIs from [developer.squareup.com](https://developer.squareup.com/us/en)
- Least privilege — no write scopes unless a future story explicitly expands

### Out of Scope (this feature)

- Full automated nightly sync implementation (may be stubbed/contract-only here)
- Square App Marketplace listing
- Write-back inventory to Square
- Guided trial Square stop as required (002 keeps Square optional)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Steve completes Part A with documented copy-paste steps in under ~15 minutes on a prepared AWS account
- **SC-002**: Chris connects with tap Connect → Allow only (no secrets on device)
- **SC-003**: Analytics contract documented for Orders, Payments, Catalog, Inventory
- **SC-004**: Mock demo Square panel remains error-free

## Assumptions

- Build order: **002** (trial) → **003** (events) → **004** (this Square groundwork), unless connection is needed earlier for a live Chris meeting
- Existing Lambda OAuth remains the transport; this feature hardens UX/docs/contracts more than rewriting auth
- Hangar continues to own forecasting; Square is the POS source of truth for sales when connected
