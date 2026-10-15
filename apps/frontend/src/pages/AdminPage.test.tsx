import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { ApiError, EventType } from '@/lib/api';
import { deepDive, intro, json, pending, serverError, stubApi, workshop } from '@/test/api';
import { renderAt } from '@/test/render';

/** Stubs the Event Type routes, plus an empty Bookings list so the main column stays quiet. */
function stubAdminApi(routes: Parameters<typeof stubApi>[0]) {
  return stubApi({ 'GET /api/bookings': () => json([]), ...routes });
}

async function findPanel() {
  return screen.findByRole('region', { name: 'Event types' });
}

describe('admin event types panel', () => {
  it('shows a card with the name and duration of each event type', async () => {
    stubAdminApi({ 'GET /api/event-types': () => json([deepDive, intro]) });
    renderAt('/admin');

    const list = within(await findPanel()).getByRole('list');
    const items = within(list).getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent('Deep dive');
    expect(items[0]).toHaveTextContent('1 h 30 min');
    expect(items[1]).toHaveTextContent('Intro call');
    expect(items[1]).toHaveTextContent('15 min');
  });

  it('explains what an empty list means for Guests', async () => {
    stubAdminApi({ 'GET /api/event-types': () => json([]) });
    renderAt('/admin');

    expect(
      await within(await findPanel()).findByText('None yet. Guests see an empty booking page.'),
    ).toBeInTheDocument();
  });

  it('shows placeholders while the event types load', async () => {
    stubAdminApi({ 'GET /api/event-types': pending });
    renderAt('/admin');

    expect(
      within(await findPanel()).getByRole('status', { name: 'Loading event types' }),
    ).toBeInTheDocument();
  });

  it('shows an error with Retry when loading fails, and loads again on Retry', async () => {
    let fail = true;
    stubAdminApi({
      'GET /api/event-types': () => (fail ? json(serverError, 500) : json([intro])),
    });
    renderAt('/admin');

    const alert = await within(await findPanel()).findByRole('alert');
    expect(alert).toHaveTextContent("Couldn't load event types.");
    fail = false;
    await userEvent.click(within(alert).getByRole('button', { name: 'Retry' }));

    expect(await screen.findByText('Intro call')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

describe('admin: creating an event type', () => {
  it('creates an event type from the inline form and shows it in name order', async () => {
    let eventTypes: EventType[] = [deepDive, workshop];
    let posted: unknown;
    stubAdminApi({
      'GET /api/event-types': () => json(eventTypes),
      'POST /api/event-types': async (request) => {
        posted = await request.json();
        eventTypes = [deepDive, intro, workshop];
        return json(intro, 201);
      },
    });
    renderAt('/admin');
    const panel = await findPanel();

    await userEvent.click(await within(panel).findByRole('button', { name: '+ New event type' }));
    await userEvent.type(within(panel).getByLabelText('Name'), 'Intro call');
    await userEvent.type(within(panel).getByLabelText('Description'), 'A quick hello.');
    await userEvent.selectOptions(within(panel).getByLabelText('Duration'), '15 min');
    await userEvent.click(within(panel).getByRole('button', { name: 'Create' }));

    expect(posted).toEqual({
      name: 'Intro call',
      description: 'A quick hello.',
      durationMinutes: 15,
    });
    expect(await within(panel).findByText('Intro call')).toBeInTheDocument();
    expect(within(panel).queryByLabelText('Name')).not.toBeInTheDocument();
    const items = within(within(panel).getByRole('list')).getAllByRole('listitem');
    expect(items.map((item) => item.textContent)).toEqual([
      expect.stringContaining('Deep dive'),
      expect.stringContaining('Intro call'),
      expect.stringContaining('Workshop'),
    ]);
  });

  it('offers durations from 15 min to 9 h in steps of 15', async () => {
    stubAdminApi({ 'GET /api/event-types': () => json([]) });
    renderAt('/admin');
    const panel = await findPanel();

    await userEvent.click(await within(panel).findByRole('button', { name: '+ New event type' }));

    const options = within(within(panel).getByLabelText('Duration')).getAllByRole('option');
    expect(options).toHaveLength(36);
    expect(options[0]).toHaveTextContent('15 min');
    expect(options[3]).toHaveTextContent('1 h');
    expect(options[5]).toHaveTextContent('1 h 30 min');
    expect(options[35]).toHaveTextContent('9 h');
  });

  it('shows each server validation message under its field', async () => {
    const error: ApiError = {
      code: 'VALIDATION_ERROR',
      message: 'request/body has invalid fields',
      details: [
        { path: '/name', message: 'must not be blank' },
        { path: '/description', message: 'must NOT have more than 500 characters' },
      ],
    };
    stubAdminApi({
      'GET /api/event-types': () => json([]),
      'POST /api/event-types': () => json(error, 400),
    });
    renderAt('/admin');
    const panel = await findPanel();

    await userEvent.click(await within(panel).findByRole('button', { name: '+ New event type' }));
    await userEvent.type(within(panel).getByLabelText('Name'), '   ');
    await userEvent.click(within(panel).getByRole('button', { name: 'Create' }));

    expect(await within(panel).findByText('must not be blank')).toBeInTheDocument();
    expect(within(panel).getByLabelText('Name')).toHaveAccessibleDescription('must not be blank');
    expect(within(panel).getByLabelText('Description')).toHaveAccessibleDescription(
      'must NOT have more than 500 characters',
    );
    expect(within(panel).getByLabelText('Duration')).not.toHaveAttribute('aria-invalid');
  });

  it('collapses the form on Cancel without creating anything', async () => {
    const fetch = stubAdminApi({ 'GET /api/event-types': () => json([]) });
    renderAt('/admin');
    const panel = await findPanel();

    await userEvent.click(await within(panel).findByRole('button', { name: '+ New event type' }));
    await userEvent.type(within(panel).getByLabelText('Name'), 'Intro call');
    await userEvent.click(within(panel).getByRole('button', { name: 'Cancel' }));

    expect(within(panel).queryByLabelText('Name')).not.toBeInTheDocument();
    expect(within(panel).getByRole('button', { name: '+ New event type' })).toBeInTheDocument();
    expect(fetch.mock.calls.every(([request]) => request.method === 'GET')).toBe(true);
  });

  it('keeps the form open with a message when creating fails for another reason', async () => {
    stubAdminApi({
      'GET /api/event-types': () => json([]),
      'POST /api/event-types': () => json(serverError, 500),
    });
    renderAt('/admin');
    const panel = await findPanel();

    await userEvent.click(await within(panel).findByRole('button', { name: '+ New event type' }));
    await userEvent.type(within(panel).getByLabelText('Name'), 'Intro call');
    await userEvent.click(within(panel).getByRole('button', { name: 'Create' }));

    expect(await within(panel).findByRole('alert')).toHaveTextContent(
      "Couldn't create the event type. Please try again.",
    );
    expect(within(panel).getByLabelText('Name')).toHaveValue('Intro call');
  });
});

describe('admin: editing an event type', () => {
  it('expands a card into the prefilled form, saves, and shows the new values in name order', async () => {
    let eventTypes: EventType[] = [deepDive, intro, workshop];
    let put: { url: string; body: unknown } | undefined;
    const renamed: EventType = { ...intro, name: 'Zoom chat', durationMinutes: 45 };
    stubAdminApi({
      'GET /api/event-types': () => json(eventTypes),
      [`PUT /api/event-types/${intro.id}`]: async (request) => {
        put = { url: request.url, body: await request.json() };
        eventTypes = [deepDive, workshop, renamed];
        return json(renamed);
      },
    });
    renderAt('/admin');
    const panel = await findPanel();

    await userEvent.click(await within(panel).findByRole('button', { name: /Intro call/ }));
    const form = within(panel).getByRole('form', { name: 'Edit Intro call' });
    expect(within(form).getByLabelText('Name')).toHaveValue('Intro call');
    expect(within(form).getByLabelText('Description')).toHaveValue('A quick hello.');
    expect(within(form).getByLabelText('Duration')).toHaveDisplayValue('15 min');
    expect(form).toHaveTextContent(
      'Changes apply to new bookings only. Calls already booked keep their time and name.',
    );
    await userEvent.clear(within(form).getByLabelText('Name'));
    await userEvent.type(within(form).getByLabelText('Name'), 'Zoom chat');
    await userEvent.selectOptions(within(form).getByLabelText('Duration'), '45 min');
    await userEvent.click(within(form).getByRole('button', { name: 'Save' }));

    expect(put?.body).toEqual({
      name: 'Zoom chat',
      description: 'A quick hello.',
      durationMinutes: 45,
    });
    expect(await within(panel).findByText('Zoom chat')).toBeInTheDocument();
    expect(within(panel).queryByRole('form')).not.toBeInTheDocument();
    const items = within(within(panel).getByRole('list')).getAllByRole('listitem');
    expect(items.map((item) => item.textContent)).toEqual([
      expect.stringContaining('Deep dive'),
      expect.stringContaining('Workshop'),
      expect.stringContaining('Zoom chat45 min'),
    ]);
  });

  it('shows server validation messages under their fields and keeps the card open', async () => {
    const error: ApiError = {
      code: 'VALIDATION_ERROR',
      message: 'request/body has invalid fields',
      details: [{ path: '/name', message: 'must not be blank' }],
    };
    stubAdminApi({
      'GET /api/event-types': () => json([intro]),
      [`PUT /api/event-types/${intro.id}`]: () => json(error, 400),
    });
    renderAt('/admin');
    const panel = await findPanel();

    await userEvent.click(await within(panel).findByRole('button', { name: /Intro call/ }));
    const form = within(panel).getByRole('form', { name: 'Edit Intro call' });
    await userEvent.clear(within(form).getByLabelText('Name'));
    await userEvent.type(within(form).getByLabelText('Name'), '   ');
    await userEvent.click(within(form).getByRole('button', { name: 'Save' }));

    expect(await within(form).findByText('must not be blank')).toBeInTheDocument();
    expect(within(form).getByLabelText('Name')).toHaveAccessibleDescription('must not be blank');
    expect(within(form).getByLabelText('Duration')).not.toHaveAttribute('aria-invalid');
  });

  it('collapses the card and refetches the list when the event type was deleted elsewhere', async () => {
    let eventTypes: EventType[] = [deepDive, intro];
    const notFound: ApiError = { code: 'EVENT_TYPE_NOT_FOUND', message: 'event type not found' };
    stubAdminApi({
      'GET /api/event-types': () => json(eventTypes),
      [`PUT /api/event-types/${intro.id}`]: () => {
        eventTypes = [deepDive];
        return json(notFound, 404);
      },
    });
    renderAt('/admin');
    const panel = await findPanel();

    await userEvent.click(await within(panel).findByRole('button', { name: /Intro call/ }));
    await userEvent.click(within(panel).getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(within(panel).queryByText('Intro call')).not.toBeInTheDocument());
    expect(within(panel).queryByRole('form')).not.toBeInTheDocument();
    expect(within(panel).getByText('Deep dive')).toBeInTheDocument();
  });
});

describe('admin: deleting an event type', () => {
  async function openDeleteDialog() {
    const panel = await findPanel();
    await userEvent.click(await within(panel).findByRole('button', { name: /Intro call/ }));
    await userEvent.click(within(panel).getByRole('button', { name: 'Delete this event type' }));
    return { panel, dialog: await screen.findByRole('alertdialog') };
  }

  it('asks for confirmation, and Cancel closes the dialog without deleting', async () => {
    const fetch = stubAdminApi({ 'GET /api/event-types': () => json([intro]) });
    renderAt('/admin');

    const { panel, dialog } = await openDeleteDialog();
    expect(dialog).toHaveAccessibleName('Delete Intro call?');
    expect(dialog).toHaveAccessibleDescription(
      "Guests won't be able to book it anymore. Existing Bookings stay.",
    );
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(within(panel).getByRole('form', { name: 'Edit Intro call' })).toBeInTheDocument();
    expect(fetch.mock.calls.every(([request]) => request.method === 'GET')).toBe(true);
  });

  it.each([
    ['deletes it', () => new Response(null, { status: 204 })],
    [
      'treats a 404 as already deleted',
      () => json({ code: 'EVENT_TYPE_NOT_FOUND', message: 'event type not found' }, 404),
    ],
  ])('%s and the card disappears', async (_case, respond) => {
    let eventTypes: EventType[] = [deepDive, intro];
    stubAdminApi({
      'GET /api/event-types': () => json(eventTypes),
      [`DELETE /api/event-types/${intro.id}`]: () => {
        eventTypes = [deepDive];
        return respond();
      },
    });
    renderAt('/admin');

    const { panel, dialog } = await openDeleteDialog();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(within(panel).queryByText('Intro call')).not.toBeInTheDocument());
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(within(panel).queryByRole('form')).not.toBeInTheDocument();
    expect(within(panel).getByText('Deep dive')).toBeInTheDocument();
  });

  it('keeps the dialog open with a message when deleting fails for another reason', async () => {
    stubAdminApi({
      'GET /api/event-types': () => json([intro]),
      [`DELETE /api/event-types/${intro.id}`]: () => json(serverError, 500),
    });
    renderAt('/admin');

    const { dialog } = await openDeleteDialog();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      "Couldn't delete the event type. Please try again.",
    );
  });
});
