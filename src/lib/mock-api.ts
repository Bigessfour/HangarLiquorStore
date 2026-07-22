/** True when VITE_API_URL is unset — local mock catalog / demo path (no live API). */
export function isMockApi(): boolean {
  return !import.meta.env.VITE_API_URL;
}
