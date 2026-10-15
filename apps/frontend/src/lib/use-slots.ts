import { useCallback } from 'react';
import { api } from '@/lib/api';
import { useLoad } from '@/lib/use-load';

/** Loads every start of an Event Type in the Booking Window, as the server marks them. */
export function useSlots(eventTypeId: string) {
  return useLoad(
    useCallback(
      () =>
        api
          .GET('/event-types/{id}/slots', { params: { path: { id: eventTypeId } } })
          .then(({ data }) => data),
      [eventTypeId],
    ),
  );
}
