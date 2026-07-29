# Chris guided trial walkthrough

Five–eight minute owner demo on **`npm run demo`** (mock + Square/Profit simulation banners).

## Before Chris sits down

1. Run `npm run demo` and open the LAN URL on phone or laptop.
2. More → **Reset to realistic Hanger demo catalog** (confirm).
3. More → **Start trial run**.
4. Remind Chris: amber banners = simulation, not live Square dollars. Connect later when ready.

## Stops (Try it where shown)

| #   | Stop                | What to say                                                 |
| --- | ------------------- | ----------------------------------------------------------- |
| 1   | Welcome             | Short trial — Skip anytime                                  |
| 2   | Home / Dashboard    | Store at a glance — **Home** is on the bottom nav           |
| 3   | Scan                | Phone camera on the floor; laptop = type UPC → **Try it**   |
| 4   | Inventory           | Search, filter, edit; CSV receive for managers              |
| 5   | Local events        | Hay Days / hunting bump demand → **Try it** (Hay Days form) |
| 6   | Forecast            | 14-day demand with events & holidays                        |
| 7   | Suggestions         | Reorder + holiday stocking → **Try it** (Add to Stock)      |
| 8   | Profit & Ask Hangar | Cash in pocket + Ask Hangar → **Try it** (holiday question) |
| 9   | More                | Install on phone; restart trial anytime                     |

Finish closes the overlay. Skip at any stop leaves a fully usable app.

## Proof

```bash
npm run typecheck
npx playwright test e2e/chris-walkthrough.spec.ts e2e/guided-trial.spec.ts
```

## Deferred (explicitly out of scope)

- Live Square OAuth as a tour stop (Chris connects when ready — amber banners until then)
- Voiceover video
- Profit engine formula rewrite (validated via cash-impact unit tests + demo period contract)
