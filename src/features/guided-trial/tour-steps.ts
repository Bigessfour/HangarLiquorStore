import type { GuidedTrialStep } from './tour-types';

/** Ordered stops for Chris's owner guided trial (spec 002). */
export const GUIDED_TRIAL_STEPS: GuidedTrialStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Hanger Liquor Inventory',
    body: 'Quick trial run — eight short stops. Each highlights one control so you can see what it does for the store. Tap Next to begin, or Skip anytime.',
  },
  {
    id: 'dashboard',
    route: '/',
    target: 'tour-dashboard',
    title: 'Home story — Dashboard',
    body: 'Low stock, total bottles, and Top Movers live here. This is the “why we built this” screen — open it anytime from More → Dashboard.',
  },
  {
    id: 'scan',
    route: '/scan',
    target: 'tour-scan',
    title: 'Scan a bottle',
    body: 'Daily habit: camera, photo, or type a UPC by hand on a laptop. Confirm the product and update stock in a couple of taps.',
  },
  {
    id: 'inventory',
    route: '/inventory',
    target: 'tour-inventory',
    title: 'Find & fix inventory',
    body: 'Search by name or UPC, filter by category, and edit quantities. Managers can also receive a shipment via CSV.',
  },
  {
    id: 'events',
    route: '/events',
    target: 'tour-events',
    title: 'Local events',
    body: 'Wiley weekends and festivals bump demand. Managers add events so forecasts plan for beer, ice, and essentials — not just a quiet Tuesday.',
  },
  {
    id: 'forecast',
    route: '/forecast',
    target: 'tour-forecast',
    title: 'Forecast',
    body: 'Fourteen-day demand from the store’s statistical engine (events & holidays included). SageMaker Canvas is optional — this screen works without it.',
  },
  {
    id: 'suggestions',
    route: '/suggestions',
    target: 'tour-suggestions',
    title: 'Suggestions',
    body: 'Act on the forecast: add stock or boost demand when something is running hot. Managers get the action buttons.',
  },
  {
    id: 'more',
    route: '/more',
    target: 'tour-more',
    title: 'More — install & training',
    body: 'Put the app on a phone, reset demo training data, and (on a live store) connect Square. You can restart this trial from here anytime.',
  },
];
