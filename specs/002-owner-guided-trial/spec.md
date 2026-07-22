# Feature Specification: Owner Guided Trial

**Feature Branch**: `002-owner-guided-trial`

**Created**: 2026-07-21

**Status**: Implemented — Gate A green; demo path ready

**Input**: In-app guided trial run that walks the store owner (Chris) feature-by-feature through each primary control so he discovers what it does — like a product trial, not a static runbook.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Start a guided trial (Priority: P1)

Chris opens the demo app as Owner and is offered (or starts from More) a short guided trial. Each stop highlights one control, explains its job in plain language, and lets him tap Next / Back / Skip.

**Why this priority**: Without guidance, Dashboard is buried and Chris will miss the story of the product.

**Independent Test**: `npm run demo` → auto-offer or More → “Start trial run” → complete or skip without breaking the app.

**Acceptance Scenarios**:

1. **Given** demo Owner (or first visit with trial not completed), **When** the app loads, **Then** a welcome step offers Start trial / Skip.
2. **Given** More page, **When** Chris taps “Start trial run”, **Then** the tour restarts from step 1.
3. **Given** mid-tour, **When** Chris taps Skip, **Then** the overlay closes and the app remains fully usable.

---

### User Story 2 - Discover each primary control (Priority: P1)

The trial walks Chris through Dashboard → Scan → Inventory → Events → Forecast → Suggestions → More/install, highlighting the real UI control and describing what it does for the store.

**Why this priority**: This is the demo deliverable — feature-by-feature discovery.

**Independent Test**: Advance through all stops; each navigates to the correct route and spotlights a real element (`data-tour` targets).

**Acceptance Scenarios**:

1. **Given** step “Home story”, **When** shown, **Then** Chris is on `/` and sees copy about low stock / Top Movers / why the app exists.
2. **Given** step “Scan a bottle”, **When** shown, **Then** FAB or Scan tab is highlighted and copy covers camera / photo / manual UPC.
3. **Given** step “Inventory”, **When** shown, **Then** search/filters/edit intent is explained.
4. **Given** step “Local events”, **When** shown, **Then** Chris understands events bump demand for planning (points ahead to Manager event tools).
5. **Given** step “Forecast”, **When** shown, **Then** statistical forecast + event badges are explained (Canvas optional).
6. **Given** step “Suggestions”, **When** shown, **Then** reorder actions are explained.
7. **Given** step “More & install”, **When** shown, **Then** reset demo catalog + phone install QR are highlighted; trial can mark complete.

---

### User Story 3 - Resume and remember completion (Priority: P2)

If Chris closes mid-trial, progress is remembered. Completed trials do not auto-nag every load (can restart from More).

**Why this priority**: Smooth demo; avoid annoyance after first complete.

**Independent Test**: Advance to step 4, reload, resume; complete once, reload, no auto-offer.

**Acceptance Scenarios**:

1. **Given** trial paused at step N, **When** app reloads, **Then** optional resume prompt or More restart works.
2. **Given** trial completed, **When** app reloads, **Then** no auto-offer (More still offers restart).

---

### Edge Cases

- ReadOnly user: tour may still teach view-only screens; do not spotlight Manager-only actions as if they can tap them (or label “Manager/Owner only”).
- Narrow phone viewport: spotlight and copy must remain readable; touch targets ≥48px for Next/Back/Skip.
- Laptop without camera: scan step must mention manual UPC / photo as valid.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide an in-app guided trial overlay (spotlight + title + body + Next/Back/Skip + progress)
- **FR-002**: System MUST navigate to the correct route for each stop before highlighting
- **FR-003**: System MUST include stops for: Welcome, Dashboard `/`, Scan (FAB or `/scan`), Inventory, Events, Forecast, Suggestions, More/install
- **FR-004**: System MUST offer “Start trial run” on More (and optional auto-offer for demo Owner / first run)
- **FR-005**: System MUST persist progress/completion in localStorage (or equivalent client storage)
- **FR-006**: Tour MUST use stable selectors (e.g. `data-tour="…"`) on target controls
- **FR-007**: Tour MUST work in `VITE_DEMO_AUTH` mock demo without Cognito

### Non-Functional

- Mobile-first; copy in store-owner plain English (Wiley / Hangar Liquor voice)
- No heavy tour library required if a small custom spotlight is enough; if a library is used, keep bundle impact small
- Does not block core flows when skipped

### Out of Scope

- Voiceover video / recorded demo reel
- Live Cognito-only onboarding
- Square OAuth as a required stop
- Forcing a successful camera scan (manual UPC counts)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Chris can complete all stops in under ~5 minutes on phone or laptop
- **SC-002**: Every stop highlights a real control that exists on that screen
- **SC-003**: Skip leaves the app fully usable with no stuck overlay
- **SC-004**: Demo path (`npm run demo`) shows the trial without extra config

## Assumptions

- First Chris meeting uses mock demo (`npm run demo`), not production Cognito
- Homecoming north star (`001-client-homecoming`) still defines handoff; this feature is the demo wedge
- Related: `003-manager-event-planning` deepens events after Chris understands the concept in the tour
