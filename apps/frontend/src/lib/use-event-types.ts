import { useCallback } from 'react';
import { api } from '@/lib/api';
import { useLoad } from '@/lib/use-load';

/** Loads the Event Types, sorted by name by the server. */
export function useEventTypes() {
  return useLoad(useCallback(() => api.GET('/event-types').then(({ data }) => data), []));
}
