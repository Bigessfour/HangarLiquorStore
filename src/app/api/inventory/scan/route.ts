// Quick API stub for the provided scan-modal example (Phase 2).
// NOTE: This project is Vite + React Router (not Next.js App Router).
// Real calls are handled by src/lib/api.ts (mock + TanStack) + backend/lambdas when VITE_API_URL set.
//
// When running `npm run dev` the modal example will hit the mock in lib/api via the updated scan-modal.
export async function POST(req: Request) {
  const body = await req.json();
  // Simulated response matching user's stub + 4th of July / Bud Light / Jack Daniels context
  return Response.json({
    success: true,
    newStock: 42,
    suggestion: 'Jack Daniels reorder triggered',
    forecast: '4th July boost applied',
    upc: body.upc,
    event: body.event || '4thOfJulyBoost',
    store: body.store || 'HangerLiquor-Wiley',
  });
}
