import type { components, paths } from '@calendar/api';
import createClient from 'openapi-fetch';

export const api = createClient<paths>({
  // Absolute, because a Request can't be built from a relative URL outside the browser (tests).
  baseUrl: new URL('/api', window.location.origin).href,
  // Looked up per request, so tests can stub fetch after this module loads.
  fetch: (request) => globalThis.fetch(request),
});

export type EventType = components['schemas']['EventType'];
export type EventTypeInput = components['schemas']['EventTypeInput'];
export type ApiError = components['schemas']['Error'];
export type Slots = components['schemas']['Slots'];
export type Booking = components['schemas']['Booking'];
export type BookingInput = components['schemas']['BookingInput'];
