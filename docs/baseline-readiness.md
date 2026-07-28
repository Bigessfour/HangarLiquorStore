# Baseline readiness

Living checklist for **demo-solid** Hangar Liquor inventory PWA.

**Homecoming (Gate B)** stays tracked in [`specs/001-client-homecoming/spec.md`](../specs/001-client-homecoming/spec.md).

## How we evaluate

Each capability scored on: **Exists** · **Works (demo/mock)** · **Proof** · **Role-correct**.

| Color  | Meaning                                      |
| ------ | -------------------------------------------- |
| Green  | Exists + works + proof                       |
| Yellow | Works with thin proof or accepted limitation |
| Red    | Broken / misleading / blocks Chris demo      |

## Proof suite (latest)

| Check                  | Result          | When       |
| ---------------------- | --------------- | ---------- |
| `npm run typecheck`    | Run before ship | 2026-07-28 |
| `npm run test:backend` | Run before ship | 2026-07-28 |
| `npm run test:e2e`     | Run before ship | 2026-07-28 |

Demo command (forces mock API + Square/Profit simulation banners):

```bash
npm run demo
```

## Capability matrix

| Capability              | Exists | Works demo | Proof                           | Role          | Score  |
| ----------------------- | ------ | ---------- | ------------------------------- | ------------- | ------ |
| Auth / demo Owner       | Y      | Y          | e2e fixtures                    | Owner auto    | Green  |
| Dashboard + slow movers | Y      | Y          | dashboard + profit hooks        | Manager gates | Green  |
| Holiday stocking        | Y      | Y          | suggestions e2e + backend tests | —             | Green  |
| Scan + FAB              | Y      | Y          | `e2e/scan.spec.ts`              | —             | Green  |
| Inventory               | Y      | Y          | `e2e/inventory.spec.ts`         | Manager edit  | Green  |
| Forecast                | Y      | Y          | forecast e2e + engine           | —             | Green  |
| Events + hunting preset | Y      | Y          | `e2e/events.spec.ts`            | Manager+      | Green  |
| Suggestions + $ impact  | Y      | Y          | suggestions e2e                 | Manager+      | Green  |
| Profit & Ops (005)      | Y      | Y          | `e2e/profit.spec.ts`            | Manager+      | Green  |
| Ask Hangar (006)        | Y      | Y          | profit Ask chips                | Manager+      | Green  |
| Offline queue           | Y      | Y          | scan offline e2e                | —             | Yellow |
| More / install honesty  | Y      | Y          | install copy = scan queue       | —             | Green  |
| Square (mock / sim)     | Y      | Y          | demo sim banners                | Owner only    | Green  |
| Square live OAuth       | Y      | Needs SSM  | Part A credentials              | Owner         | Yellow |

## Feature specs

| Spec | Intent                     | Status                                      |
| ---- | -------------------------- | ------------------------------------------- |
| 001  | Homecoming                 | North star                                  |
| 002  | Guided trial               | **Shipped**                                 |
| 003  | Manager events             | **Shipped** (+ hunting preset)              |
| 004  | Square analytics           | **Shipped** (live Connect needs SSM Part A) |
| 005  | Owner Profit & Ops dataviz | **Shipped**                                 |
| 006  | Optimization + Ask Hangar  | **Shipped**                                 |

## Manual Chris path

1. `npm run demo` → Owner
2. Dashboard → slow movers + holiday stocking teaser
3. Scan → Inventory
4. Events → Hay Days / Hunting presets; static holidays on badges
5. Suggestions → Holiday stocking + $ reorder / hold-promote
6. More → Profit & Ops → Saved/Made, rec list, Ask Hangar
7. Point at amber banners: Square/Profit simulation until live Connect

## Branding decision (G6)

**Product brand in-app: Hangar Liquor** (store: Hangar / Hanger Liquor Store).
“RuralStock” is email-only working title — not shown in the app.

## External ops (not a code gap)

Live Square Connect requires real Developer Application ID + Secret:

```bash
npm run setup-square-ssm -- --application-id=sq0idp-... --application-secret=sq0csp-... --profile=steve
```

Until then `credentialsConfigured: false` by design.

## Status

**Project complete for demo scope (2026-07-28).** Specs 002–006 shipped; honesty polish closed; holiday auto-stocking shipped. Remaining action is ops-only: paste Square credentials when Chris is ready.
