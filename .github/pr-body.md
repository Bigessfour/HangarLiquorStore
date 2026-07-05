## Summary

Introduces the **Hanger Liquor Store mobile PWA shell** for rural store staff in Wiley, CO — building on the existing forecast/events backend with a mobile-first UI, offline scaffold, and developer tooling.

## What changed

### feat: mobile PWA shell (`ea92b41`)
- **5-tab bottom navigation** — Dashboard | Scan | Inventory | Events | Reports (48px+ touch targets)
- **Scan Bottle FAB** — hero floating action button on every screen (sheet shell; camera wiring next)
- **Dashboard stub** — Hanger mock data (Coors, Jack Daniel's, Tito's, low-stock alerts, July 4th reorder)
- **shadcn/ui theming** — CSS variables, dark/light mode (`next-themes`), Hanger amber accent
- **PWA** — `vite-plugin-pwa`, service worker, IndexedDB offline queue + sync toast
- **New pages** — `scan/`, `inventory/`, `events/`, `dashboard/` feature stubs
- **Deps** — `html5-qrcode`, `zustand`, `idb`, `vite-plugin-mcp`, Radix UI primitives

### chore: dev tooling & docs (`cbc632f`)
- **`docs/`** — architecture + scan, dashboard, offline-sync Mermaid flows
- **IDE MCP** — Cursor/VS Code/Grok config for vite, terraform, playwright, chrome-devtools
- **Lint/format** — ESLint flat config, Prettier, EditorConfig, Trunk
- **`.cursor/rules.md`** — Hanger Liquor Store agent guardrails

## Test plan

- [x] `npm run typecheck` — pass
- [x] `npm run build` — pass (PWA SW generated)
- [x] `npm run test:backend` — 2/2 pass
- [ ] Manual: `npm run dev` → verify bottom nav, Scan FAB, dashboard cards on mobile viewport
- [ ] Manual: toggle dark/light mode in header

## Out of scope (follow-up PRs)

- `html5-qrcode` camera integration in Scan FAB sheet
- Optimistic scan → `/api/inventory/scan` API wiring
- Dashboard live TanStack Query data
- E2E test updates for new navigation
- Bundle size optimization (Recharts chunk ~460 kB)

## Screenshots

_Add mobile viewport screenshots after manual QA._