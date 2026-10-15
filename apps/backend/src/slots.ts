import type { components } from '@calendar/api';

type EventType = components['schemas']['EventType'];
type Slots = components['schemas']['Slots'];

/** The time a Booking takes up, as `toISOString()` text. */
export interface BookedTime {
  start: string;
  end: string;
}

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

// The only place that holds the Working Hours and Booking Window rules.
const WINDOW_DAYS = 14;
const WORK_START_MINUTES = 9 * 60;
const WORK_END_MINUTES = 18 * 60;
const STEP_MINUTES = 15;

/**
 * Every quarter-hour start of the Event Type in the Booking Window (14 days from today in UTC)
 * whose call ends by 18:00. A start is unavailable when it is past or its call would overlap a Booking.
 */
export function computeSlots(
  eventType: Pick<EventType, 'durationMinutes'>,
  bookings: BookedTime[],
  now: Date,
): Slots {
  const duration = eventType.durationMinutes * MINUTE;
  const booked = bookings.map((b) => ({ start: Date.parse(b.start), end: Date.parse(b.end) }));
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());

  return {
    days: Array.from({ length: WINDOW_DAYS }, (_, i) => {
      const midnight = today + i * DAY;
      const starts = [];
      for (
        let start = midnight + WORK_START_MINUTES * MINUTE;
        start + duration <= midnight + WORK_END_MINUTES * MINUTE;
        start += STEP_MINUTES * MINUTE
      ) {
        const end = start + duration;
        const available =
          start > now.getTime() && !booked.some((b) => start < b.end && end > b.start);
        starts.push({ start: new Date(start).toISOString(), available });
      }
      return { date: new Date(midnight).toISOString().slice(0, 10), starts };
    }),
  };
}

/**
 * Whether `start` (as `toISOString()` text) is a Slot of the Event Type that hasn't started yet.
 * Bookings are not considered: the store checks overlap when it saves the Booking.
 */
export function isUpcomingSlot(
  eventType: Pick<EventType, 'durationMinutes'>,
  start: string,
  now: Date,
): boolean {
  return computeSlots(eventType, [], now).days.some((day) =>
    day.starts.some((slot) => slot.start === start && slot.available),
  );
}
