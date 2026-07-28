# E2E role + runtime review findings

**Date:** 2026-07-28
**Method:** Chrome DevTools MCP poke-through + structured `[auth]`/`[api]` logging
**Environments:** Pass A `npm run demo` (localhost:5173); Pass B `vite :5174` + Cognito + live API

## Verdict

Owner RBAC is **working** after the group-parse / role-display fixes. What looked like “unavailable” for Owner was primarily:

1. Stale / under-parsed Cognito groups on login (frontend `sessionToAuthUser` only accepted arrays).
2. More page showing raw `user.role` from storage instead of `getUserRole()`.
3. Square Connect disabled when SSM still has placeholder credentials (**infra**, not role).

## Fixes shipped in this pass

| Change                                                                            | File(s)                                  |
| --------------------------------------------------------------------------------- | ---------------------------------------- |
| Shared `parseCognitoGroups` on frontend                                           | `src/lib/cognito-groups.ts`              |
| Login + `getUserRole` use same parser; `[auth]` logs when DEV / `VITE_DEBUG_AUTH` | `src/lib/auth.ts`                        |
| `[api]` warn on non-OK                                                            | `src/lib/api-client.ts`                  |
| More badge uses `getUserRole()`                                                   | `src/features/more/more-page.tsx`        |
| Backend `logAuthDeny` on empty groups / `DEBUG_AUTH`                              | `backend/shared/auth/roles.ts` + lambdas |
| Demo debug flag                                                                   | `.env.demo` (`VITE_DEBUG_AUTH=true`)     |

## Pass A — Demo (`npm run demo`)

| Surface                                 | Result                                             |
| --------------------------------------- | -------------------------------------------------- |
| Auto-login Owner                        | `demo-owner` / role Owner                          |
| Dashboard Manager+ (Reorder, Add event) | Present                                            |
| Inventory edit / CSV                    | Present                                            |
| Events Add / multipliers                | Present (not View only)                            |
| Profit & Ops                            | Accessible; simulation + learning banners          |
| Ask Hangar chips                        | Present                                            |
| More → Role badge                       | **Owner**                                          |
| More → Profit link                      | Present                                            |
| Square panel                            | Demo simulation connected; Refresh demo sync works |
| Console `[api]`/`error` during walk     | None captured of interest                          |

## Pass B — Live Cognito + API

| Check                                 | Result                                                             |
| ------------------------------------- | ------------------------------------------------------------------ |
| Login `chris.emick.owner@hangar.demo` | Success; role **Owner** at first paint                             |
| `GET /api/profit` via UI              | 200; sales-since Jun 12, 2026; Money in pocket visible             |
| `GET /api/square/status`              | **200** (not Owner role required)                                  |
| Square Connect                        | Disabled / Part A copy — `credentialsConfigured: false` (expected) |
| `POST /api/events` as Owner           | **201** (Manager+ OK); probe event deleted                         |

## Known non-bugs (infra)

- Live Square OAuth needs real SSM application id/secret (`npm run setup-square-ssm`). Until then Connect stays disabled by design.
- Dashboard Square card may still say “connect when ready” while More shows the full panel — both Owner-gated.

## Closed (was vNext)

- Playwright webServer env aligned with `VITE_DEMO_SIMULATE_*`.
- `/profit` in navigation smoke + Ask Hangar prompts (overstock, holiday stocking, money in pocket).

## Deployed

- Terraform apply (Lambdas with `logAuthDeny`) + CloudFront frontend invalidate: **2026-07-28**
- Live smoke after deploy: `GET /api/profit` **200**, `GET /api/square/status` **200** as Owner (`credentialsConfigured: false` until SSM Part A).
