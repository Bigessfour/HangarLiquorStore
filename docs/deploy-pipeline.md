# Deploy (production)

Deploys Hangar Liquor to AWS after CI is green on `main`.

Terraform state stays **local** on the deployer machine (`npm run deploy:production`).
This workflow updates **Lambda code + frontend** without re-running Terraform (infra already applied).

## Triggers

- Push to `main` after the **CI** workflow succeeds (`workflow_run`)
- Manual: **Actions → Deploy production → Run workflow**

## Required GitHub configuration

### Secrets (Settings → Secrets and variables → Actions)

| Secret | Purpose |
| ------ | ------- |
| `AWS_ACCESS_KEY_ID` | IAM user/key with Lambda update + S3 + CloudFront invalidate |
| `AWS_SECRET_ACCESS_KEY` | Matching secret |

### Variables (Settings → Secrets and variables → Actions → Variables)

| Variable | Example |
| -------- | ------- |
| `AWS_REGION` | `us-east-2` |
| `VITE_API_URL` | `https://0w8jsfb0o6.execute-api.us-east-2.amazonaws.com` |
| `VITE_COGNITO_USER_POOL_ID` | `us-east-2_CdEDU34J7` |
| `VITE_COGNITO_CLIENT_ID` | `3rlh803bk5nmqoe30rlljqetng` |
| `VITE_PWA_URL` | `https://d1imxsgur21o71.cloudfront.net` |
| `FRONTEND_BUCKET` | `hanger-frontend-prod` |
| `CLOUDFRONT_DISTRIBUTION_ID` | `E1FQRM0G55ZOMD` |

If secrets/vars are missing, the deploy job fails fast with setup hints (CI can still stay green).

## Manual full deploy (infra + seed + frontend)

```bash
export AWS_PROFILE=steve AWS_REGION=us-east-2
aws sts get-caller-identity   # expect account 570912405222
npm run deploy:production
```

## Gate

1. Open PRs → CI green → merge to `main`
2. CI on `main` green → Deploy workflow runs (or run manually)
3. Confirm live: https://d1imxsgur21o71.cloudfront.net
