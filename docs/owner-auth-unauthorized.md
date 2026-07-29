# Owner / Manager authorization

## Symptom

Live Owner login shows **Unauthorized** on API calls (Profit, Square, inventory users, etc.).

## Cause map

| Response | Meaning | Fix area |
| -------- | ------- | -------- |
| `401` + body `Unauthorized` | API Gateway JWT rejected (missing/expired/wrong audience ID token) | Client refresh + Cognito client id |
| `403` + `Owner role required` | JWT OK; Cognito group not Owner | Cognito groups + `parseCognitoGroups` |
| `403` + `Manager role required` | JWT OK; not Manager+ | Same group parse (Owner must satisfy Manager) |

Chris demo user `chris.emick.owner@hangar.demo` is in Cognito group **Owner**. Pool/client env vars match terraform.

## Hardening in this repo

1. **Session refresh** — `ensureFreshAuthToken` / `refreshAuthSession` before API calls; retry once on 401; then sign out → `/login?reason=session`
2. **AuthGuard** — refresh Cognito session on load when ID token expired
3. **inventory-api** — restored `getCallerGroups` for `/api/users` (was accidentally commented); role denials return **403**; Manager gate on create/patch/import
4. **Group parse** — case-insensitive Owner/Manager/ReadOnly; API GW JSON-string groups; Bearer token fallback
5. **auth-deny logs** — always emit on role deny (CloudWatch)

## Smoke as Owner

1. Hard refresh https://d1imxsgur21o71.cloudfront.net → log in as Owner
2. Open Network: `GET /api/profit?period=month` → **200**
3. More → User Management → list loads (**200**, not 500)
4. Leave tab open >1h or wait near expiry → next API call refreshes or returns to login cleanly (not stuck Unauthorized toast)
