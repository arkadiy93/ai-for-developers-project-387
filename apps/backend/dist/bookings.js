import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { eventTypeNotFound } from './event-types.js';
import { isUpcomingSlot } from './slots.js';
const MINUTE = 60_000;
const slotUnavailable = {
    status: 409,
    code: 'SLOT_UNAVAILABLE',
    message: 'that time is not a free slot',
};
export function bookingsRouter(store, now) {
    const router = Router();
    router.get('/bookings', (_req, res) => {
        res.json(store.listUpcomingBookings(now()));
    });
    router.post('/bookings', (req, res, next) => {
        const input = req.body;
        // The one rule the contract documents but TypeSpec can't express.
        if (input.guestName.trim() === '') {
            next({
                status: 400,
                message: 'request/body has invalid fields',
                errors: [{ path: '/guestName', message: 'must not be blank' }],
            });
            return;
        }
        const eventType = store.getEventType(input.eventTypeId);
        if (!eventType) {
            next(eventTypeNotFound);
            return;
        }
        const start = new Date(input.start);
        if (!isUpcomingSlot(eventType, start.toISOString(), now())) {
            next(slotUnavailable);
            return;
        }
        const booking = {
            id: randomUUID(),
            eventTypeId: eventType.id,
            eventTypeName: eventType.name,
            start: start.toISOString(),
            end: new Date(start.getTime() + eventType.durationMinutes * MINUTE).toISOString(),
            guestName: input.guestName.trim(),
            guestEmail: input.guestEmail.trim(),
        };
        if (!store.createBookingIfFree(booking)) {
            next(slotUnavailable);
            return;
        }
        res.status(201).json(booking);
    });
    return router;
}
