# Deploying to Client AWS Accounts (Hangar Liquor)

## Goal
Deploy the full backend (Lambda + API Gateway + DynamoDB) into **Hangar Liquor's own AWS account** so they own the data, pay the AWS bill directly, and you can invoice them for setup + ongoing support (plus a little extra).

This is the recommended path vs. hosting everything yourself as a SaaS (which would require multi-tenancy, auth, usage metering, and Stripe/invoicing).

## SageMaker Canvas (Yes, you will need it in their account)

Per the project spec:

- **Primary runtime forecast**: Lightweight statistical model inside the Lambda (weekday patterns + trend + event multipliers). This works with zero extra services.
- **Optional higher-accuracy path**: AWS SageMaker Canvas (no-code) for training custom models on historical sales data exported from DynamoDB. Then deploy to a SageMaker Serverless Inference endpoint.

### Canvas Workflow (per client AWS account)
1. Client enables SageMaker Canvas in *their* AWS account.
2. Export sales history as CSV (see below).
3. Client uploads the CSV to Canvas and builds/trains a time-series model (no code).
4. Deploy the model to a Serverless endpoint.
5. Set the environment variable `SAGEMAKER_ENDPOINT_NAME` on the forecast Lambda.
6. Call forecasts with `?model=canvas` (falls back gracefully if not configured).

**Canvas costs (pay-per-use, in client's account):**
- Workspace session time: ~$1.90/hour (they only pay while the Canvas workspace is open).
- Model training: typically $2.03 – $4.89 per hour depending on instance type and data size.
- Serverless Inference (if used): billed per millisecond of compute + data processed.
- Free tier: 160 hours of Canvas session time per month (new accounts) + other limits.

Because it's optional and the statistical engine is always available, most clients can start without Canvas and add it later when they have enough sales history.

## Recommended Architecture for Client Deployment

- One AWS account per client (or strict separation via tags/OU if they have an existing org).
- Resources are deployed into the client's account:
  - DynamoDB tables (names can be parameterized per store/client).
  - Lambda functions (forecast + inventory).
  - API Gateway (HTTP API recommended for cost).
  - IAM roles (least privilege).
  - (Optional) SageMaker endpoint + S3 bucket for exports.
- Frontend PWA can be hosted on S3 + CloudFront in their account, or served from your CDN pointing at their API.
- `STORE_ID` and table names are configurable via environment variables / Terraform variables.

Current code is already mostly portable (uses env vars for tables, `SAGEMAKER_ENDPOINT_NAME`, etc.).

## How to Deploy to a Client's Account

### Option A – Manual / CLI (quick start)
1. Client creates the AWS account and gives you an IAM user/role with admin or PowerUser + specific service permissions.
2. Configure AWS CLI with a named profile for their account:
   ```powershell
   aws configure --profile hangar-liquor-client
   ```
3. Deploy the Lambdas (example with AWS CLI + zip):
   - Package the backend code.
   - Create the three DynamoDB tables.
   - Create the API Gateway + integrations.
   - Set environment variables (`STORE_ID`, table names, optional `SAGEMAKER_ENDPOINT_NAME`).
4. Update the frontend `VITE_API_URL` to point at the client's API Gateway URL.
5. Hand over the account + basic runbook.

### Option B – Infrastructure as Code (recommended for repeatability)
Use Terraform (the project already references the Terraform MCP).

See the existing `Docs/terraform-mcp.md` for tool setup.

A minimal Terraform setup would include:
- `main.tf` for the two Lambdas, three DynamoDB tables, API Gateway (HTTP), IAM.
- Variables for `store_id`, `region`, `environment`.
- Outputs for the API base URL.

Once written, you (or the client) can run:
```bash
terraform init
terraform apply -var="store_id=hangar-liquor-wiley" -var="aws_profile=hangar-liquor-client"
```

This makes "exporting" to new clients trivial.

### Data Export for SageMaker Canvas Training
Create a small utility (Node or Python) that:
- Scans the `HangerSalesHistory` table.
- Outputs a CSV suitable for Canvas time-series forecasting (date, upc, quantity, optional features).

Example CLI:
```bash
node scripts/export-sales-for-canvas.js --store-id=hanger --output=sales.csv
```

The client then uploads `sales.csv` into SageMaker Canvas in their account.

## Billing & Invoicing Models

### Model 1: Client-Hosted (Recommended)
- Hangar Liquor pays **their own AWS bill** directly (you never see the charges).
- You invoice them separately for:
  - Initial setup & deployment (one-time).
  - Ongoing maintenance, updates, bug fixes, feature work (monthly retainer or hourly).
  - "A little extra" margin so you can afford to keep working on it.
- You retain full ownership of the source code (or license it to them).
- Easy to "export" the whole thing: give them the repo + Terraform + runbook.

### Model 2: You Host as SaaS
- Everything runs in *your* AWS account(s).
- You add multi-tenancy (client IDs, row-level isolation, auth via Cognito or similar).
- You meter usage (number of scans, forecasts served, storage) or charge a flat monthly fee.
- You invoice them (Stripe, manual invoice, etc.) and pay the AWS bill yourself + markup.
- Higher ongoing operational work (support, uptime, security, scaling).

For the current stage of the project, start with **Model 1 (client-hosted)**. It matches the request to "export it to Hangar Liquor's own aws site".

## Next Steps (for this project)

- [ ] Add a `terraform/` directory with basic modules for Lambda + DynamoDB + API Gateway.
- [ ] Add a `scripts/export-sales-for-canvas.ts` (or Python) helper.
- [ ] Improve the Canvas bridge with a real `aws-sdk` call to SageMaker Runtime when an endpoint is configured.
- [ ] Document environment variables and table naming conventions clearly.
- [ ] Create a one-page "Client Onboarding Runbook" (account setup, permissions, deploy steps, Canvas training steps).
- [ ] (Future) Add Cognito if/when multi-client SaaS is needed.

## Summary for Hangar Liquor

- Yes — SageMaker Canvas is part of the vision, but **optional**.
- The app works great with the built-in statistical forecasting.
- Deploy the backend into *their* AWS account → they pay AWS → you invoice them for your work + margin.
- This keeps data ownership with them and makes "exporting" the solution straightforward.

Let me know if you want me to start writing the Terraform modules, the export script, or the onboarding runbook next.
