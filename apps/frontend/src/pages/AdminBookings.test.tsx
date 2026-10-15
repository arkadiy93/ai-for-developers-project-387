import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Booking } from '@/lib/api';
import { json, pending, serverError, stubApi, workshop, workshopBooking } from '@/test/api';
import { renderAt } from '@/test/render';

const inProgress: Booking = {
  ...workshopBooking,
  id: '1d2c3b4a-5f6e-4d7c-8b9a-0f1e2d3c4b5a',
  eventTypeName: 'Intro call',
  start: '2026-10-15T09:45:00.000Z',
  end: '2026-10-15T10:00:00.000Z',
  guestName: 'Grace Hopper',
  guestEmail: 'grace@example.com',
};

const laterToday: Booking = {
  ...workshopBooking,
  id: '7a6b5c4d-3e2f-4a1b-9c8d-7e6f5a4b3c2d',
  start: '2026-10-15T14:00:00.000Z',
  end: '2026-10-15T15:00:00.000Z',
};

async function findBookings() {
  return screen.findByRole('region', { name: 'Upcoming bookings' });
}

describe('admin upcoming bookings', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-15T09:50:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('groups the bookings by day, with today first as "Today"', async () => {
    stubApi({
      'GET /api/event-types': () => json([workshop]),
      'GET /api/bookings': () => json([inProgress, laterToday, workshopBooking]),
    });
    renderAt('/admin');
    const section = await findBookings();

    expect(section).toHaveTextContent('All times are UTC.');
    const days = await within(section).findAllByRole('list');
    expect(days).toHaveLength(2);
    expect(days[0]).toHaveAccessibleName('Today');
    expect(days[1]).toHaveAccessibleName('Fri 16 Oct');
    expect(within(days[0]).getAllByRole('listitem')).toHaveLength(2);
    expect(within(days[1]).getAllByRole('listitem')).toHaveLength(1);
  });

  it('shows the time, the stored Event Type name, the Guest and a mailto link on each row', async () => {
    const renamedLater: Booking = { ...workshopBooking, eventTypeName: 'Old workshop name' };
    stubApi({
      'GET /api/event-types': () => json([workshop]),
      'GET /api/bookings': () => json([renamedLater]),
    });
    renderAt('/admin');
    const section = await findBookings();

    const row = await within(section).findByRole('listitem');
    expect(row).toHaveTextContent('09:30–10:30');
    expect(row).toHaveTextContent('Old workshop name with Ada Lovelace');
    expect(within(row).getByText('Old workshop name').tagName).toBe('EM');
    expect(within(row).getByRole('link', { name: 'ada@example.com' })).toHaveAttribute(
      'href',
      'mailto:ada@example.com',
    );
    expect(within(row).queryByRole('button')).not.toBeInTheDocument();
  });

  it('says so when nothing is booked', async () => {
    stubApi({
      'GET /api/event-types': () => json([workshop]),
      'GET /api/bookings': () => json([]),
    });
    renderAt('/admin');

    expect(
      await within(await findBookings()).findByText('Nothing booked yet.'),
    ).toBeInTheDocument();
  });

  it('shows placeholders while the bookings load', async () => {
    stubApi({
      'GET /api/event-types': () => json([workshop]),
      'GET /api/bookings': pending,
    });
    renderAt('/admin');

    expect(
      within(await findBookings()).getByRole('status', { name: 'Loading bookings' }),
    ).toBeInTheDocument();
  });

  it('shows an error with Retry when loading fails, and loads again on Retry', async () => {
    let fail = true;
    stubApi({
      'GET /api/event-types': () => json([workshop]),
      'GET /api/bookings': () => (fail ? json(serverError, 500) : json([workshopBooking])),
    });
    renderAt('/admin');
    const section = await findBookings();

    const alert = await within(section).findByRole('alert');
    expect(alert).toHaveTextContent("Couldn't load bookings.");
    fail = false;
    await userEvent.click(within(alert).getByRole('button', { name: 'Retry' }));

    expect(await within(section).findByText('Ada Lovelace', { exact: false })).toBeInTheDocument();
    expect(within(section).queryByRole('alert')).not.toBeInTheDocument();
  });
});
