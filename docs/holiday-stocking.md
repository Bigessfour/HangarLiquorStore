# Holiday & local-event stocking

Automatic demand lift for high-demand U.S. alcohol retail holidays, plus Manager local events for area festivals.

## Research basis (off-premise)

Industry reports (FORM OND trends, Placer.ai BevAlc visit spikes, summer Surfside/P2PI):

| Period                                    | Pattern                                                |
| ----------------------------------------- | ------------------------------------------------------ |
| New Year's Eve                            | Often largest single-day spike (~150%+ vs average day) |
| Day before Thanksgiving                   | ~130%+ sales lift (“Turkey Wednesday”)                 |
| Christmas Eve / Dec 23                    | Among busiest December days                            |
| Memorial Day / July 4 / Labor Day         | Summer beer/RTD peak; shoppers buy 1–2 days early      |
| Halloween                                 | Notable OND adult spend                                |
| Super Bowl / St. Patrick's / Father's Day | Secondary spikes                                       |

Hangar multipliers are planning estimates (not a SLA). Labels stay honest on Profit.

## Static holidays (automatic)

Implemented in `backend/lambdas/forecast/lib/static-holidays.ts`:

New Year's, Valentine's, Super Bowl, St. Patrick's, Cinco de Mayo, Memorial Day, Father's Day, July 4, Labor Day, Halloween, Thanksgiving, Christmas.

Each has `multiplier`, `focuses` (Beer/RTD, Ice, Spirits, Essentials), and a `stockingNote`.

Focus-aware math (`getItemMultiplierForDate`) applies full lift to matching SKUs and a light dampened lift to others.

## Local events (manual)

Managers add Hay Days, hunting season, rodeos, etc. under **Events**. Focus chips target categories so local area demand does not over-order irrelevant SKUs.

## UI

- **Suggestions → Holiday stocking** — upcoming holidays + suggested extra units
- **Dashboard** — next-holiday teaser + slow movers
- **Ask Hangar** — “What should I stock for the next holiday?”
