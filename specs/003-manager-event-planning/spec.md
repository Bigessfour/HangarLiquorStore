# Feature Specification: Manager Event Planning

**Feature Branch**: `003-manager-event-planning`

**Created**: 2026-07-21

**Status**: Implemented — Manager dashboard + focus tags + Hay Days example

**Input**: Let the owner/manager add local events (calendar and/or form) — e.g. **Wiley Hay Days on June 18, 2027** — so inventory planning reviews demand for product, ice, and other liquor-store essentials. This is an Owner/Manager capability, not a general staff (ReadOnly) function. Surface it from the owner dashboard / Manager tools.

## Current status (brownfield)

| Capability                                                          | Status today                                                                                                          |
| ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Add event form (name, start/end **date fields**, multiplier, notes) | **Exists** — `EventFormDialog`                                                                                        |
| Full calendar UI (month grid / pick day)                            | **Missing** — HTML `type="date"` only                                                                                 |
| Role gate on create                                                 | **Partial** — form requires Manager+; Events page “Add Event” button is visible to all but dialog no-ops for ReadOnly |
| Quick toggles (July 4th / Rodeo)                                    | **Exists** — Manager+ on Events page                                                                                  |
| Dashboard create/plan event                                         | **Weak** — “Apply event multiplier” only; no first-class “Add local event” / Hay Days planning                        |
| Category focus (ice, beer, spirits, essentials)                     | **Missing** — free-text notes only                                                                                    |
| Example seed: Wiley Hay Days 2027-06-18                             | **Missing**                                                                                                           |

So: form-based dates work; calendar polish + dashboard Manager entry + planning categories are the gaps.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Owner/Manager adds Wiley Hay Days (Priority: P1)

Chris (Owner) or a Manager opens event planning and creates **Wiley Hay Days** with start/end around **2026-06-18** wait — user said **June 18, 2027**. Dates: 2027-06-18 (and optional multi-day end). Multiplier and focus notes cover beer, ice, and store essentials. Forecast/suggestions later reflect the boost.

**Why this priority**: Concrete store event Chris already knows; proves local planning.

**Independent Test**: As Manager+, create “Wiley Hay Days” dated 2027-06-18 → appears in event list/badges → forecast path includes the multiplier for that window.

**Acceptance Scenarios**:

1. **Given** Manager or Owner, **When** they open Add Event (Events page or Dashboard entry), **Then** they can enter name, dates, multiplier, and planning notes.
2. **Given** form filled as Wiley Hay Days / 2027-06-18 / suitable end date / multiplier (e.g. 1.4) / notes mentioning ice & RTDs, **When** saved, **Then** the event appears in Upcoming Multipliers and is available to forecast logic.
3. **Given** ReadOnly staff, **When** they visit Events or Dashboard, **Then** they can **view** upcoming events but cannot create/edit/delete (no Manager controls).

---

### User Story 2 - Plan from Owner Dashboard (Priority: P1)

From the Dashboard (owner/manager home story), Chris can start “Add local event” without hunting only under More → Events. The flow uses the same form (and optional calendar date pick) as Events page.

**Why this priority**: User asked for dashboard / Manager function, not a buried staff tool.

**Independent Test**: As Manager+, from `/` open Add local event → save Hay Days → see confirmation and event reflected on dashboard event UI.

**Acceptance Scenarios**:

1. **Given** Manager+, **When** on Dashboard, **Then** a clear control exists to add/plan a local event.
2. **Given** ReadOnly on Dashboard, **When** viewing, **Then** that control is hidden (view-only event summary OK).

---

### User Story 3 - Date entry via form and clearer calendar affordance (Priority: P2)

Owner/Manager picks dates with the existing date fields, improved for mobile (large targets). Optional enhancement: a simple month calendar picker or native date UX that makes “June 18, 2027” obvious — not a heavy scheduling product.

**Why this priority**: Date fields already work; calendar polish reduces demo friction.

**Independent Test**: Set start 2027-06-18 and end ≥ start on phone-sized viewport without keyboard pain.

**Acceptance Scenarios**:

1. **Given** Add Event form, **When** Manager sets start/end, **Then** invalid ranges (end before start) are blocked with clear errors.
2. **Given** mobile viewport, **When** opening date controls, **Then** touch targets meet ≥48px guidance.

---

### User Story 4 - Planning focus for ice & essentials (Priority: P2)

When creating an event, Manager can tag or note demand focus (e.g. Ice, Beer/RTD, Spirits, Essentials) so planning copy and future suggestions can emphasize those categories — starting with structured optional fields or chips, not free-form only.

**Why this priority**: Hay Days drives ice and volume SKUs; notes alone are easy to miss in forecast UX.

**Independent Test**: Create Hay Days with Ice + Beer focus; event detail shows those focuses; forecast/dashboard copy or badges can surface “ice/essentials” intent (even if multiplier remains global in v1).

**Acceptance Scenarios**:

1. **Given** Add Event form, **When** Manager selects one or more focus chips (Ice, Beer/RTD, Spirits, Essentials), **Then** they persist on the event.
2. **Given** an event with Ice focus, **When** viewing event list/dashboard summary, **Then** focus is visible without opening raw JSON.

---

### Edge Cases

- Multi-day festivals (start ≠ end)
- Overlapping events (both apply or highest wins — document current Lambda/mock behavior; do not invent complex stacking rules in v1)
- Past-dated events (allow for history, or warn — prefer allow + badge “past”)
- ReadOnly attempting deep link to create — denied

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Manager and Owner MUST be able to create local events with name, startDate, endDate, multiplier, notes
- **FR-002**: ReadOnly users MUST NOT create, edit, or delete local events
- **FR-003**: Dashboard MUST expose Manager+ entry to add/plan a local event (reuse shared form)
- **FR-004**: Events page “Add Event” MUST be hidden or disabled for ReadOnly (not just empty dialog)
- **FR-005**: System MUST support creating **Wiley Hay Days** on **2027-06-18** (demo seed or one-tap example optional)
- **FR-006**: System SHOULD offer focus tags: Ice, Beer/RTD, Spirits, Essentials (persist on event)
- **FR-007**: Date entry MUST validate endDate ≥ startDate
- **FR-008**: Created events MUST feed existing forecast multiplier path (no separate ML required)
- **FR-009**: Optional demo seed or “Add Wiley Hay Days example” for Manager+ trial demos

### Non-Functional

- Mobile-first form; RHF + Zod
- Owner/Manager only mutations; align with `hasRole('Manager')`
- Keep calendar enhancement lightweight (native date or small picker — no full scheduling suite)

### Out of Scope

- Per-SKU automatic purchase orders
- Square inventory sync from events
- Complex multi-multiplier stacking algorithm redesign
- ReadOnly self-service event creation
- Recurring event rules engine (v1 = single dated events)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Manager creates Wiley Hay Days (2027-06-18) in under ~60 seconds
- **SC-002**: ReadOnly cannot open a working create form from Dashboard or Events
- **SC-003**: New event appears in Upcoming Multipliers and influences forecast window for those dates (mock and/or API)
- **SC-004**: Focus tags (ice/essentials/etc.) visible on event summary after save
- **SC-005**: Guided trial (`002`) can point at this Manager flow without exposing it as a ReadOnly action

## Assumptions

- Role hierarchy already treats Owner ≥ Manager ≥ ReadOnly (`hasRole('Manager')` covers Owner)
- Global demand multiplier remains the forecast lever in v1; focus tags guide humans and UI copy first
- Example event date is **2027-06-18** (Wiley Hay Days) as stated by product owner
- Builds after or alongside `002-owner-guided-trial`; tour mentions events, this feature deepens Manager planning
