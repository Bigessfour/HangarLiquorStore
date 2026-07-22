# Chris email claims — delivery matrix & gaps

**Source:** Preview email “RuralStock AI for Hangar Liquor”
**Checked against:** shipped code on `main` (cash-impact `f0c4e71` + Square/Profit stack)
**Updated:** 2026-07-21

## Verdict for demo

**Yes — we can demo every theme in the email**, with honest wording on proxy dollars, partial offline, and branding.
Cash-impact plan (**006 engine**) is **complete for Chris preview**. Gaps below are polish / truth-in-advertising, not blockers for a walkthrough on `npm run demo`.

`npm run demo` now loads `.env.demo` (`--mode demo`) with **`VITE_DEMO_SIMULATE_SQUARE`** / **`VITE_DEMO_SIMULATE_PROFIT`**: Square shows as connected and Profit looks like a live-sync view, clearly labeled as a **simulation / representation** of Square Data API analytics — not Hangar’s real register.

## Claim matrix

| Email claim                                 | Status         | Demo OK? | Gap to close (vNext)                                                                                                                            |
| ------------------------------------------- | -------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Mobile-first PWA, installable               | **PARTIAL**    | Yes      | Full app offline ≠ only shell + scan queue. Soften “works even when spotty” → “scans & queue work offline; live reports need a connection.”     |
| Camera UPC scan → inventory update          | **DELIVERED**  | Yes      | —                                                                                                                                               |
| Current stock, fast movers, low-stock       | **PARTIAL**    | Yes      | No dedicated **slow movers** list (narrative on Profit only). Add dashboard “Slow movers” strip if Chris asks for it.                           |
| Local events / holidays (Hay Days, hunting) | **PARTIAL**    | Yes      | Hay Days + static holidays yes; **hunting season** is a Manager-created event, not a preset. Seed or label an example hunting weekend for demo. |
| Ranked order / hold / promote               | **PARTIAL**    | Yes      | Full trio on **Profit & Ops**; Suggestions page is **order-only**. Demo path = More → Profit.                                                   |
| Dollar impact (cash tied up vs margin)      | **PARTIAL**    | Yes      | **Proxy** category prices + ~28% margin, not Square COGS. Always say “estimate.” Later: costs from Square/catalog.                              |
| Ask Hangar in plain English                 | **DELIVERED**  | Yes      | Grounded/mock path; Bedrock optional.                                                                                                           |
| Scan + Square sync when connected           | **PARTIAL**    | Yes      | Live Square needs Part A + Connect; `npm run demo` **simulates** connected + sync with disclaimer banners.                                      |
| Cover / overstock / stockout math           | **DELIVERED**  | Yes      | —                                                                                                                                               |
| Lightweight engine + limited data           | **PARTIAL**    | Yes      | Engine works with thin data; **optimize itself is not offline** (API/mock).                                                                     |
| SageMaker Canvas optional                   | **DELIVERED**  | Yes      | Documented; not required for demo.                                                                                                              |
| Optimistic + offline queue + sync           | **DELIVERED**  | Yes      | Scan/inventory mutations.                                                                                                                       |
| Frees cash in dead/slow spirits             | **PARTIAL**    | Yes      | Estimated via cash-impact; not bank cash moved.                                                                                                 |
| Protects margin before events               | **PARTIAL**    | Yes      | Same — estimated Made $.                                                                                                                        |
| Stops over-ordering                         | **PARTIAL**    | Yes      | Advice only; no PO block.                                                                                                                       |
| Short ranked $ list                         | **PARTIAL**    | Yes      | On Profit; wire $ into Suggestions later.                                                                                                       |
| Ask “why” with real numbers                 | **DELIVERED**  | Yes      | —                                                                                                                                               |
| Name “RuralStock AI”                        | **NOT IN APP** | Soften   | App brand is **Hangar / Hanger Liquor Store**. Use RuralStock only as product family name in email, or rename later.                            |
| Demo without live Square                    | **DELIVERED**  | Yes      | `npm run demo`.                                                                                                                                 |

## Must-say in the email (accuracy)

1. App name Chris will see: **Hangar Liquor** inventory (RuralStock AI = product line / working title if you keep it).
2. Dollar figures are **estimates** from cover math + category costs until Square costs sync.
3. Hold/promote + $ live on **Profit & Ops**; guided trial covers scan/events/forecast.
4. Offline = **scan & queue**; Profit/Ask need network (or local demo mock).

## Gap backlog (fill after demo unless Chris blocks)

| ID  | Gap                                                                 | Effort | Priority       |
| --- | ------------------------------------------------------------------- | ------ | -------------- |
| G1  | Slow-movers strip on Dashboard                                      | S      | P2             |
| G2  | Hunting-season example event seed                                   | S      | P2             |
| G3  | $ impact on Suggestions (not only Profit)                           | M      | P2             |
| G4  | Real unit costs from Square/catalog                                 | L      | P1 post-Square |
| G5  | Copy: install panel “offline” = scan queue only                     | S      | P1 honesty     |
| G6  | Branding: RuralStock vs Hangar decision                             | S      | P3             |
| G7  | Refresh `docs/baseline-readiness.md` (still mentions 005/006 stubs) | S      | P2             |

## Demo ship checklist

- [ ] `git status` clean on `main` (cash-impact pushed)
- [ ] `npm run demo` on LAN; Chris on same Wi‑Fi or ngrok
- [ ] Login as Owner (demo)
- [ ] Walk: Dashboard → Scan → Inventory → Events (Hay Days) → **More → Profit & Ops** (Saved/Made, Top action, Ask Hangar)
- [ ] Point at amber banners: Profit + Square are a **simulation** of live Square Data API analytics
- [ ] More → Square: “Connected (demo simulation)”; tap Refresh demo sync
- [ ] Say aloud: “this is what connected Square looks like; Hangar’s real dollars need Owner Connect + sync”
- [ ] Do **not** open Suggestions as the $ story (order-only today)

## Cash-impact plan complete?

**Yes** for the attached plan’s Phase 1–4 demo scope: cover engine, Profit wiring, Ask Hangar, Canvas docs, Forecast retirement note, tests. Remaining work is honesty polish + G1–G7 above — not reopening the engine.
