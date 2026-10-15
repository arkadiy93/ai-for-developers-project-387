# 4. Bookings snapshot their Event Type, and Event Types are hard-deleted

Date: 2026-10-15

## Status

Accepted

## Context

A Booking is final: nobody cancels or moves it. The Owner can still edit an Event Type's name, description and duration, or delete the Event Type, while it has upcoming Bookings. If a Booking only referenced its Event Type and computed its end from the current duration, a duration change would silently move the end of existing calls and could make them overlap. A rename would also change what the Owner sees for calls already booked. The alternatives were to forbid edits and deletes while upcoming Bookings exist, or to add an archived state for Event Types.

## Decision

A Booking stores its own copy of what it needs: the Event Type id, the Event Type's name at booking time, and its own start and end. The overlap check and the upcoming Bookings list read only these fields. Editing an Event Type affects only future Slots. Deleting an Event Type is a hard delete, allowed at any time. Its Bookings remain and keep holding their time. The Admin area asks for confirmation before deleting and does not mark renamed or deleted Event Types on Bookings.

## Consequences

Edits and deletes need no rules about existing Bookings, and Bookings never change after they are made. A Booking's Event Type id may point at an Event Type that no longer exists, so storage cannot enforce it as a cascading or restricting foreign key. A Guest who books just after a delete or a duration change gets an error, not a silently different call.
