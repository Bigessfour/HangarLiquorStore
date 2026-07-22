# SageMaker optimization & Hangar AI

Hangar’s **hot path** stays a lightweight **statistical cash-impact engine** in Lambda (cover / excess / stockout-risk). SageMaker Canvas is the **only** higher-accuracy upgrade.

## Amazon Forecast is retired

AWS closed **new customer access to Amazon Forecast on July 29, 2024** and pointed teams to **SageMaker Canvas** for time-series work. Hangar does **not** use Amazon Forecast. Older diagrams that mention Forecast are obsolete — do not add Forecast clients or terraform.

| Path                                    | Role                                                     |
| --------------------------------------- | -------------------------------------------------------- |
| Statistical cash engine                 | Always on — Profit impact card + `/api/optimize`         |
| SageMaker Canvas → Serverless Inference | Optional — better demand quantiles when history is clean |
| Bedrock Ask Hangar                      | Optional — explainer over the same numbers               |

## Canvas training path (offline checklist)

1. Export sales history:

```bash
npm run export-sales-for-canvas
```

2. In [SageMaker Canvas](https://docs.aws.amazon.com/sagemaker/latest/dg/canvas.html), create a time-series forecast model from the CSV (item × day × quantity).
3. Deploy to **Serverless Inference** (pay-per-invoke; low volume — only optimize/profit/forecast calls).
4. Set Terraform variable / Lambda env:

```hcl
sagemaker_endpoint = "hanger-canvas-forecast"
```

5. Request forecasts with `GET /api/forecast?model=canvas` — **falls back silently** to statistical if the endpoint is missing or errors.
6. Profit & Ops merge Canvas SKUs onto the statistical set (never drop inventory). Provenance becomes `hybrid` or `sagemaker` when Canvas contributed.

Turn Canvas on only after ~6–12 months of reasonably clean Square sales. Until then Chris still gets ranked dollar actions from the statistical engine.

## Cash-impact formulas (source of truth)

```
days_of_cover     = current_units / max(avg_daily_velocity, 0.1)
target_cover      = lead_time_days + safety_days   # category table
excess_units      = max(0, current - target_cover * velocity)
overstock_dollars = excess_units * unit_cost       # → dollarsSaved / hold
stockout_risk_$   = P(stockout) × expected_lost_margin  # → dollarsMade / order
```

Events multiply **demand only**. Thin history → `limitedHistory` + lower confidence; never invent dollars without provenance.

## Hangar AI chat

`POST /api/assistant/chat` with `{ "message": "...", "period": "month" }`.

| Mode              | When                   | Behavior                                            |
| ----------------- | ---------------------- | --------------------------------------------------- |
| Grounded fallback | Default / demo         | Keyword + context pack; cites Saved/Made/cashTiedUp |
| Bedrock Converse  | `bedrock_model_id` set | Same context; inventing $ rejected                  |

Never invents dollars outside the context pack. Manager/Owner only.

## Related APIs

| Route                       | Purpose                                             |
| --------------------------- | --------------------------------------------------- |
| `GET /api/profit?period=`   | Profit & Ops snapshot (includes optimization block) |
| `GET /api/optimize?period=` | Cash-impact optimization only                       |
| `POST /api/assistant/chat`  | Ask Hangar                                          |
| `GET /api/forecast`         | Demand forecasts (statistical / canvas)             |

## Constitution reminder

No heavy ML on the barcode scan path. Optimization and chat run on demand from Profit & Ops.
