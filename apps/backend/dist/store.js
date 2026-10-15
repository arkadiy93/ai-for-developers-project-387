import { readFileSync } from 'node:fs';
const schema = readFileSync(new URL('./schema.sql', import.meta.url), 'utf8');
// The only module that runs SQL.
export function createStore(db) {
    db.exec(schema);
    const selectEventTypes = db.prepare(`SELECT id, name, description, duration_minutes AS durationMinutes
     FROM event_types ORDER BY name COLLATE NOCASE, id`);
    const selectEventType = db.prepare(`SELECT id, name, description, duration_minutes AS durationMinutes
     FROM event_types WHERE id = ?`);
    const selectBookedTimesEndingAfter = db.prepare(`SELECT start, end FROM bookings WHERE end > ? ORDER BY start`);
    const selectUpcomingBookings = db.prepare(`SELECT id, event_type_id AS eventTypeId, event_type_name AS eventTypeName, start, end,
       guest_name AS guestName, guest_email AS guestEmail
     FROM bookings WHERE end > ? ORDER BY start`);
    const insertEventType = db.prepare(`INSERT INTO event_types (id, name, description, duration_minutes)
     VALUES (:id, :name, :description, :durationMinutes)`);
    const updateEventType = db.prepare(`UPDATE event_types
     SET name = :name, description = :description, duration_minutes = :durationMinutes
     WHERE id = :id`);
    const deleteEventType = db.prepare(`DELETE FROM event_types WHERE id = ?`);
    const selectOverlappingBooking = db.prepare(`SELECT 1 FROM bookings WHERE start < :end AND end > :start LIMIT 1`);
    const insertBooking = db.prepare(`INSERT INTO bookings (id, event_type_id, event_type_name, start, end, guest_name, guest_email)
     VALUES (:id, :eventTypeId, :eventTypeName, :start, :end, :guestName, :guestEmail)`);
    return {
        listEventTypes() {
            return selectEventTypes.all();
        },
        getEventType(id) {
            return selectEventType.get(id);
        },
        saveEventType(eventType) {
            insertEventType.run(eventType);
        },
        /** False when there is no Event Type with that id. */
        updateEventType(eventType) {
            return updateEventType.run(eventType).changes > 0;
        },
        /** False when there is no Event Type with that id. Its Bookings remain (ADR 0004). */
        deleteEventType(id) {
            return deleteEventType.run(id).changes > 0;
        },
        /** The time taken by each Booking that hasn't ended by `after`, sorted by start. */
        listBookedTimesEndingAfter(after) {
            return selectBookedTimesEndingAfter.all(after.toISOString());
        },
        /** The Bookings that haven't ended by `now`, sorted by start. */
        listUpcomingBookings(now) {
            return selectUpcomingBookings.all(now.toISOString());
        },
        /**
         * Saves the Booking unless it overlaps a Booking of any Event Type, and returns whether it did.
         * The check and the insert run in one transaction.
         */
        createBookingIfFree(booking) {
            db.exec('BEGIN IMMEDIATE');
            try {
                const free = !selectOverlappingBooking.get({ start: booking.start, end: booking.end });
                if (free) {
                    insertBooking.run(booking);
                }
                db.exec('COMMIT');
                return free;
            }
            catch (err) {
                db.exec('ROLLBACK');
                throw err;
            }
        },
    };
}
