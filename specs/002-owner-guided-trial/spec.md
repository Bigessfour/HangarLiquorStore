# Feature Specification: Owner Guided Trial

**Feature Branch**: `002-owner-guided-trial`

**Created**: 2026-07-21

**Updated**: 2026-07-29 — v2 confidence walkthrough (Profit stop, Try it, reliability gate)

**Status**: Implemented — Gate A green; demo path ready; v2 Try it + Profit

**Input**: In-app guided trial run that walks the store owner (Chris) feature-by-feature through each primary control so he discovers what it does — like a product trial, not a static runbook.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Start a guided trial (Priority: P1)

Chris opens the demo app as Owner and is offered (or starts from More) a short guided trial. Each stop highlights one control, explains its job in plain language, and lets him tap Next / Back / Skip. Interactive stops offer **Try it**.

**Why this priority**: Without guidance, Dashboard is buried and Chris will miss the story of the product.

**Independent Test**: `npm run demo` → auto-offer or More → “Start trial run” → complete or skip without breaking the app.

**Acceptance Scenarios**:

1. **Given** demo Owner (or first visit with trial not completed), **When** the app loads, **Then** a welcome step offers Start trial / Skip.
2. **Given** More page, **When** Chris taps “Start trial run”, **Then** the tour restarts from step 1.
3. **Given** mid-tour, **When** Chris taps Skip, **Then** the overlay closes and the app remains fully usable.

---

### User Story 2 - Discover each primary control (Priority: P1)

The trial walks Chris through Dashboard → Scan → Inventory → Events → Forecast → Suggestions → **Profit & Ask Hangar** → More/install, highlighting the real UI control and describing what it does for the store.

**Why this priority**: This is the demo deliverable — feature-by-feature discovery.

**Independent Test**: Advance through all stops; each navigates to the correct route and spotlights a real element (`data-tour` targets).

**Acceptance Scenarios**:

1. **Given** step “Home story”, **When** shown, **Then** Chris is on `/` and sees copy about low stock / Top Movers / why the app exists.
2. **Given** step “Scan a bottle”, **When** shown, **Then** Scan is highlighted and copy covers camera / photo / manual UPC; **Try it** applies a demo UPC.
3. **Given** step “Inventory”, **When** shown, **Then** search/filters/edit intent is explained.
4. **Given** step “Local events”, **When** shown, **Then** Chris understands Hay Days / hunting bump demand; **Try it** opens Hay Days preset.
5. **Given** step “Forecast”, **When** shown, **Then** 14-day demand + events/holidays are explained in plain English.
6. **Given** step “Suggestions”, **When** shown, **Then** reorder + holiday stocking are explained; **Try it** can Add to Stock.
7. **Given** step “Profit & Ask Hangar”, **When** shown, **Then** cash-in-pocket + Ask Hangar are explained with honest demo labels; **Try it** asks a holiday question.
8. **Given** step “More & install”, **When** shown, **Then** reset demo catalog + phone install are highlighted; trial can mark complete.

---

### User Story 3 - Resume and remember completion (Priority: P2)

If Chris closes mid-trial, progress is remembered. Completed trials do not auto-nag every load (can restart from More).

**Why this priority**: Smooth demo; avoid annoyance after first complete.

**Independent Test**: Advance to step 4, reload, resume; complete once, reload, no auto-offer.

**Acceptance Scenarios**:

1. **Given** trial paused at step N, **When** app reloads, **Then** optional resume prompt or More restart works.
2. **Given** trial completed, **When** app reloads, **Then** no auto-offer (More still offers restart).

---

### User Story 4 - Confidence via Try it (Priority: P1)

Interactive stops expose a **Try it** control that drives a real working UI action (manual UPC, Hay Days form, Add to Stock, Ask Hangar chip). Next remains allowed so demos never trap.

**Independent Test**: `e2e/chris-walkthrough.spec.ts` Try it cases + smoke clicks.

---

### Edge Cases

- ReadOnly user: tour may still teach view-only screens; do not spotlight Manager-only actions as if they can tap them (or label “Manager/Owner only”).
- Narrow phone viewport: spotlight and copy must remain readable; touch targets ≥48px for Next/Back/Skip/Try it.
- Laptop without camera: scan step must mention manual UPC / photo as valid; Try it uses manual UPC.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide an in-app guided trial overlay (spotlight + title + body + Next/Back/Skip + progress)
- **FR-002**: System MUST navigate to the correct route for each stop before highlighting
- **FR-003**: System MUST include stops for: Welcome, Dashboard `/`, Scan, Inventory, Events, Forecast, Suggestions, **Profit `/profit`**, More/install
- **FR-004**: System MUST offer “Start trial run” on More (and optional auto-offer for demo Owner / first run)
- **FR-005**: System MUST persist progress/completion in localStorage (or equivalent client storage)
- **FR-006**: Tour MUST use stable selectors (e.g. `data-tour="…"`) on target controls
- **FR-007**: Tour MUST work in `VITE_DEMO_AUTH` mock demo without Cognito
- **FR-008**: Interactive stops MUST offer **Try it** that activates a real control (`tryTestId` / scan UPC path); Next MUST remain available
- **FR-009**: Demo More page MUST show a short “Before Chris sits down” prep checklist

### Non-Functional

- Mobile-first; copy in store-owner plain English (Wiley / Hangar Liquor voice)
- No heavy tour library required if a small custom spotlight is enough; if a library is used, keep bundle impact small
- Does not block core flows when skipped
- Honesty: simulation banners stay; Square Connect is not a required tour stop

### Out of Scope

- Voiceover video / recorded demo reel
- Live Cognito-only onboarding
- Square OAuth as a required stop
- Forcing a successful camera scan (manual UPC counts)
- Bottom-nav redesign to put Dashboard in primary tabs

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Chris can complete all stops in under ~5–8 minutes on phone or laptop
- **SC-002**: Every stop highlights a real control that exists on that screen
- **SC-003**: Skip leaves the app fully usable with no stuck overlay
- **SC-004**: Demo path (`npm run demo`) shows the trial without extra config
- **SC-005**: Chris walkthrough e2e passes with no failed `/api/*` responses and no uncaught page errors on demo
- **SC-006**: Every Try it / smoke click in `e2e/chris-walkthrough.spec.ts` succeeds

## Assumptions

- First Chris meeting uses mock demo (`npm run demo`), not production Cognito
- Homecoming north star (`001-client-homecoming`) still defines handoff; this feature is the demo wedge
- Related: `003-manager-event-planning` deepens events after Chris understands the concept in the tour
- Meeting script: `docs/chris-walkthrough.md`
