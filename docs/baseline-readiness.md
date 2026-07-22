# Baseline readiness (Gate A)

Living checklist for **demo-solid** before features `002-owner-guided-trial` and `003-manager-event-planning`.

**Homecoming (Gate B)** stays tracked in [`specs/001-client-homecoming/spec.md`](../specs/001-client-homecoming/spec.md) and does **not** block 002/003.

## How we evaluate

Each capability scored on: **Exists** · **Works (demo/mock)** · **Proof** · **Role-correct**.

| Color  | Meaning                                      |
| ------ | -------------------------------------------- |
| Green  | Exists + works + proof                       |
| Yellow | Works with thin proof or accepted limitation |
| Red    | Broken / misleading / blocks Chris demo      |

Severity: **P0** crash/demo-blocker · **P1** embarrassing/misleading · **P2** polish · **Feature** parked as 002/003

## Proof suite (latest run)

| Check                  | Result                     | When                        |
| ---------------------- | -------------------------- | --------------------------- |
| `npm run typecheck`    | Pass                       | 2026-07-21                  |
| `npm run test:backend` | 119/119 pass               | 2026-07-21                  |
| `npm run test:e2e`     | 62/62 pass (Mobile Chrome) | 2026-07-21 (after P1 fixes) |

Demo command (forces mock API even if `.env` has production `VITE_API_URL`):

```bash
npm run demo
```

## Capability matrix (Gate A)

| Capability        | Exists | Works demo        | Proof                                   | Role                      | Score                              |
| ----------------- | ------ | ----------------- | --------------------------------------- | ------------------------- | ---------------------------------- |
| Auth / demo Owner | Y      | Y                 | e2e fixtures                            | Owner auto                | Green                              |
| Dashboard         | Y      | Y                 | `e2e/dashboard.spec.ts`                 | Manager actions gated     | Green                              |
| Scan + FAB        | Y      | Y                 | `e2e/scan.spec.ts`                      | —                         | Green                              |
| Inventory         | Y      | Y                 | `e2e/inventory.spec.ts`                 | Manager edit/CSV          | Green                              |
| Forecast          | Y      | Y                 | `e2e/forecast.spec.ts` + backend engine | —                         | Green                              |
| Events            | Y      | Y                 | `e2e/events.spec.ts`                    | Add Event Manager+        | Green                              |
| Suggestions       | Y      | Y                 | `e2e/suggestions.spec.ts`               | Manager actions           | Green                              |
| Offline queue     | Y      | Y                 | scan offline e2e                        | —                         | Yellow (device reconnect = Gate B) |
| More / install    | Y      | Y                 | `e2e/more.spec.ts`                      | Owner Square/users        | Green                              |
| Nav shell         | Y      | Y                 | `e2e/navigation.spec.ts`                | —                         | Green                              |
| Square (mock)     | Y      | Y (mocked status) | e2e + no proxy spam                     | Owner only                | Green                              |
| User mgmt (mock)  | Y      | Sample owner list | more e2e                                | Mutations blocked in mock | Yellow (Cognito = live)            |

## Gap list

### Fixed in baseline (P1)

| ID   | Symptom                                                                                | Fix                                                                   | Proof                       |
| ---- | -------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | --------------------------- |
| P1-1 | `npm run demo` inherited production `VITE_API_URL` from `.env` → live API + demo token | Force `VITE_API_URL=` (+ clear Cognito) in `package.json` demo script | Demo uses mocks like e2e    |
| P1-2 | Square `/api/square/status` failed in mock → red error on More                         | Mock status via `isMockApi()` in `src/lib/square-api.ts`              | e2e; no failed status fetch |
| P1-3 | `/api/users` failed in mock → empty/noisy Owner user mgmt                              | Mock `listUsers`; block mutations with clear error                    | More shows demo-owner       |
| P1-4 | Events “Add Event” visible for all; dialog no-op for ReadOnly                          | Gate button with `hasRole('Manager')`                                 | Events page role UI         |
| P1-5 | `.env.demo` gitignored despite docs                                                    | `!.env.demo` in `.gitignore`                                          | File trackable              |

### Accepted Yellow (not blocking Gate A)

| Item                                                        | Notes                                            |
| ----------------------------------------------------------- | ------------------------------------------------ |
| Dashboard not in bottom nav                                 | Parked → **002** guided trial routes Chris there |
| No interactive tour                                         | Parked → **002**                                 |
| Events calendar / Hay Days / ice tags / dashboard Add Event | Parked → **003**                                 |
| Offline device reconnect proof                              | Gate B SC-002                                    |
| Client AWS / Cognito production                             | Gate B SC-005/006                                |
| Square OAuth end-to-end                                     | Optional; needs live credentials                 |

### Feature (do not fix in baseline)

- `specs/002-owner-guided-trial/spec.md`
- `specs/003-manager-event-planning/spec.md`

## Manual Chris path (Gate A)

Run `npm run demo`, then:

1. More → Dashboard — low stock / movers visible
2. FAB or Scan — manual UPC → add form
3. Inventory — search / filter
4. More → Local Events — Add Event (Owner), multipliers
5. Forecast — chart / suggestions path
6. Suggestions — items visible
7. More — reset demo catalog, install QR, Square shows optional (not error)

## Active feature specs

| Spec | Intent                      | Status                                                                                        |
| ---- | --------------------------- | --------------------------------------------------------------------------------------------- |
| 001  | Homecoming                  | North star                                                                                    |
| 002  | Guided trial                | Implemented (2026-07-21) — `npm run demo` auto-offers; More → Start trial run                 |
| 003  | Manager events              | Implemented (2026-07-21) — Hay Days, focus tags, dashboard Add event                          |
| 004  | Square analytics groundwork | Next                                                                                          |
| 005  | Owner Profit & Ops dataviz  | Specced — money-in-pocket KPIs ([research-backed](../specs/005-owner-profit-dataviz/spec.md)) |
| 006  | SageMaker + Hangar AI chat  | Specced stub — after 004/005                                                                  |

## Gate A pass criteria

- [x] `npm run typecheck` passes
- [x] `npm run test:backend` passes
- [x] Playwright e2e passes on demo/mock path
- [x] No open P0; P1s fixed or accepted
- [x] Feature work (tour, Hay Days) parked as 002/003
- [x] Manual Chris path — covered by e2e critical routes + post-fix suite (0 proxy errors); spot-check with `npm run demo` before Chris meeting

**Status: Gate A PASSED (2026-07-21)** — baseline ready to start **002**, then **003**. Do not start features until this doc still says PASSED after any further baseline edits.
