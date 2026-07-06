## ngrok / Prod Deploy Test (to close Phase 7)
- Local: npm run dev, ngrok http 5173 for mobile test (scan, PWA install, offline queue, forecasts with/without Canvas).
- Verify: All flows from runbook, e2e if set, PWA add to home, QR scan.
- Prod: After terraform apply, set VITE_API_URL, npm run build, deploy PWA (S3+CF or client).
- Test on device: install, use real data or demo, check sync, live updates.
- Once passing: ready for Hanger staff.
