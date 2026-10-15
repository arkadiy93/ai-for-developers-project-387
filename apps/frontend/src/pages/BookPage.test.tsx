import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import {
  deepDive,
  intro,
  json,
  pending,
  serverError,
  stubApi,
  workshop,
  workshopBooking,
  workshopSlots,
} from '@/test/api';
import { renderAt } from '@/test/render';

describe('booking page, step 1: event type', () => {
  it('lists every event type with its name, description and duration', async () => {
    stubApi({ 'GET /api/event-types': () => json([deepDive, intro, workshop]) });
    renderAt('/book');

    const list = await screen.findByRole('list', { name: 'Event types' });
    const items = within(list).getAllByRole('listitem');
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent('Deep dive');
    expect(items[1]).toHaveTextContent('Intro call');
    expect(items[2]).toHaveTextContent('Workshop');
    expect(within(items[0]).getByText('Walk through your project in detail.')).toBeInTheDocument();
    expect(within(items[0]).getByText('1 h 30 min')).toBeInTheDocument();
    expect(within(items[1]).getByText('15 min')).toBeInTheDocument();
    expect(within(items[2]).getByText('1 h')).toBeInTheDocument();
  });

  it('shows the four wizard steps with step 1 active', async () => {
    stubApi({ 'GET /api/event-types': () => json([intro]) });
    renderAt('/book');

    const steps = await screen.findByRole('list', { name: 'Booking steps' });
    expect(
      within(steps)
        .getAllByRole('listitem')
        .map((step) => step.textContent),
    ).toEqual(['1. Event type', '2. Time', '3. Your details', '4. Done']);
    expect(within(steps).getByText('1. Event type')).toHaveAttribute('aria-current', 'step');
  });

  it('explains that there is nothing to book when there are no event types', async () => {
    stubApi({ 'GET /api/event-types': () => json([]) });
    renderAt('/book');

    expect(await screen.findByText('No calls to book yet.')).toBeInTheDocument();
    expect(
      screen.getByText("The Owner hasn't set up any event types. Check back later."),
    ).toBeInTheDocument();
  });

  it('shows placeholders while the event types load', async () => {
    stubApi({ 'GET /api/event-types': pending });
    renderAt('/book');

    expect(await screen.findByRole('status', { name: 'Loading event types' })).toBeInTheDocument();
  });

  it('shows an error with Retry when loading fails, and loads again on Retry', async () => {
    let fail = true;
    stubApi({
      'GET /api/event-types': () => (fail ? json(serverError, 500) : json([intro])),
    });
    renderAt('/book');

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent("Couldn't load event types.");
    fail = false;
    await userEvent.click(within(alert).getByRole('button', { name: 'Retry' }));

    expect(await screen.findByRole('button', { name: /Intro call/ })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

describe('booking page, step 2: time', () => {
  const slotsRoute = `GET /api/event-types/${workshop.id}/slots`;

  async function pickWorkshop() {
    renderAt('/book');
    await userEvent.click(await screen.findByRole('button', { name: /Workshop/ }));
  }

  it('moves to step 2 for the chosen event type, saying times are UTC', async () => {
    stubApi({
      'GET /api/event-types': () => json([intro, workshop]),
      [slotsRoute]: () => json(workshopSlots),
    });
    await pickWorkshop();

    expect(
      await screen.findByRole('heading', { name: 'Pick a time for Workshop (1 h)' }),
    ).toBeInTheDocument();
    expect(screen.getByText('All times are UTC.')).toBeInTheDocument();
    expect(screen.getByText('2. Time')).toHaveAttribute('aria-current', 'step');
  });

  it('shows the days with their free counts, disables full days and preselects the first free one', async () => {
    stubApi({
      'GET /api/event-types': () => json([workshop]),
      [slotsRoute]: () => json(workshopSlots),
    });
    await pickWorkshop();

    const days = within(await screen.findByRole('list', { name: 'Days' })).getAllByRole('button');
    expect(days.map((day) => day.textContent)).toEqual([
      'Thu 15 Oct0 free',
      'Fri 16 Oct2 free',
      'Sat 17 Oct1 free',
    ]);
    expect(days[0]).toBeDisabled();
    expect(days[1]).toBeEnabled();
    expect(days[1]).toHaveAttribute('aria-pressed', 'true');
    expect(days[2]).toHaveAttribute('aria-pressed', 'false');
  });

  it('shows every start of the selected day, with unavailable ones disabled', async () => {
    stubApi({
      'GET /api/event-types': () => json([workshop]),
      [slotsRoute]: () => json(workshopSlots),
    });
    await pickWorkshop();

    const grid = await screen.findByRole('list', { name: 'Start times' });
    const starts = within(grid).getAllByRole('button');
    expect(starts.map((start) => start.textContent)).toEqual(['09:00', '09:15', '09:30']);
    expect(starts[0]).toBeEnabled();
    expect(starts[1]).toBeDisabled();
    expect(starts[2]).toBeEnabled();

    await userEvent.click(screen.getByRole('button', { name: /Sat 17 Oct/ }));

    const after = within(screen.getByRole('list', { name: 'Start times' })).getAllByRole('button');
    expect(after.map((start) => start.textContent)).toEqual(['09:00', '09:15']);
    expect(after[0]).toBeDisabled();
    expect(after[1]).toBeEnabled();
  });

  it('moves to step 3 when an available start is clicked', async () => {
    stubApi({
      'GET /api/event-types': () => json([workshop]),
      [slotsRoute]: () => json(workshopSlots),
    });
    await pickWorkshop();

    await userEvent.click(await screen.findByRole('button', { name: '09:30' }));

    expect(screen.getByText('3. Your details')).toHaveAttribute('aria-current', 'step');
  });

  it('goes back to step 1 with the event type still selected on "Change event type"', async () => {
    stubApi({
      'GET /api/event-types': () => json([intro, workshop]),
      [slotsRoute]: () => json(workshopSlots),
    });
    await pickWorkshop();

    await userEvent.click(await screen.findByRole('button', { name: 'Change event type' }));

    expect(await screen.findByRole('button', { name: /Workshop/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: /Intro call/ })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(screen.getByText('1. Event type')).toHaveAttribute('aria-current', 'step');
  });

  it('shows placeholders while the free times load', async () => {
    stubApi({ 'GET /api/event-types': () => json([workshop]), [slotsRoute]: pending });
    await pickWorkshop();

    expect(await screen.findByRole('status', { name: 'Loading free times' })).toBeInTheDocument();
  });

  it('shows an error with Retry when loading fails, and loads again on Retry', async () => {
    let fail = true;
    stubApi({
      'GET /api/event-types': () => json([workshop]),
      [slotsRoute]: () => (fail ? json(serverError, 500) : json(workshopSlots)),
    });
    await pickWorkshop();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent("Couldn't load free times.");
    fail = false;
    await userEvent.click(within(alert).getByRole('button', { name: 'Retry' }));

    expect(await screen.findByRole('list', { name: 'Start times' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

describe('booking page, steps 3 and 4: details and done', () => {
  const slotsRoute = `GET /api/event-types/${workshop.id}/slots`;

  async function pickWorkshopAt0930() {
    renderAt('/book');
    await userEvent.click(await screen.findByRole('button', { name: /Workshop/ }));
    await userEvent.click(await screen.findByRole('button', { name: '09:30' }));
  }

  async function fillAndBook(name = 'Ada Lovelace', email = 'ada@example.com') {
    await userEvent.type(screen.getByLabelText('Your name'), name);
    await userEvent.type(screen.getByLabelText('Email'), email);
    await userEvent.click(screen.getByRole('button', { name: 'Book' }));
  }

  it('books the chosen time and confirms it, then starts over on "Book another call"', async () => {
    let sent: unknown;
    stubApi({
      'GET /api/event-types': () => json([intro, workshop]),
      [slotsRoute]: () => json(workshopSlots),
      'POST /api/bookings': async (request) => {
        sent = await request.json();
        return json(workshopBooking, 201);
      },
    });
    await pickWorkshopAt0930();

    expect(screen.getByText('3. Your details')).toHaveAttribute('aria-current', 'step');
    expect(
      screen.getByRole('heading', { name: 'Workshop · Fri 16 Oct, 09:30 UTC' }),
    ).toBeInTheDocument();
    await fillAndBook('  Ada Lovelace ', ' ada@example.com ');

    expect(await screen.findByRole('heading', { name: 'Booked' })).toBeInTheDocument();
    expect(sent).toEqual({
      eventTypeId: workshop.id,
      start: '2026-10-16T09:30:00.000Z',
      guestName: 'Ada Lovelace',
      guestEmail: 'ada@example.com',
    });
    expect(screen.getByText('4. Done')).toHaveAttribute('aria-current', 'step');
    expect(screen.getByText('Workshop')).toBeInTheDocument();
    expect(screen.getByText('Fri 16 Oct, 09:30–10:30 UTC')).toBeInTheDocument();
    expect(
      screen.getByText("The Owner will see this call in their list. There's nothing else to do."),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Book another call' }));

    expect(screen.getByText('1. Event type')).toHaveAttribute('aria-current', 'step');
    expect(await screen.findByRole('button', { name: /Workshop/ })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('goes back to step 2 on "change"', async () => {
    stubApi({
      'GET /api/event-types': () => json([workshop]),
      [slotsRoute]: () => json(workshopSlots),
    });
    await pickWorkshopAt0930();

    await userEvent.click(screen.getByRole('button', { name: 'change' }));

    expect(screen.getByText('2. Time')).toHaveAttribute('aria-current', 'step');
    expect(await screen.findByRole('list', { name: 'Start times' })).toBeInTheDocument();
  });

  it.each([
    ['a blank name', '   ', 'ada@example.com', 'Your name', 'Enter your name.'],
    ['a bad email', 'Ada', 'ada.example.com', 'Email', 'Enter a valid email address.'],
    [
      'an over-long email',
      'Ada',
      `${'x'.repeat(243)}@example.com`,
      'Email',
      'Email must be at most 254 characters.',
    ],
  ])(
    'shows %s under its field without sending anything',
    async (_case, name, email, label, message) => {
      const fetch = stubApi({
        'GET /api/event-types': () => json([workshop]),
        [slotsRoute]: () => json(workshopSlots),
      });
      await pickWorkshopAt0930();

      await fillAndBook(name, email);

      expect(screen.getByLabelText(label)).toHaveAccessibleDescription(message);
      expect(screen.getByLabelText(label)).toBeInvalid();
      expect(fetch).toHaveBeenCalledTimes(2);
    },
  );

  it("shows a server 400's details under their fields", async () => {
    stubApi({
      'GET /api/event-types': () => json([workshop]),
      [slotsRoute]: () => json(workshopSlots),
      'POST /api/bookings': () =>
        json(
          {
            code: 'VALIDATION_ERROR',
            message: 'request/body has invalid fields',
            details: [
              { path: '/guestName', message: 'must not be blank' },
              { path: '/guestEmail', message: 'must match format "email"' },
            ],
          },
          400,
        ),
    });
    await pickWorkshopAt0930();

    await fillAndBook();

    expect(await screen.findByText('must not be blank')).toBeInTheDocument();
    expect(screen.getByLabelText('Your name')).toHaveAccessibleDescription('must not be blank');
    expect(screen.getByLabelText('Email')).toHaveAccessibleDescription('must match format "email"');
  });

  /** How many requests `fetch` got for `"<METHOD> <path>"`. */
  function requestsTo(fetch: ReturnType<typeof stubApi>, key: string) {
    return fetch.mock.calls.filter(
      ([request]) => `${request.method} ${new URL(request.url).pathname}` === key,
    ).length;
  }

  it('offers "Pick another time" when the time was just taken, which refetches the free times', async () => {
    const fetch = stubApi({
      'GET /api/event-types': () => json([workshop]),
      [slotsRoute]: () => json(workshopSlots),
      'POST /api/bookings': () =>
        json({ code: 'SLOT_UNAVAILABLE', message: 'that time is not a free slot' }, 409),
    });
    await pickWorkshopAt0930();

    await fillAndBook();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Sorry, that time was just booked by someone else.');
    expect(screen.getByRole('button', { name: 'Book' })).toBeDisabled();
    await userEvent.click(within(alert).getByRole('button', { name: 'Pick another time' }));

    expect(screen.getByText('2. Time')).toHaveAttribute('aria-current', 'step');
    expect(await screen.findByRole('list', { name: 'Start times' })).toBeInTheDocument();
    expect(requestsTo(fetch, slotsRoute)).toBe(2);
  });

  it('offers "Choose another event type" when the event type is gone, which refetches the list', async () => {
    const fetch = stubApi({
      'GET /api/event-types': () => json([workshop]),
      [slotsRoute]: () => json(workshopSlots),
      'POST /api/bookings': () =>
        json({ code: 'EVENT_TYPE_NOT_FOUND', message: 'event type not found' }, 404),
    });
    await pickWorkshopAt0930();

    await fillAndBook();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('This event type is no longer available.');
    expect(screen.getByRole('button', { name: 'Book' })).toBeDisabled();
    await userEvent.click(within(alert).getByRole('button', { name: 'Choose another event type' }));

    expect(screen.getByText('1. Event type')).toHaveAttribute('aria-current', 'step');
    expect(await screen.findByRole('list', { name: 'Event types' })).toBeInTheDocument();
    expect(requestsTo(fetch, 'GET /api/event-types')).toBe(2);
  });

  it.each([
    ['a server error', () => json(serverError, 500)],
    [
      'a network error',
      () => {
        throw new TypeError('Failed to fetch');
      },
    ],
  ])('shows a generic error on %s and keeps the values', async (_case, respond) => {
    stubApi({
      'GET /api/event-types': () => json([workshop]),
      [slotsRoute]: () => json(workshopSlots),
      'POST /api/bookings': respond,
    });
    await pickWorkshopAt0930();

    await fillAndBook();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Something went wrong. Please try again.',
    );
    expect(screen.getByLabelText('Your name')).toHaveValue('Ada Lovelace');
    expect(screen.getByLabelText('Email')).toHaveValue('ada@example.com');
    expect(screen.getByRole('button', { name: 'Book' })).toBeEnabled();
  });
});
