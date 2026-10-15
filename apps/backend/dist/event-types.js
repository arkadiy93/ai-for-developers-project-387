import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { computeSlots } from './slots.js';
// The rules the contract documents but TypeSpec can't express, so the validator doesn't check them.
function validate({ name, durationMinutes }) {
    const details = [];
    if (name.trim() === '') {
        details.push({ path: '/name', message: 'must not be blank' });
    }
    if (durationMinutes % 15 !== 0) {
        details.push({ path: '/durationMinutes', message: 'must be a multiple of 15' });
    }
    return details;
}
// The trimmed fields to save, or undefined after passing a 400 to `next`.
function parseInput(input, next) {
    const details = validate(input);
    if (details.length > 0) {
        next({
            status: 400,
            message: 'request/body has invalid fields',
            errors: details,
        });
        return undefined;
    }
    return {
        name: input.name.trim(),
        description: input.description.trim(),
        durationMinutes: input.durationMinutes,
    };
}
export const eventTypeNotFound = {
    status: 404,
    code: 'EVENT_TYPE_NOT_FOUND',
    message: 'event type not found',
};
export function eventTypesRouter(store, now) {
    const router = Router();
    router.get('/event-types', (_req, res) => {
        res.json(store.listEventTypes());
    });
    router.post('/event-types', (req, res, next) => {
        const fields = parseInput(req.body, next);
        if (!fields)
            return;
        const eventType = { id: randomUUID(), ...fields };
        store.saveEventType(eventType);
        res.status(201).json(eventType);
    });
    router.put('/event-types/:id', (req, res, next) => {
        const fields = parseInput(req.body, next);
        if (!fields)
            return;
        const eventType = { id: req.params.id, ...fields };
        if (!store.updateEventType(eventType)) {
            next(eventTypeNotFound);
            return;
        }
        res.json(eventType);
    });
    router.delete('/event-types/:id', (req, res, next) => {
        if (!store.deleteEventType(req.params.id)) {
            next(eventTypeNotFound);
            return;
        }
        res.status(204).end();
    });
    router.get('/event-types/:id/slots', (req, res, next) => {
        const eventType = store.getEventType(req.params.id);
        if (!eventType) {
            next(eventTypeNotFound);
            return;
        }
        const current = now();
        res.json(computeSlots(eventType, store.listBookedTimesEndingAfter(current), current));
    });
    return router;
}
