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

See root `Docs/client-deployment.md` for full context.
