import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateLocalEventInput } from '@/types/forecast';
import { eventsApi } from './events-api';

export function useLocalEvents() {
  return useQuery({
    queryKey: ['local-events'],
    queryFn: () => eventsApi.getAll(),
  });
}

export function useCreateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateLocalEventInput) => eventsApi.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['local-events'] });
      queryClient.invalidateQueries({ queryKey: ['forecasts'] });
    },
  });
}

export function useDeleteEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => eventsApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['local-events'] });
      queryClient.invalidateQueries({ queryKey: ['forecasts'] });
    },
  });
}