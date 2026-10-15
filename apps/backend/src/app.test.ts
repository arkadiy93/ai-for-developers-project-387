import { DatabaseSync } from 'node:sqlite';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from './app.js';

/** A well-formed id that no Event Type has. */
const unknownId = '2c1f6a8e-3b4d-4e5f-8a9b-0c1d2e3f4a5b';

function testApp() {
  return createApp({
    db: new DatabaseSync(':memory:'),
    now: () => new Date('2026-10-15T10:00:00.000Z'),
  });
}

describe('unknown /api route', () => {
  it('returns 404 NOT_FOUND for an undocumented path', async () => {
    const res = await request(testApp()).get('/api/unknown');

    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ code: 'NOT_FOUND', message: expect.any(String) });
  });
});

describe('malformed request', () => {
  it('answers a too-large body with a 400 VALIDATION_ERROR, not a server error', async () => {
    const res = await request(testApp())
      .post('/api/unknown')
      .send({ padding: 'x'.repeat(200_000) });

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ code: 'VALIDATION_ERROR' });
  });
});

describe('event types', () => {
  const intro = { name: 'Intro call', description: 'A quick hello.', durationMinutes: 15 };
  const deepDive = { name: 'Deep dive', description: '', durationMinutes: 90 };

  it('starts empty', async () => {
    const res = await request(testApp()).get('/api/event-types');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('creates event types and lists them sorted by name', async () => {
    const app = testApp();

    const created = await request(app).post('/api/event-types').send(intro);
    await request(app).post('/api/event-types').send(deepDive).expect(201);
    const res = await request(app).get('/api/event-types');

    expect(created.status).toBe(201);
    expect(created.body).toEqual({ id: expect.any(String), ...intro });
    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      { id: expect.any(String), ...deepDive },
      { id: created.body.id, ...intro },
    ]);
  });

  it.each([
    ['a whitespace-only name', { name: '   ' }, '/name'],
    ['a duration that is not a multiple of 15', { durationMinutes: 20 }, '/durationMinutes'],
    ['a duration of 0', { durationMinutes: 0 }, '/durationMinutes'],
    ['a duration over 9 hours', { durationMinutes: 555 }, '/durationMinutes'],
    ['an over-long description', { description: 'x'.repeat(501) }, '/description'],
  ])('rejects %s with a 400 on that field', async (_case, override, path) => {
    const app = testApp();

    const res = await request(app)
      .post('/api/event-types')
      .send({ ...intro, ...override });

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({
      code: 'VALIDATION_ERROR',
      details: [{ path, message: expect.any(String) }],
    });
    expect((await request(app).get('/api/event-types')).body).toEqual([]);
  });

  it('trims surrounding whitespace before saving', async () => {
    const app = testApp();

    const created = await request(app)
      .post('/api/event-types')
      .send({ ...intro, name: '  Intro call ', description: ' A quick hello.\n' });
    const res = await request(app).get('/api/event-types');

    expect(created.body).toMatchObject({ name: 'Intro call', description: 'A quick hello.' });
    expect(res.body).toEqual([created.body]);
  });

  it('returns 405 METHOD_NOT_ALLOWED for an undocumented method', async () => {
    const res = await request(testApp()).patch('/api/event-types').send(intro);

    expect(res.status).toBe(405);
    expect(res.body).toMatchObject({ code: 'METHOD_NOT_ALLOWED', message: expect.any(String) });
  });
});

describe('updating an event type', () => {
  const intro = { name: 'Intro call', description: 'A quick hello.', durationMinutes: 15 };
  const workshop = { name: 'Workshop', description: '', durationMinutes: 60 };

  it('replaces the fields, keeps the id, and the list reflects it in name order', async () => {
    const app = testApp();
    const { body: created } = await request(app).post('/api/event-types').send(intro).expect(201);
    await request(app).post('/api/event-types').send(workshop).expect(201);

    const res = await request(app)
      .put(`/api/event-types/${created.id}`)
      .send({ name: ' Zoom chat ', description: ' Longer. ', durationMinutes: 45 });
    const list = await request(app).get('/api/event-types');

    const updated = {
      id: created.id,
      name: 'Zoom chat',
      description: 'Longer.',
      durationMinutes: 45,
    };
    expect(res.status).toBe(200);
    expect(res.body).toEqual(updated);
    expect(list.body).toEqual([{ id: expect.any(String), ...workshop }, updated]);
  });

  it.each([
    ['a whitespace-only name', { name: '   ' }, '/name'],
    ['a duration that is not a multiple of 15', { durationMinutes: 20 }, '/durationMinutes'],
    ['an over-long description', { description: 'x'.repeat(501) }, '/description'],
  ])('rejects %s with a 400 on that field and changes nothing', async (_case, override, path) => {
    const app = testApp();
    const { body: created } = await request(app).post('/api/event-types').send(intro).expect(201);

    const res = await request(app)
      .put(`/api/event-types/${created.id}`)
      .send({ ...intro, ...override });

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({
      code: 'VALIDATION_ERROR',
      details: [{ path, message: expect.any(String) }],
    });
    expect((await request(app).get('/api/event-types')).body).toEqual([created]);
  });

  it('returns 404 EVENT_TYPE_NOT_FOUND for an unknown id', async () => {
    const res = await request(testApp()).put(`/api/event-types/${unknownId}`).send(intro);

    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ code: 'EVENT_TYPE_NOT_FOUND', message: expect.any(String) });
  });
});

describe('deleting an event type', () => {
  const intro = { name: 'Intro call', description: 'A quick hello.', durationMinutes: 15 };

  it('removes it from the list', async () => {
    const app = testApp();
    const { body: created } = await request(app).post('/api/event-types').send(intro).expect(201);

    const res = await request(app).delete(`/api/event-types/${created.id}`);

    expect(res.status).toBe(204);
    expect((await request(app).get('/api/event-types')).body).toEqual([]);
  });

  it('returns 404 EVENT_TYPE_NOT_FOUND for an unknown id', async () => {
    const res = await request(testApp()).delete(`/api/event-types/${unknownId}`);

    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ code: 'EVENT_TYPE_NOT_FOUND', message: expect.any(String) });
  });

  it('returns 404 for a second delete', async () => {
    const app = testApp();
    const { body: created } = await request(app).post('/api/event-types').send(intro).expect(201);
    await request(app).delete(`/api/event-types/${created.id}`).expect(204);

    const res = await request(app).delete(`/api/event-types/${created.id}`);

    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ code: 'EVENT_TYPE_NOT_FOUND' });
  });
});

describe('slots', () => {
  const workshop = { name: 'Workshop', description: '', durationMinutes: 60 };

  async function createWorkshop(app: ReturnType<typeof testApp>) {
    const res = await request(app).post('/api/event-types').send(workshop).expect(201);
    return res.body.id as string;
  }

  it('returns the 14 days of the Booking Window in order, each with its starts in order', async () => {
    const app = testApp();
    const id = await createWorkshop(app);

    const res = await request(app).get(`/api/event-types/${id}/slots`);

    expect(res.status).toBe(200);
    expect(res.body.days.map((d: { date: string }) => d.date)).toEqual([
      '2026-10-15',
      '2026-10-16',
      '2026-10-17',
      '2026-10-18',
      '2026-10-19',
      '2026-10-20',
      '2026-10-21',
      '2026-10-22',
      '2026-10-23',
      '2026-10-24',
      '2026-10-25',
      '2026-10-26',
      '2026-10-27',
      '2026-10-28',
    ]);
    const tomorrow = res.body.days[1].starts;
    expect(tomorrow).toHaveLength(33);
    expect(tomorrow[0]).toEqual({ start: '2026-10-16T09:00:00.000Z', available: true });
    expect(tomorrow[1]).toEqual({ start: '2026-10-16T09:15:00.000Z', available: true });
    expect(tomorrow.at(-1)).toEqual({ start: '2026-10-16T17:00:00.000Z', available: true });
  });

  it('marks the starts already past today unavailable, using the injected clock', async () => {
    const app = testApp();
    const id = await createWorkshop(app);

    const res = await request(app).get(`/api/event-types/${id}/slots`);

    const today = res.body.days[0].starts;
    expect(today.slice(3, 6)).toEqual([
      { start: '2026-10-15T09:45:00.000Z', available: false },
      { start: '2026-10-15T10:00:00.000Z', available: false },
      { start: '2026-10-15T10:15:00.000Z', available: true },
    ]);
  });

  it('returns 404 EVENT_TYPE_NOT_FOUND for an unknown id', async () => {
    const res = await request(testApp()).get(`/api/event-types/${unknownId}/slots`);

    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ code: 'EVENT_TYPE_NOT_FOUND', message: expect.any(String) });
  });
});

const workshop = { name: 'Workshop', description: '', durationMinutes: 60 };
const guest = { guestName: 'Ada Lovelace', guestEmail: 'ada@example.com' };

async function createEventType(app: ReturnType<typeof createApp>, fields = workshop) {
  const res = await request(app).post('/api/event-types').send(fields).expect(201);
  return res.body.id as string;
}

async function book(app: ReturnType<typeof createApp>, eventTypeId: string, start: string) {
  const res = await request(app)
    .post('/api/bookings')
    .send({ eventTypeId, start, ...guest })
    .expect(201);
  return res.body as { id: string };
}

describe('booking a call', () => {
  it('returns 201 with the Booking, its Event Type name and end fixed at booking time', async () => {
    const app = testApp();
    const eventTypeId = await createEventType(app);

    const res = await request(app)
      .post('/api/bookings')
      .send({ eventTypeId, start: '2026-10-16T09:30:00.000Z', ...guest });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      id: expect.any(String),
      eventTypeId,
      eventTypeName: 'Workshop',
      start: '2026-10-16T09:30:00.000Z',
      end: '2026-10-16T10:30:00.000Z',
      ...guest,
    });
  });

  it('marks the booked time unavailable in the slots', async () => {
    const app = testApp();
    const eventTypeId = await createEventType(app);
    await request(app)
      .post('/api/bookings')
      .send({ eventTypeId, start: '2026-10-16T09:30:00.000Z', ...guest })
      .expect(201);

    const res = await request(app).get(`/api/event-types/${eventTypeId}/slots`);

    expect(res.body.days[1].starts.slice(0, 7)).toEqual([
      { start: '2026-10-16T09:00:00.000Z', available: false },
      { start: '2026-10-16T09:15:00.000Z', available: false },
      { start: '2026-10-16T09:30:00.000Z', available: false },
      { start: '2026-10-16T09:45:00.000Z', available: false },
      { start: '2026-10-16T10:00:00.000Z', available: false },
      { start: '2026-10-16T10:15:00.000Z', available: false },
      { start: '2026-10-16T10:30:00.000Z', available: true },
    ]);
  });

  it.each([
    ['the same Event Type at the same start', workshop, '2026-10-16T09:30:00.000Z'],
    [
      'a different Event Type overlapping it',
      { ...workshop, name: 'Intro', durationMinutes: 15 },
      '2026-10-16T10:15:00.000Z',
    ],
  ])('returns 409 SLOT_UNAVAILABLE for a time taken by %s', async (_case, fields, start) => {
    const app = testApp();
    const first = await createEventType(app);
    const second = await createEventType(app, fields);
    await request(app)
      .post('/api/bookings')
      .send({ eventTypeId: first, start: '2026-10-16T09:30:00.000Z', ...guest })
      .expect(201);

    const res = await request(app)
      .post('/api/bookings')
      .send({ eventTypeId: second, start, guestName: 'Bob', guestEmail: 'bob@example.com' });

    expect(res.status).toBe(409);
    expect(res.body).toMatchObject({ code: 'SLOT_UNAVAILABLE', message: expect.any(String) });
  });

  it.each([
    ['past', '2026-10-15T09:30:00.000Z'],
    ['starting right now', '2026-10-15T10:00:00.000Z'],
    ['after the Booking Window', '2026-10-29T09:00:00.000Z'],
    ['before the Booking Window', '2026-10-14T12:00:00.000Z'],
    ['off the quarter hour', '2026-10-16T09:10:00.000Z'],
    ['off the quarter hour by seconds', '2026-10-16T09:30:30.000Z'],
    ['before Working Hours', '2026-10-16T08:45:00.000Z'],
    ['ending after Working Hours', '2026-10-16T17:15:00.000Z'],
  ])('returns 409 SLOT_UNAVAILABLE for a start %s', async (_case, start) => {
    const app = testApp();
    const eventTypeId = await createEventType(app);

    const res = await request(app)
      .post('/api/bookings')
      .send({ eventTypeId, start, ...guest });

    expect(res.status).toBe(409);
    expect(res.body).toMatchObject({ code: 'SLOT_UNAVAILABLE' });
  });

  it('accepts a start written without milliseconds', async () => {
    const app = testApp();
    const eventTypeId = await createEventType(app);

    const res = await request(app)
      .post('/api/bookings')
      .send({ eventTypeId, start: '2026-10-16T09:30:00Z', ...guest });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ start: '2026-10-16T09:30:00.000Z' });
  });

  it.each([
    ['a whitespace-only name', { guestName: '   ' }, '/guestName'],
    ['an over-long name', { guestName: 'x'.repeat(101) }, '/guestName'],
    ['a bad email', { guestEmail: 'ada.example.com' }, '/guestEmail'],
    ['an over-long email', { guestEmail: `${'x'.repeat(243)}@example.com` }, '/guestEmail'],
  ])('rejects %s with a 400 on that field and books nothing', async (_case, override, path) => {
    const app = testApp();
    const eventTypeId = await createEventType(app);
    const start = '2026-10-16T09:30:00.000Z';

    const res = await request(app)
      .post('/api/bookings')
      .send({ eventTypeId, start, ...guest, ...override });

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({
      code: 'VALIDATION_ERROR',
      details: [{ path, message: expect.any(String) }],
    });
    await request(app)
      .post('/api/bookings')
      .send({ eventTypeId, start, ...guest })
      .expect(201);
  });

  it('trims the name before saving', async () => {
    const app = testApp();
    const eventTypeId = await createEventType(app);

    const res = await request(app)
      .post('/api/bookings')
      .send({ eventTypeId, start: '2026-10-16T09:30:00.000Z', ...guest, guestName: '  Ada \n' });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ guestName: 'Ada', guestEmail: 'ada@example.com' });
  });

  it('returns 409 SLOT_UNAVAILABLE for a start that no longer fits after a duration change', async () => {
    const app = testApp();
    const eventTypeId = await createEventType(app);
    const isFree = async (start: string) => {
      const res = await request(app).get(`/api/event-types/${eventTypeId}/slots`);
      return res.body.days[1].starts.some(
        (slot: { start: string; available: boolean }) => slot.start === start && slot.available,
      );
    };
    expect(await isFree('2026-10-16T17:00:00.000Z')).toBe(true);

    await request(app)
      .put(`/api/event-types/${eventTypeId}`)
      .send({ ...workshop, durationMinutes: 120 })
      .expect(200);
    const res = await request(app)
      .post('/api/bookings')
      .send({ eventTypeId, start: '2026-10-16T17:00:00.000Z', ...guest });

    expect(await isFree('2026-10-16T17:00:00.000Z')).toBe(false);
    expect(res.status).toBe(409);
    expect(res.body).toMatchObject({ code: 'SLOT_UNAVAILABLE' });
  });

  it('returns 404 EVENT_TYPE_NOT_FOUND for an unknown Event Type, deleted, never created or malformed', async () => {
    const app = testApp();
    const deleted = await createEventType(app);
    await request(app).delete(`/api/event-types/${deleted}`).expect(204);

    const responses = await Promise.all(
      [deleted, unknownId, 'not-a-uuid'].map((eventTypeId) =>
        request(app)
          .post('/api/bookings')
          .send({ eventTypeId, start: '2026-10-16T09:30:00.000Z', ...guest }),
      ),
    );

    for (const res of responses) {
      expect(res.status).toBe(404);
      expect(res.body).toMatchObject({ code: 'EVENT_TYPE_NOT_FOUND', message: expect.any(String) });
    }
  });
});

describe('listing upcoming bookings', () => {
  it('lists only Bookings that have not ended, an in-progress one included, sorted by start', async () => {
    let now = new Date('2026-10-15T09:00:00.000Z');
    const app = createApp({ db: new DatabaseSync(':memory:'), now: () => now });
    const eventTypeId = await createEventType(app);
    const tomorrow = await book(app, eventTypeId, '2026-10-16T09:00:00.000Z');
    const afternoon = await book(app, eventTypeId, '2026-10-15T14:00:00.000Z');
    await book(app, eventTypeId, '2026-10-15T09:15:00.000Z');
    const inProgress = await book(app, eventTypeId, '2026-10-15T11:30:00.000Z');
    await book(app, eventTypeId, '2026-10-15T10:30:00.000Z');

    // The 10:30 call ends exactly now, so it has ended; the 11:30 one is in progress.
    now = new Date('2026-10-15T11:30:00.000Z');
    const res = await request(app).get('/api/bookings');

    expect(res.status).toBe(200);
    expect(res.body.map((b: { id: string }) => b.id)).toEqual([
      inProgress.id,
      afternoon.id,
      tomorrow.id,
    ]);
    expect(res.body[0]).toEqual({
      id: inProgress.id,
      eventTypeId,
      eventTypeName: 'Workshop',
      start: '2026-10-15T11:30:00.000Z',
      end: '2026-10-15T12:30:00.000Z',
      ...guest,
    });
  });

  it('keeps the old name and end after the Event Type is renamed and its duration changed', async () => {
    const app = testApp();
    const eventTypeId = await createEventType(app);
    await book(app, eventTypeId, '2026-10-16T09:00:00.000Z');

    await request(app)
      .put(`/api/event-types/${eventTypeId}`)
      .send({ name: 'Masterclass', description: '', durationMinutes: 120 })
      .expect(200);
    const res = await request(app).get('/api/bookings');

    expect(res.body).toEqual([
      expect.objectContaining({
        eventTypeName: 'Workshop',
        start: '2026-10-16T09:00:00.000Z',
        end: '2026-10-16T10:00:00.000Z',
      }),
    ]);
  });

  it('still lists a Booking of a deleted Event Type, and its time stays taken for others', async () => {
    const app = testApp();
    const deleted = await createEventType(app);
    const other = await createEventType(app, { ...workshop, name: 'Intro', durationMinutes: 15 });
    await book(app, deleted, '2026-10-16T09:00:00.000Z');

    await request(app).delete(`/api/event-types/${deleted}`).expect(204);
    const list = await request(app).get('/api/bookings');
    const slots = await request(app).get(`/api/event-types/${other}/slots`);
    const rebook = await request(app)
      .post('/api/bookings')
      .send({ eventTypeId: other, start: '2026-10-16T09:30:00.000Z', ...guest });

    expect(list.body).toEqual([
      expect.objectContaining({ eventTypeId: deleted, eventTypeName: 'Workshop' }),
    ]);
    expect(slots.body.days[1].starts.slice(0, 5)).toEqual([
      { start: '2026-10-16T09:00:00.000Z', available: false },
      { start: '2026-10-16T09:15:00.000Z', available: false },
      { start: '2026-10-16T09:30:00.000Z', available: false },
      { start: '2026-10-16T09:45:00.000Z', available: false },
      { start: '2026-10-16T10:00:00.000Z', available: true },
    ]);
    expect(rebook.status).toBe(409);
    expect(rebook.body).toMatchObject({ code: 'SLOT_UNAVAILABLE' });
  });
});
