# Terraform MCP Server

HashiCorp **terraform-mcp-server v1.0.0** bridges AI assistants with the Terraform ecosystem via MCP.

## Capabilities

- **Registry integration** — live provider docs, resource schemas, module inputs/outputs
- **HCP Terraform / TFE** — workspaces, runs, policies, private registry (with token)
- **Plan analysis** — explain infrastructure changes in natural language
- **Security** — rate limiting (10 rps global, 5 rps session), CORS policies

## Local setup (this project)

See **[MCP setup](./mcp-setup.md)** for the full server list, sync checklist, and verification steps.

| Client | Config file |
|--------|-------------|
| Cursor | [`.cursor/mcp.json`](../.cursor/mcp.json) |
| VS Code | [`.vscode/mcp.json`](../.vscode/mcp.json) |
| Grok CLI | [`.grok/config.toml`](../.grok/config.toml) |

Docker image (already pulled):

```bash
docker pull hashicorp/terraform-mcp-server:1.0.0
```

## HCP Terraform / TFE (optional)

Set environment variables before launching the IDE:

```powershell
$env:TFE_ADDRESS = "https://app.terraform.io"
$env:TFE_TOKEN = "<your-terraform-api-token>"
```

VS Code users can instead enter credentials via the `tfe_token` / `tfe_address` prompts in `.vscode/mcp.json`.

## Environment variables

| Variable | Description | Default |
|----------|-------------|---------|
| `TFE_ADDRESS` | HCP Terraform or TFE URL | `https://app.terraform.io` |
| `TFE_TOKEN` | Terraform API token | *(empty — public registry only)* |
| `TRANSPORT_MODE` | `stdio` or `streamable-http` | `stdio` |
| `MCP_RATE_LIMIT_GLOBAL` | Global rate limit (rps:burst) | `10:20` |
| `ENABLE_TF_OPERATIONS` | Tools requiring explicit approval | `false` |
| `OTEL_METRICS_ENABLED` | OpenTelemetry metrics | `false` |

## Verify

```bash
docker run --rm hashicorp/terraform-mcp-server:1.0.0 --help
```

Reload Cursor after config changes: `Ctrl+Shift+P` → **Developer: Reload Window**.

## Vite MCP

`vite-plugin-mcp` exposes dev-server tools at `http://localhost:5173/__mcp/sse` when `npm run dev` is running. Configured as `"vite"` in all three IDE configs — see [MCP setup](./mcp-setup.md).