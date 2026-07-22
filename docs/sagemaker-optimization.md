# SageMaker optimization & Hangar AI

Hangar’s **hot path** stays lightweight statistical forecasting in Lambda. SageMaker and Bedrock are optional upgrades.

## Canvas training path (offline)

1. Export sales history:

```bash
npm run export-sales-for-canvas
```

2. In [SageMaker Canvas](https://docs.aws.amazon.com/sagemaker/latest/dg/canvas.html), create a time-series forecast model from the CSV.
3. Deploy to **Serverless Inference**.
4. Set Terraform variable / Lambda env:

```hcl
sagemaker_endpoint = "hanger-canvas-forecast"
```

5. Request forecasts with `GET /api/forecast?model=canvas` — falls back to statistical if the endpoint is missing or errors.
6. Profit & Ops (`/api/profit`, `/api/optimize`) mark provenance as `hybrid` when the endpoint name is set.

## Hangar AI chat

`POST /api/assistant/chat` with `{ "message": "...", "period": "month" }`.

| Mode              | When                                                  | Behavior                                       |
| ----------------- | ----------------------------------------------------- | ---------------------------------------------- |
| Grounded fallback | Default / demo                                        | Keyword + context pack; cites Saved/Made/sales |
| Bedrock Converse  | `bedrock_model_id` set (e.g. `amazon.nova-lite-v1:0`) | Same context pack as system grounding          |

Never invents dollars outside the context pack. Manager/Owner only.

## Related APIs

| Route                       | Purpose                                             |
| --------------------------- | --------------------------------------------------- |
| `GET /api/profit?period=`   | Profit & Ops snapshot (includes optimization block) |
| `GET /api/optimize?period=` | Optimization impact only                            |
| `POST /api/assistant/chat`  | Ask Hangar                                          |
| `GET /api/forecast`         | Demand forecasts (statistical / canvas)             |

## Constitution reminder

No heavy ML on the barcode scan path. Optimization and chat run on demand from Profit & Ops.
