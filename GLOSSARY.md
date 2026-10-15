# Календарь звонков

A call-booking service: the Owner sets up Event Types, and Guests book a call of one of those types at a free time.

## Language

### People

**Owner**:
The single person whose time is booked. There is exactly one, and they have no account.
_Avoid_: Host, admin, user, calendar owner

**Guest**:
An anonymous person who books a call with the Owner by giving their name and email.
_Avoid_: Client, visitor, attendee, invitee, user

**Admin area**:
The part of the app where the Owner manages Event Types and sees upcoming Bookings. "Admin" names this area, never the Owner.
_Avoid_: Dashboard, owner page

### Booking

**Event Type**:
A kind of call the Owner offers, with an id, a name, a description and a duration that is a multiple of 15 minutes.
_Avoid_: Event, meeting type, service, call type

**Working Hours**:
The fixed daily time, 09:00 to 18:00 UTC, when the Owner takes calls. All times in the app are in UTC.
_Avoid_: Availability, open hours, schedule, business hours

**Booking Window**:
The 14 days, starting today in UTC, in which a Guest can book.
_Avoid_: Booking horizon, range, period

**Slot**:
A possible start time for one Event Type: on the quarter hour, inside the Booking Window, and with the whole call inside Working Hours. A Slot is **free** when it hasn't started yet and its whole call is clear of every Booking. Otherwise it is taken.
_Avoid_: Time slot, opening

**Booking**:
A Guest's call of one Event Type at a free Slot. No two Bookings overlap, whatever their Event Types. A Booking is final: nobody cancels or moves it. It keeps the Event Type's name and its own start and end as they were when booked, so later changes to the Event Type never touch it.
_Avoid_: Appointment, meeting, reservation, event
