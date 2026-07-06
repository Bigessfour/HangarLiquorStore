# MCP Setup (All IDEs)

Model Context Protocol servers for AI-assisted development in this repo. Keep the three IDE config files in sync whenever you add or change a server.

## Config files

| IDE | File | Format |
|-----|------|--------|
| Cursor | [`.cursor/mcp.json`](../.cursor/mcp.json) | `mcpServers` |
| VS Code | [`.vscode/mcp.json`](../.vscode/mcp.json) | `mcp.servers` + optional `inputs` |
| Grok CLI | [`.grok/config.toml`](../.grok/config.toml) | `[mcp_servers.<name>]` |

Shared tool descriptors (commit these): [`mcps/`](../mcps/)

## Prerequisites

```bash
npm install
npx playwright install          # browsers for Playwright MCP + e2e
docker pull hashicorp/terraform-mcp-server:1.0.0
```

- **Docker Desktop** — required for `terraform` MCP
- **Node.js 20+** — on `PATH` in your IDE terminal
- **`npm run dev`** — required before connecting `vite` MCP (SSE endpoint)

## Canonical servers

These five servers must appear in all three config files with the **same server key**:

| Key | Type | Notes |
|-----|------|-------|
| `vite` | SSE URL | `http://localhost:5173/__mcp/sse` — only works while `npm run dev` is running |
| `terraform` | Docker stdio | `hashicorp/terraform-mcp-server:1.0.0` |
| `playwright-mcp` | npx stdio | `@playwright/mcp@latest` + `playwright-mcp.config.json` |
| `playwright-test` | npx stdio | `playwright run-test-mcp-server` (uses `playwright.config.ts`) |
| `chrome-devtools` | npx stdio | `chrome-devtools-mcp@latest` |

Use the key `playwright-mcp` everywhere. Do not use `microsoft/playwright-mcp` — one name keeps `mcps/` tool caches consistent.

### Playwright browsers path

| IDE | `PLAYWRIGHT_BROWSERS_PATH` value |
|-----|----------------------------------|
| Cursor | `${workspaceFolder}/.playwright-browsers` |
| VS Code | `${workspaceFolder}/.playwright-browsers` |
| Grok CLI | `.playwright-browsers` (relative; launch Grok from repo root) |

Browsers install to [`.playwright-browsers/`](../.playwright-browsers/) (gitignored).

### Terraform / HCP (optional)

| IDE | Credential source |
|-----|-------------------|
| Cursor | `TFE_ADDRESS` / `TFE_TOKEN` env vars (`${env:...}` in config) |
| VS Code | `tfe_address` / `tfe_token` prompts in `.vscode/mcp.json` `inputs` |
| Grok CLI | `TFE_ADDRESS` / `TFE_TOKEN` env vars |

Public Terraform Registry works without a token.

## Field mapping (sync checklist)

When adding or changing a server, update **all three** files:

1. **Cursor** — under `mcpServers.<key>`; use `command` + `args` or `url`; env via `"env": { "KEY": "value" }`
2. **VS Code** — under `mcp.servers.<key>`; same shape; prefer `${workspaceFolder}` for paths
3. **Grok** — `[mcp_servers.<key>]` with `command`/`args` or `url`; set `startup_timeout_sec` (60 for stdio, 30 for vite)

### Sync checklist

- [ ] Same server **keys** in all three files
- [ ] Same Docker image tag / npx package / SSE URL
- [ ] `PLAYWRIGHT_BROWSERS_PATH` set for both Playwright servers
- [ ] `docs/mcp-setup.md` table updated if servers changed
- [ ] Reload IDE: **Developer: Reload Window**
- [ ] Run verification (below)

## Verify connections

```bash
# Infrastructure
docker info
docker run --rm hashicorp/terraform-mcp-server:1.0.0 --help

# Vite MCP (dev server must be running)
npm run dev   # separate terminal
curl -s -o /dev/null -w "vite-mcp: %{http_code}\n" http://localhost:5173/__mcp/sse

# Playwright browsers
test -d .playwright-browsers && echo "playwright browsers: OK"
```

In Cursor / VS Code MCP panel, all five servers should show connected (vite only after `npm run dev` + reload).

## Platform notes

| Platform | Notes |
|----------|-------|
| macOS / Linux | Use `docker` on `PATH`; no hardcoded paths in configs |
| Windows | Docker Desktop + Node on `PATH`; VS Code `inputs` for TFE tokens |
| Vite MCP | Always start dev server before IDE reload |

## Related docs

- [Terraform MCP details](./terraform-mcp.md) — registry tools, rate limits, HCP variables
- [Architecture](./architecture.md) — system overview