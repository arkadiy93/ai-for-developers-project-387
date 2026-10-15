import { vi } from 'vitest';
import type { ApiError, Booking, EventType, Slots } from '@/lib/api';

type Handler = (request: Request) => Response | Promise<Response>;

/**
 * Stubs `fetch` with one handler per `"<METHOD> <path>"`, for example `"GET /api/event-types"`.
 * An unstubbed request fails the test.
 */
export function stubApi(routes: Record<string, Handler>) {
  const fetch = vi.fn(async (request: Request) => {
    const key = `${request.method} ${new URL(request.url).pathname}`;
    const handler = routes[key];
    if (!handler) {
      throw new Error(`Unexpected request: ${key}`);
    }
    return handler(request);
  });
  vi.stubGlobal('fetch', fetch);
  return fetch;
}

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** A response that never arrives, to hold the UI in its loading state. */
export function pending(): Promise<Response> {
  return new Promise(() => {});
}

export const serverError: ApiError = { code: 'INTERNAL', message: 'Internal server error' };

export const deepDive: EventType = {
  id: '6f1c2a7e-2f3b-4c1d-9a8e-1b2c3d4e5f60',
  name: 'Deep dive',
  description: 'Walk through your project in detail.',
  durationMinutes: 90,
};

export const intro: EventType = {
  id: '0b8d7c6e-5f4a-4b3c-8d2e-1f0a9b8c7d6e',
  name: 'Intro call',
  description: 'A quick hello.',
  durationMinutes: 15,
};

export const workshop: EventType = {
  id: '9e8d7c6b-5a4f-4e3d-8c2b-1a0f9e8d7c6b',
  name: 'Workshop',
  description: 'A long working session.',
  durationMinutes: 60,
};

/** The free times of `workshop`: today is full, tomorrow has two free starts, the day after has one. */
export const workshopSlots: Slots = {
  days: [
    {
      date: '2026-10-15',
      starts: [
        { start: '2026-10-15T09:00:00.000Z', available: false },
        { start: '2026-10-15T09:15:00.000Z', available: false },
      ],
    },
    {
      date: '2026-10-16',
      starts: [
        { start: '2026-10-16T09:00:00.000Z', available: true },
        { start: '2026-10-16T09:15:00.000Z', available: false },
        { start: '2026-10-16T09:30:00.000Z', available: true },
      ],
    },
    {
      date: '2026-10-17',
      starts: [
        { start: '2026-10-17T09:00:00.000Z', available: false },
        { start: '2026-10-17T09:15:00.000Z', available: true },
      ],
    },
  ],
};

/** What the server answers when a Guest books `workshop` at 09:30 tomorrow. */
export const workshopBooking: Booking = {
  id: '3a2b1c0d-9e8f-4a7b-8c6d-5e4f3a2b1c0d',
  eventTypeId: workshop.id,
  eventTypeName: workshop.name,
  start: '2026-10-16T09:30:00.000Z',
  end: '2026-10-16T10:30:00.000Z',
  guestName: 'Ada Lovelace',
  guestEmail: 'ada@example.com',
};
