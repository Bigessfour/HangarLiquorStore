import { apiClient } from '@/lib/api-client';
import type { CreateLocalEventInput, LocalEvent, StaticHoliday } from '@/types/forecast';

export interface EventsResponse {
  localEvents: LocalEvent[];
  staticHolidays: StaticHoliday[];
}

export const eventsApi = {
  getAll() {
    return apiClient<EventsResponse>('/api/events');
  },

  create(input: CreateLocalEventInput) {
    return apiClient<LocalEvent>('/api/events', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  remove(id: string) {
    return apiClient<void>(`/api/events/${id}`, { method: 'DELETE' });
  },
};
