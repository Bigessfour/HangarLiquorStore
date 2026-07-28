# Chris email claims — delivery matrix

**Source:** Preview email “RuralStock AI for Hangar Liquor”
**Updated:** 2026-07-28
**Brand in app:** Hangar Liquor (RuralStock = email-only working title)

## Verdict

**Demo-ready.** All email themes delivered with honest wording on proxy dollars and offline scope.

`npm run demo` loads Square/Profit **simulation** banners (`VITE_DEMO_SIMULATE_*`).

## Claim matrix

| Email claim                  | Status        | Notes                                                                  |
| ---------------------------- | ------------- | ---------------------------------------------------------------------- |
| Mobile-first PWA             | **DELIVERED** | Offline = scans & queue; Profit/Ask need network (install copy honest) |
| Camera UPC scan              | **DELIVERED** |                                                                        |
| Stock / movers / slow movers | **DELIVERED** | Dashboard slow-movers strip from cash-impact                           |
| Local events + holidays      | **DELIVERED** | Static holiday calendar + Hay Days / hunting / rodeo presets           |
| Holiday auto stocking        | **DELIVERED** | Suggestions + Dashboard; focus-aware demand                            |
| Order / hold / promote + $   | **DELIVERED** | Profit full list; Suggestions shows $ + hold/promote                   |
| Ask Hangar                   | **DELIVERED** |                                                                        |
| Square sync when connected   | **PARTIAL**   | Demo simulates; live needs SSM Part A (ops)                            |
| Costs from Square catalog    | **DELIVERED** | Sync writes `unitPrice`/`unitCost`; falls back to ~28% margin proxy    |

## Gap backlog

**None open in code.** Former G1–G7 closed 2026-07-28.

| ID  | Resolution                                   |
| --- | -------------------------------------------- |
| G1  | Dashboard slow-movers                        |
| G2  | Hunting Season Opener preset + mock seed     |
| G3  | $ + hold/promote on Suggestions              |
| G4  | Square catalog price → unitCost on inventory |
| G5  | Install offline copy softened                |
| G6  | Brand = Hangar Liquor in app                 |
| G7  | `baseline-readiness.md` refreshed            |

## Demo checklist

- [x] Core cash-impact + Profit + Ask Hangar
- [x] Holiday stocking + local event focuses
- [ ] Ops: `setup-square-ssm` when Chris provides Square app credentials
