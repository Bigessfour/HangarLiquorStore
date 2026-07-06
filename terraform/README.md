# Terraform Deployment for Hangar Liquor Store Backend

This deploys the AWS backend (DynamoDB, Lambda, API Gateway) to a **client's own AWS account** (e.g. Hangar Liquor's).

## Prerequisites
- AWS CLI configured with profile for client's account (see `scripts/set-aws-profile.ps1` or `aws configure --profile hanger-liquor-client`)
- Terraform >= 1.5
- Node.js to build Lambda code if needed

## Usage for Client Deployment

1. In client's AWS account, ensure permissions (or use IAM user with admin for setup).

2. Set profile:
   ```powershell
   $env:AWS_PROFILE = "hanger-liquor-client"
   ```

3. **Build Lambda code first** (TypeScript):
   ```bash
   cd backend
   npm install
   # Example build (adjust as needed):
   npx esbuild lambdas/inventory/inventory-api.ts --bundle --platform=node --target=node20 --outfile=dist/inventory.js
   # Similar for forecast/get-forecast.ts
   cd ..
   ```

4. Initialize and apply:
   ```bash
   cd terraform
   terraform init
   terraform apply -var="store_id=hanger" -var="region=us-east-2"
   ```

5. Note the `api_url` output. Update frontend `.env` with `VITE_API_URL=<output>`

6. For SageMaker Canvas:
   - Client trains in SageMaker Canvas using exported sales CSV (use `scripts/export-sales-for-canvas.ts`)
   - Deploy model to Serverless endpoint.
   - Set `sagemaker_endpoint` var and re-apply.

## Invoicing / Billing
- Client pays their own AWS bill directly (DynamoDB on-demand, Lambda pay-per-use, API Gateway).
- You invoice Hangar Liquor for:
  - Setup/deployment (one-time)
  - Maintenance / updates (monthly or hourly)
  - "Plus a little extra" for your margin.

Use AWS Cost Explorer + Budgets in their account for transparency.

## Files
- `main.tf`: Core resources (tables, IAM, Lambdas, HTTP API)
- `variables.tf`: Configurable params

## Next Polish
- Improve dashboard live data
- Full suggestions (forecast-driven reorders)
- PWA QR/install prompt
- OFF data dump integration for product catalog (see below)

See root `Docs/client-deployment.md` for full context.

## Open Food Facts Product Catalog (Free UPC Lookup Data)

To support free/low-cost UPC lookup with offline capability, we integrate data from Open Food Facts (https://world.openfoodfacts.org/data).

### Database Dump Format
OFF provides nightly full dumps (use filtered subset for liquor store to keep costs low):
- MongoDB dump (gzipped JSON lines of product objects)
- JSONL / Parquet / CSV exports

Example product record (simplified):
```json
{
  "code": "049000042566",
  "product_name": "Jack Daniel's Old No.7 Tennessee Whiskey",
  "brands": "Jack Daniel's",
  "categories": "Alcoholic beverages, Whiskies",
  "image_url": "https://images.openfoodfacts.org/...jpg",
  "quantity": "750 ml",
  "packaging": "Bottle",
  ...
}
```

Key fields we use: code (UPC), product_name, brands, categories (for mapping), image_url, quantity (parse packSize).

### Loading into AWS (Terraform resources added)
- S3 bucket: `${store_id}-off-data-${environment}` for storing (filtered) dumps.
- DynamoDB table: `HangerProducts` (upc hash key) for fast lookup. Populated from filtered dump.
- IAM policies attached to Lambda role for S3 + the products table.

### How to populate (one-time or periodic)
1. Download filtered data (e.g. use OFF export tool or script to select alcohol/beverage categories only; full dump is large).
2. Convert to items with upc, name, category, image_url, packSize (parsed), etc.
3. Use AWS CLI, SDK script, or Glue job to batch-write to DynamoDB (or upload Parquet to S3 + query via Athena).
4. Example script (Node): Use @aws-sdk/client-dynamodb to PutItem in batches.
5. Schedule via EventBridge + Lambda if you want periodic refresh from latest dump.

### Using in the app
- Backend Lambda now supports GET /api/inventory/products/{upc} (returns data from the products table).
- Frontend UPC lookup (src/lib/upc-lookup.ts) prefers local/backend data; falls back to live OFF API for new items.
- This enables low-cost (DDB on-demand) + offline-capable product info.
- Complies with OFF: Use dumps for bulk, live API only for 1:1 user scans, proper attribution in UI.

Update frontend .env or code to use the deployed API for lookups when available.

## Planned TF Updates (MCP latest 2026)
Using terraform MCP (get_latest_*, search_modules, get_provider_details):
- Refactor Lambda to terraform-aws-modules/lambda/aws@8.8.0 (auto build/packaging, better features).
- Use terraform-aws-modules/apigateway-v2/aws@6.1.0 for API.
- Add aws_budgets_budget for client cost alerts (invoice support).
- Optional SageMaker Serverless endpoint resources + IAM.
- S3+CloudFront for PWA hosting.
- Improve packaging with build integration or module.
- Add CloudWatch, tracing, least-privilege via data sources.
- GH Action for validate/plan (MCP patterns).
- Multi-client support (for_each or modules).
- State: S3 backend example.
- Tests with terraform test.

Update after review: current custom TF is solid start but modules will make maintenance easier for client exports.

## Client Onboarding Runbook (Phase 7)
For deploying to Hangar Liquor's AWS account and going live:

1. **Prerequisites**
   - Client creates AWS account and provides IAM user with admin/PowerUser.
   - Set AWS_PROFILE for client (use scripts/set-aws-profile.ps1 or similar).
   - Client enables SageMaker Canvas if using high-accuracy forecasts.

2. **Setup AWS Resources**
   - Run `terraform init && terraform apply -var="store_id=hanger-liquor-wiley" -var="sagemaker_endpoint=hanger-forecast-canvas"`
   - This creates: DynamoDB tables (PAY_PER_REQUEST), Lambda functions (inventory + forecast), API Gateway, IAM, Budgets, S3 for OFF data.
   - Note: Build backend first if needed (zip Lambdas manually or via CI).

3. **Data & Canvas**
   - Export sales: `npm run export-sales-for-canvas -- --store-id=hanger --output=sales.csv`
   - Upload to SageMaker Canvas in client account, train time-series model (item=upc, timestamp=date, target=quantity).
   - Deploy to Serverless endpoint, set `SAGEMAKER_ENDPOINT_NAME` in TF or Lambda env.
   - Load product catalog: filter OFF dump to liquor, load to HangerProducts table (scripts provided).

4. **App & PWA (now included in Terraform)**
   - Update frontend VITE_API_URL to the deployed API Gateway URL.
   - `npm run build`
   - `aws s3 sync dist/ s3://hanger-frontend-prod --delete` (bucket created by TF)
   - (Optional) Invalidate CloudFront: `aws cloudfront create-invalidation --distribution-id <id from output> --paths "/*"`
   - Staff visit the `frontend_url` output (or QR from /more page). 
   - On phone: "Add to Home Screen" → gets a real app icon + standalone experience (PWA).
   - Install prompt + QR code already built into the app.
   - Test: Scan, add stock, view live forecasts (toggle Canvas model), events, shipments via CSV import.
   - Offline: Queue works, syncs on reconnect.

5. **Invoicing & Costs**
   - Client pays their own AWS bill (low-cost: on-demand DDB, small Lambda, S3 filtered).
   - You invoice client for: one-time setup/deployment + monthly support/markup.
   - Budgets alert at 80% of $50/mo example.
   - Monitor via AWS Budgets console.

6. **Go-Live & Support**
   - ngrok for mobile testing: `ngrok http 5173` (or deployed URL).
   - Prod: Deploy TF, update API URL, seed demo or real data.
   - Train staff: Use demo catalog reset in More, test scans.
   - Ongoing: Update via git, redeploy TF/Lambda. Canvas retrain as sales data grows.
   - Fallback: Statistical engine always available if Canvas endpoint down.

See client-deployment.md for billing models (client-hosted recommended) and full context.

