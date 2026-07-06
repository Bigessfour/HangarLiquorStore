# Square POS connection — Hangar Liquor Store

Hangar Liquor uses **Square** at the register. This app connects to Square (read-only) so sales data can feed inventory forecasting. **Only the Owner** (Chris Emick) can connect or disconnect Square. Managers and ReadOnly staff never see Square settings or tokens.

Official Square reference: [Square API](https://developer.squareup.com/reference/square) · [OAuth overview](https://developer.squareup.com/docs/oauth-api/overview)

---

## What Chris needs to do (Owner — ~5 minutes)

You only need your **normal Square login** for Hangar Liquor. You do **not** need to copy API keys into the app.

### Before you start

- [ ] Steve (or your developer) has finished **Part A** below and confirmed the app shows “credentials configured.”
- [ ] You can log into the Hanger app as **Owner** (not Manager).
- [ ] Use **Safari or Chrome** on a phone or computer (not an embedded browser).

### Steps for Chris

1. Open the Hanger app: **https://d1imxsgur21o71.cloudfront.net**
2. Log in with your **Owner** account.
3. Go to **More** (bottom navigation).
4. Find **Square POS connection** (only Owners see this card).
5. Tap **Connect Square account**.
6. Square opens a secure sign-in page. Log in with the **same Square account Hangar Liquor uses for the physical registers**.
7. Review permissions — the app only requests **read** access:
   - Merchant profile (store name)
   - Orders (sales)
   - Payments
   - Catalog items
   - Inventory levels
8. Tap **Allow** / **Authorize**.
9. You are returned to the app. You should see **Connected to Square** with your business name.

### If something goes wrong

| Symptom | What to try |
|--------|-------------|
| No “Square POS connection” card | Your login is not Owner. Ask Steve to confirm your Cognito role is **Owner**. |
| Button says credentials not configured | Steve must finish Part A (Square Developer app + AWS secrets). |
| Square login fails | Use the Square account that owns the Hangar Liquor seller account, not a personal sandbox. |
| “invalid_state” or “state_expired” | Tap **Connect Square account** again (authorization links expire in ~10 minutes). |
| Wrong store connected | Tap **Disconnect Square**, then connect again with the correct Square login. |

### Disconnecting

Owner only: **More → Square POS connection → Disconnect Square**. This revokes the app’s access in Square and removes stored tokens.

---

## What Steve / developer does first (Part A — one-time)

Chris cannot connect until a **Square Developer application** exists and credentials are stored in AWS (never in the mobile app).

### 1. Create a Square Developer account & application

1. Go to [Square Developer Dashboard](https://developer.squareup.com/apps).
2. Sign in (can use the same Square account as the store, or a developer account Chris invites).
3. Click **Create app** → name it e.g. `Hanger Liquor Inventory`.
4. Open the app → **OAuth** (left menu).

### 2. Register the production Redirect URL

Square requires an **exact HTTPS** redirect URL. After `terraform apply`, get it:

```bash
cd terraform && terraform output -raw square_oauth_redirect_uri
```

Example (your URL may differ):

```
https://0w8jsfb0o6.execute-api.us-east-2.amazonaws.com/api/square/callback
```

In the Square app **OAuth** page:

1. Under **Redirect URL**, click **Add redirect URL**.
2. Paste the URL from terraform output **exactly** (no trailing slash).
3. Save.

### 3. Copy Application ID and Application secret

On the same **OAuth** page:

| Square console label | AWS SSM parameter |
|---------------------|-------------------|
| **Application ID** | `/hanger/prod/square/application_id` |
| **Application secret** | `/hanger/prod/square/application_secret` |

Keep the **Application secret** private — only AWS Lambda reads it.

### 4. Store credentials in AWS (account 570912405222)

```bash
export AWS_PROFILE=steve

aws ssm put-parameter \
  --name "/hanger/prod/square/application_id" \
  --type String \
  --value "sq0idp-XXXXXXXX" \
  --overwrite \
  --region us-east-2

aws ssm put-parameter \
  --name "/hanger/prod/square/application_secret" \
  --type SecureString \
  --value "sq0csp-XXXXXXXX" \
  --overwrite \
  --region us-east-2
```

### 5. Deploy backend + frontend

```bash
npm run build:backend
cd terraform && terraform apply -auto-approve -var="store_id=hanger"
cd .. && npm run deploy:frontend
```

### 6. Confirm Owner user for Chris

Chris needs Cognito group **Owner**. Bootstrap example:

```bash
aws cognito-idp admin-add-user-to-group \
  --user-pool-id us-east-2_CdEDU34J7 \
  --username chris@hangarliquor.com \
  --group-name Owner \
  --region us-east-2
```

(Use Chris’s real login email/username.)

### 7. Hand off to Chris

Send Chris:

- App URL: https://d1imxsgur21o71.cloudfront.net  
- His Owner username / temporary password  
- This doc section **“What Chris needs to do”**

---

## Security model

| Item | Where it lives | Who can access |
|------|----------------|----------------|
| Application secret | AWS SSM SecureString | Lambda only |
| OAuth access / refresh tokens | AWS SSM SecureString | Lambda only |
| Connection metadata (store name, location) | DynamoDB `HangerSquareConnection` | Owner via API |
| Connect / disconnect UI | More page | **Owner only** (enforced in UI + API) |

Managers cannot call `/api/square/*` — API returns **403 Owner role required**.

OAuth uses Square’s **authorization code flow** (server-side). See [OAuth best practices](https://developer.squareup.com/docs/oauth-api/best-practices).

---

## Sandbox testing (optional)

For developer testing only:

1. Create a [Square Sandbox](https://developer.squareup.com/docs/devtools/sandbox/overview) seller.
2. Set Lambda env `SQUARE_SANDBOX=true` and use sandbox Application ID/secret in SSM.
3. Use sandbox redirect URL on the **sandbox** OAuth tab in Developer Console.

Production Hangar Liquor should use **production** Square (`connect.squareup.com`).

---

## Permissions requested (read-only)

| Scope | Purpose |
|-------|---------|
| `MERCHANT_PROFILE_READ` | Confirm correct store connected |
| `ORDERS_READ` | POS sales orders for demand history |
| `PAYMENTS_READ` | Payment totals / timing |
| `ITEMS_READ` | Square catalog ↔ UPC mapping (future) |
| `INVENTORY_READ` | Optional stock reconciliation (future) |

Full list: [OAuth permissions reference](https://developer.squareup.com/docs/oauth-api/square-permissions)

---

## Support contacts

- **Square Developer support:** [Square Developer Forums](https://developer.squareup.com/forums)
- **Square seller (register) support:** Square Dashboard → Help  
- **App / AWS:** Steve McKitrick