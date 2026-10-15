import type { components } from '@calendar/api';
import { expect, test } from '@playwright/test';

type Booking = components['schemas']['Booking'];
type EventTypeInput = components['schemas']['EventTypeInput'];

const eventType: EventTypeInput = {
  name: 'E2E intro call',
  description: 'A short call to get to know each other.',
  durationMinutes: 30,
};

const guest = { name: 'Ada Lovelace', email: 'ada@example.com' };

/** "09:30" plus some minutes, as "HH:MM". */
function addMinutes(time: string, minutes: number) {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + minutes;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

// API calls go through the frontend's /api proxy, like the browser's.
test('a Guest books a call', async ({ page, request }) => {
  const created = await request.post('/api/event-types', { data: eventType });
  expect(created.ok()).toBe(true);

  await page.goto('/');
  await page.getByRole('main').getByRole('link', { name: 'Book a call' }).click();

  // Step 1: the Event Type.
  await page
    .getByRole('list', { name: 'Event types' })
    .getByRole('button', { name: new RegExp(eventType.name) })
    .click();

  // Step 2: the calendar. It opens on the first day with a free start.
  await expect(
    page.getByRole('heading', { name: `Pick a time for ${eventType.name}` }),
  ).toBeVisible();
  const day = page.getByRole('list', { name: 'Days' }).getByRole('button', { pressed: true });
  const dayLabel = (await day.locator('span').first().textContent()) ?? '';
  expect(dayLabel).not.toBe('');
  const start = page
    .getByRole('list', { name: 'Start times' })
    .getByRole('button', { disabled: false })
    .first();
  const time = (await start.textContent()) ?? '';
  expect(time).toMatch(/^\d\d:\d\d$/);
  await start.click();

  // Step 3: the Guest's details.
  const form = page.getByRole('form', { name: 'Your details' });
  await form.getByLabel('Your name').fill(guest.name);
  await form.getByLabel('Email').fill(guest.email);
  await form.getByRole('button', { name: 'Book' }).click();

  // Step 4: the confirmation.
  await expect(page.getByRole('heading', { name: 'Booked' })).toBeVisible();
  await expect(page.getByText(eventType.name, { exact: true })).toBeVisible();
  await expect(
    page.getByText(`${dayLabel}, ${time}–${addMinutes(time, eventType.durationMinutes)} UTC`),
  ).toBeVisible();

  // The Booking is really saved.
  const bookings = (await (await request.get('/api/bookings')).json()) as Booking[];
  expect(bookings).toEqual([
    expect.objectContaining({
      eventTypeName: eventType.name,
      guestName: guest.name,
      guestEmail: guest.email,
    }),
  ]);
});
