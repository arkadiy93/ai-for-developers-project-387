import { describe, expect, it } from 'vitest';
import { computeSlots } from './slots.js';

const now = new Date('2026-10-15T10:07:00.000Z');
const intro = { durationMinutes: 15 };

function day(slots: ReturnType<typeof computeSlots>, date: string) {
  return slots.days.find((d) => d.date === date);
}

describe('computeSlots', () => {
  it('covers the 14 days of the Booking Window, from today to day 14 and not day 15', () => {
    const slots = computeSlots(intro, [], now);

    expect(slots.days).toHaveLength(14);
    expect(slots.days[0].date).toBe('2026-10-15');
    expect(slots.days[13].date).toBe('2026-10-28');
    expect(day(slots, '2026-10-29')).toBeUndefined();
  });

  it('lists every quarter-hour start from 09:00, marking starts already past today unavailable', () => {
    const today = day(computeSlots(intro, [], now), '2026-10-15')!;

    expect(today.starts.slice(0, 6)).toEqual([
      { start: '2026-10-15T09:00:00.000Z', available: false },
      { start: '2026-10-15T09:15:00.000Z', available: false },
      { start: '2026-10-15T09:30:00.000Z', available: false },
      { start: '2026-10-15T09:45:00.000Z', available: false },
      { start: '2026-10-15T10:00:00.000Z', available: false },
      { start: '2026-10-15T10:15:00.000Z', available: true },
    ]);
  });

  it('stops at the last start whose call still ends by 18:00', () => {
    const tomorrow = day(computeSlots({ durationMinutes: 90 }, [], now), '2026-10-16')!;

    expect(tomorrow.starts).toHaveLength(31);
    expect(tomorrow.starts.at(-1)).toEqual({ start: '2026-10-16T16:30:00.000Z', available: true });
  });

  it('marks unavailable every start whose call would overlap a Booking of any Event Type', () => {
    // A 1 h Booking (of some other Event Type) at 12:00–13:00 tomorrow.
    const booking = { start: '2026-10-16T12:00:00.000Z', end: '2026-10-16T13:00:00.000Z' };

    const tomorrow = day(computeSlots({ durationMinutes: 30 }, [booking], now), '2026-10-16')!;
    const around = tomorrow.starts.filter(
      ({ start }) => start >= '2026-10-16T11:15:00.000Z' && start <= '2026-10-16T13:00:00.000Z',
    );

    expect(around).toEqual([
      { start: '2026-10-16T11:15:00.000Z', available: true },
      { start: '2026-10-16T11:30:00.000Z', available: true },
      { start: '2026-10-16T11:45:00.000Z', available: false },
      { start: '2026-10-16T12:00:00.000Z', available: false },
      { start: '2026-10-16T12:15:00.000Z', available: false },
      { start: '2026-10-16T12:30:00.000Z', available: false },
      { start: '2026-10-16T12:45:00.000Z', available: false },
      { start: '2026-10-16T13:00:00.000Z', available: true },
    ]);
  });

  it('gives a 9 h Event Type exactly one start per day, at 09:00', () => {
    const slots = computeSlots({ durationMinutes: 540 }, [], now);

    expect(slots.days.map((d) => d.starts)).toEqual(
      slots.days.map((d) => [
        { start: `${d.date}T09:00:00.000Z`, available: d.date !== '2026-10-15' },
      ]),
    );
  });
});
