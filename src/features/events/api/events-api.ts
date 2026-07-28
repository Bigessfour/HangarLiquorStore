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
    focuses: ['Beer/RTD', 'Ice', 'Essentials'],
  },
  {
    id: 'demo-football',
    name: 'Wiley Football Season',
    startDate: '2026-08-15',
    endDate: '2026-11-30',
    multiplier: 1.25,
    notes: 'Spirits bump on game nights',
    focuses: ['Spirits', 'Beer/RTD'],
  },
  {
    id: 'demo-hunting',
    name: 'Hunting Season Opener',
    startDate: '2026-10-17',
    endDate: '2026-10-19',
    multiplier: 1.55,
    notes: 'Spirits + beer for opening weekend — local area demand',
    focuses: ['Spirits', 'Beer/RTD', 'Essentials'],
  },
];

/** Demo static holidays (aligned with backend calendar; focuses drive stocking UI). */
const MOCK_STATIC_HOLIDAYS: StaticHoliday[] = [
  {
    id: 'july-4th',
    name: 'July 4th Weekend',
    startDate: '2026-07-03',
    endDate: '2026-07-05',
    multiplier: 2.8,
    focuses: ['Beer/RTD', 'Ice', 'Essentials'],
    stockingNote: 'Top summer holiday — beer, ice, and cooler fills; stock 2–3 days early.',
  },
  {
    id: 'labor-day',
    name: 'Labor Day Weekend',
    startDate: '2026-09-05',
    endDate: '2026-09-07',
    multiplier: 2.0,
    focuses: ['Beer/RTD', 'Ice', 'Essentials'],
    stockingNote: 'Last big summer weekend — beer/RTD and ice; shoppers buy Fri–Sat.',
  },
  {
    id: 'halloween',
    name: 'Halloween',
    startDate: '2026-10-30',
    endDate: '2026-11-01',
    multiplier: 2.0,
    focuses: ['Spirits', 'Beer/RTD', 'Essentials'],
    stockingNote: 'Adult Halloween spend — spirits, beer, and party mixers.',
  },
  {
    id: 'thanksgiving',
    name: 'Thanksgiving',
    startDate: '2026-11-25',
    endDate: '2026-11-27',
    multiplier: 2.5,
    focuses: ['Spirits', 'Beer/RTD', 'Essentials'],
    stockingNote: 'Turkey Wednesday is one of the biggest off-premise days.',
  },
  {
    id: 'christmas',
    name: 'Christmas',
    startDate: '2026-12-22',
    endDate: '2026-12-25',
    multiplier: 2.4,
    focuses: ['Spirits', 'Beer/RTD', 'Essentials'],
    stockingNote: 'Dec 23–24 among busiest days — gift bottles before Christmas Eve.',
  },
  {
    id: 'new-years',
    name: "New Year's Eve",
    startDate: '2026-12-30',
    endDate: '2027-01-01',
    multiplier: 2.6,
    focuses: ['Spirits', 'Beer/RTD', 'Essentials'],
    stockingNote: 'Biggest party night — champagne, vodka, beer, ice early.',
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
