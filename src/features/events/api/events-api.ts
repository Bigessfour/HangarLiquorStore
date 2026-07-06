import { apiClient } from '@/lib/api-client';
import type { CreateLocalEventInput, LocalEvent, StaticHoliday } from '@/types/forecast';

export interface EventsResponse {
  localEvents: LocalEvent[];
  staticHolidays: StaticHoliday[];
}

const MOCK_LOCAL_EVENTS: LocalEvent[] = [
  {
    id: 'demo-july4',
    name: 'July 4th Weekend',
    startDate: '2026-07-03',
    endDate: '2026-07-05',
    multiplier: 2.8,
    notes: 'Beer demand spike',
  },
  {
    id: 'demo-football',
    name: 'Wiley Football Season',
    startDate: '2026-08-15',
    endDate: '2026-11-30',
    multiplier: 1.25,
    notes: 'Spirits bump on game nights',
  },
];

const MOCK_STATIC_HOLIDAYS: StaticHoliday[] = [
  {
    id: 'july-4th',
    name: 'July 4th Weekend',
    startDate: '2026-07-03',
    endDate: '2026-07-05',
    multiplier: 2.8,
  },
];

let mockEventsStore = [...MOCK_LOCAL_EVENTS];

function useMockApi(): boolean {
  return !import.meta.env.VITE_API_URL;
}

export const eventsApi = {
  getAll() {
    if (useMockApi()) {
      return Promise.resolve({
        localEvents: mockEventsStore,
        staticHolidays: MOCK_STATIC_HOLIDAYS,
      });
    }
    return apiClient<EventsResponse>('/api/events');
  },

  create(input: CreateLocalEventInput) {
    if (useMockApi()) {
      const created: LocalEvent = {
        id: `evt_${Date.now()}`,
        ...input,
      };
      mockEventsStore = [...mockEventsStore, created];
      return Promise.resolve(created);
    }
    return apiClient<LocalEvent>('/api/events', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  remove(id: string) {
    if (useMockApi()) {
      mockEventsStore = mockEventsStore.filter((e) => e.id !== id);
      return Promise.resolve();
    }
    return apiClient<void>(`/api/events/${id}`, { method: 'DELETE' });
  },
};

/** Reset mock events for demo / e2e */
export function resetMockEvents() {
  mockEventsStore = [...MOCK_LOCAL_EVENTS];
}