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
