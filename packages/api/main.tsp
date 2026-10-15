import "@typespec/http";

using Http;

/** Call Calendar API. Every route lives under `/api`. */
@service(#{ title: "Call Calendar API" })
@server("/api", "Call Calendar API")
namespace CallCalendar;

/** A field that failed validation. */
model ErrorDetail {
  /** JSON pointer to the field, for example `/durationMinutes`. */
  path: string;

  message: string;
}

/** The body of every 4xx and 5xx response. */
@error
model Error {
  /** A stable machine-readable code, for example `VALIDATION_ERROR` or `NOT_FOUND`. */
  code: string;

  message: string;
  details?: ErrorDetail[];
}

/** The fields of an Event Type that the Owner sets. */
model EventTypeInput {
  /** Must contain a non-space character. The server trims it before saving. */
  @minLength(1)
  @maxLength(100)
  name: string;

  /** May be empty. The server trims it before saving. */
  @maxLength(500)
  description: string;

  /** The length of the call. Must be a multiple of 15. */
  @minValue(15)
  @maxValue(540)
  durationMinutes: int32;
}

/** A kind of call the Owner offers. */
model EventType {
  /** Server-generated. */
  @format("uuid")
  id: string;

  ...EventTypeInput;
}

/** One possible start time for an Event Type. */
model SlotStart {
  /** Serialised exactly like `Date#toISOString()`. */
  start: utcDateTime;

  /** False when the start is past or the call would overlap a Booking. */
  available: boolean;
}

/** One day of the Booking Window, with every quarter-hour start whose call ends by 18:00 UTC. */
model SlotDay {
  date: plainDate;
  starts: SlotStart[];
}

/** The 14 days of the Booking Window, starting today in UTC. */
model Slots {
  days: SlotDay[];
}

@route("/event-types")
@tag("Event Types")
namespace EventTypes {
  /** Every Event Type, sorted by name. */
  @get
  op list(): EventType[];

  /** Creates an Event Type. A blank name or a duration that isn't a multiple of 15 is a 400. */
  @post
  op create(@body body: EventTypeInput): {
    @statusCode statusCode: 201;
    @body body: EventType;
  } | {
    @statusCode statusCode: 400;
    @body body: Error;
  };

  /**
   * Replaces the Event Type's fields, with the same rules as create. The id never changes.
   * Existing Bookings keep their own name and time (ADR 0004).
   */
  @route("/{id}")
  @put
  op update(@path id: string, @body body: EventTypeInput): EventType | {
    @statusCode statusCode: 400;
    @body body: Error;
  } | {
    @statusCode statusCode: 404;
    @body body: Error;
  };

  /** Hard-deletes the Event Type. Its Bookings remain (ADR 0004). An unknown id is a 404. */
  @route("/{id}")
  @delete
  op delete(@path id: string): {
    @statusCode statusCode: 204;
  } | {
    @statusCode statusCode: 404;
    @body body: Error;
  };

  /** Every start of the Event Type in the Booking Window, each marked available or not. */
  @route("/{id}/slots")
  @get
  op slots(@path id: string): Slots | {
    @statusCode statusCode: 404;
    @body body: Error;
  };
}

/** What a Guest sends to book a call. */
model BookingInput {
  /** An id that no Event Type has is a 404, like the `/event-types/{id}` routes. */
  eventTypeId: string;

  /** Must be a free Slot of the Event Type right now, or the request is a 409. */
  start: utcDateTime;

  /** Must contain a non-space character. The server trims it before saving. */
  @minLength(1)
  @maxLength(100)
  guestName: string;

  /** The server trims it before saving. */
  @format("email")
  @maxLength(254)
  guestEmail: string;
}

/** A Guest's call of one Event Type. Its Event Type name and end are fixed when it is made (ADR 0004). */
model Booking {
  /** Server-generated. */
  @format("uuid")
  id: string;

  /** May point at an Event Type that has since been deleted. */
  eventTypeId: string;

  eventTypeName: string;

  /** Serialised exactly like `Date#toISOString()`. */
  start: utcDateTime;

  /** Serialised exactly like `Date#toISOString()`. */
  end: utcDateTime;

  guestName: string;
  guestEmail: string;
}

@route("/bookings")
@tag("Bookings")
namespace Bookings {
  /**
   * Every Booking that hasn't ended yet, so a call in progress stays until its end, sorted by
   * start. There is no paging.
   */
  @get
  op list(): Booking[];

  /**
   * Books a free Slot. Any start that isn't a free Slot right now (taken by a Booking of any
   * Event Type, past, outside the Booking Window or Working Hours, off the quarter hour) is a
   * 409 `SLOT_UNAVAILABLE`. An unknown Event Type is a 404 `EVENT_TYPE_NOT_FOUND`.
   */
  @post
  op create(@body body: BookingInput): {
    @statusCode statusCode: 201;
    @body body: Booking;
  } | {
    @statusCode statusCode: 400;
    @body body: Error;
  } | {
    @statusCode statusCode: 404;
    @body body: Error;
  } | {
    @statusCode statusCode: 409;
    @body body: Error;
  };
}
