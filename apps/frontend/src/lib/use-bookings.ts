import { useCallback } from 'react';
import { api } from '@/lib/api';
import { useLoad } from '@/lib/use-load';

/** Loads the Bookings that haven't ended yet, sorted by start by the server. */
export function useBookings() {
  return useLoad(useCallback(() => api.GET('/bookings').then(({ data }) => data), []));
}
