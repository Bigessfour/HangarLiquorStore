# Feature Specification: Client Homecoming

**Feature Branch**: `001-client-homecoming` (tracking label; work may land on focused branches)

**Created**: 2026-07-21

**Status**: Active — north star for bringing Hangar Liquor live for staff

**Input**: Bring the inventory PWA/Android app home so Hanger Liquor staff can use it on real devices against the client AWS account without developer babysitting.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Scan and adjust stock on the floor (Priority: P1)

A staff member on the sales floor opens the app on phone (PWA or Android), scans a bottle UPC, confirms the product, and updates quantity — including when Wi‑Fi is weak or briefly offline.

**Why this priority**: Scanning is the daily habit; if this fails, nothing else matters.

**Independent Test**: On a phone, scan a known UPC, see product + stock update, verify offline queue drains when connectivity returns.

**Acceptance Scenarios**:

1. **Given** the app is installed and signed in (or demo mode for training), **When** staff scans a bottle, **Then** product identity and current stock appear within a couple of taps.
2. **Given** connectivity is lost mid-shift, **When** staff continues scanning, **Then** updates queue locally and sync when online without double-counting surprises.
3. **Given** a bad or unknown UPC, **When** scan fails lookup, **Then** staff gets a clear next step (retry / manual entry) — not a blank screen.

---

### User Story 2 - See what to reorder (Priority: P1)

A manager opens the dashboard/forecast view and understands which SKUs need attention, including holiday/event bumps, without configuring ML.

**Why this priority**: The product promise is inventory optimization; reorder clarity is the business outcome.

**Independent Test**: With seeded or live sales history, open forecast dashboard and verify reorder suggestions and event multipliers make sense for Wiley retail patterns.

**Acceptance Scenarios**:

1. **Given** sales history exists, **When** manager opens forecast/dashboard, **Then** they see movers, alerts, and suggested reorder quantities with confidence that is explainable (stat engine, not a black box).
2. **Given** a local event (festival/sports weekend) is entered, **When** forecasts refresh, **Then** affected demand reflects the event multiplier.
3. **Given** Canvas/SageMaker is not configured, **When** staff uses forecasts, **Then** the lightweight Lambda path still works (Canvas remains optional).

---

### User Story 3 - Manage local events (Priority: P2)

Staff adds or edits a Wiley local event that should affect demand, without leaving the app.

**Why this priority**: Local events are a differentiator for a small-town store; secondary only to scan + forecast core.

**Independent Test**: Create/edit/delete an event in the Events UI; confirm it appears in forecast inputs.

**Acceptance Scenarios**:

1. **Given** the Events screen, **When** staff creates an event with dates and impact, **Then** it persists and is visible to forecast logic.
2. **Given** an outdated event, **When** staff removes or ends it, **Then** it no longer inflates demand.

---

### User Story 4 - Install and run without a developer (Priority: P1)

Owner/staff install the app (PWA and/or Android APK), point at the store’s AWS backend, and complete a first-day checklist without Steve on a call.

**Why this priority**: “Home” means client-owned operation, not a laptop demo.

**Independent Test**: Follow `docs/client-deployment.md` + install path on a clean phone; complete scan + dashboard + offline smoke.

**Acceptance Scenarios**:

1. **Given** terraform-applied client AWS resources and a published frontend/APK, **When** staff installs, **Then** the app reaches the API and loads store data.
2. **Given** install docs, **When** a non-developer follows them, **Then** they can complete setup without undocumented steps.
3. **Given** production config, **When** env secrets are used, **Then** no credentials are committed or logged.

---

### Edge Cases

- Offline for an extended period then reconnect with conflicting quantities
- Camera permission denied / ML Kit unavailable → fall back to browser or manual entry
- Empty inventory / first-day store with little sales history (forecasts degrade gracefully)
- API/Lambda errors surface as human-readable toasts, not silent failure

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST support UPC scan → product resolve → stock update on mobile
- **FR-002**: System MUST queue mutations offline and sync safely when online
- **FR-003**: System MUST provide dashboard alerts and reorder suggestions from the Lambda statistical forecast path
- **FR-004**: System MUST apply static holidays and user-managed local events as forecast multipliers
- **FR-005**: System MUST remain usable without SageMaker Canvas / optional inference endpoints
- **FR-006**: Client MUST be able to deploy backend (Terraform) and frontend/APK using documented scripts
- **FR-007**: Critical flows (scan, forecast dashboard, events) MUST be covered by Playwright and verified on a real device before handoff
- **FR-008**: Android packaging MAY be offered as an install path; PWA remains a supported path

### Non-Functional

- Mobile-first UX per constitution (touch ≥48px, simple flows)
- No sensitive data in logs or git
- Small bundles; lazy routes; fast scan feedback

### Out of Scope (for homecoming)

- Full Square catalog sync (documented as future in square-owner-setup)
- Multi-user Cognito unless the store explicitly needs it before handoff
- Heavy redesign of branding/marketing surfaces

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Staff completes scan → stock update on a phone in under ~30 seconds for a known UPC (happy path)
- **SC-002**: Offline scan updates sync successfully after reconnect in a manual device test
- **SC-003**: Forecast dashboard loads with actionable reorder guidance on demo or live data without Canvas
- **SC-004**: `npm run test:critical` passes on the handoff commit
- **SC-005**: A non-developer can install and complete the first-day smoke checklist using only repo docs
- **SC-006**: Production runs in the client AWS account (not a personal demo account) with bills owned by the store

## Assumptions

- Hanger Liquor is a single-store deployment (`store_id` / hanger naming already in terraform scripts)
- Staff phones are modern Android and/or iOS Safari for PWA
- Historical sales may be seeded or imported; perfect POS integration is not required for day-one homecoming
- Demo wedge features: [`002-owner-guided-trial`](../002-owner-guided-trial/spec.md), then [`003-manager-event-planning`](../003-manager-event-planning/spec.md)
