/**
 * Demo-mode simulation flags (see `.env.demo` + `npm run demo --mode demo`).
 * Honest walkthrough: UI shows what live Square-connected analytics would look like,
 * without claiming the register is actually linked.
 */

export function isDemoAuth(): boolean {
  return import.meta.env.VITE_DEMO_AUTH === 'true';
}

/** Square status + sync behave as a connected merchant (sample data). */
export function isDemoSquareSimulated(): boolean {
  return import.meta.env.VITE_DEMO_SIMULATE_SQUARE === 'true';
}

/** Profit & Ops uses connected-style snapshot + square_sync provenance (still sample $). */
export function isDemoProfitSimulated(): boolean {
  return (
    import.meta.env.VITE_DEMO_SIMULATE_PROFIT === 'true' || isDemoSquareSimulated()
  );
}

export const DEMO_SQUARE_DISCLAIMER =
  'Demo simulation — representation of what you would see after connecting live Square (OAuth + sync). Not Hangar’s real register data.';

export const DEMO_PROFIT_DISCLAIMER =
  'Demo simulation of a Square-connected Profit & Ops view. Dollar figures are sample estimates until Owner connects Square and syncs live sales.';
