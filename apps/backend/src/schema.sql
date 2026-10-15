-- Times are ISO 8601 UTC text, as written by Date#toISOString().

CREATE TABLE IF NOT EXISTS event_types (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL
);

-- event_type_id has no foreign key: Event Types are hard-deleted while their Bookings remain (ADR 0004).
CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY,
  event_type_id TEXT NOT NULL,
  event_type_name TEXT NOT NULL,
  start TEXT NOT NULL,
  end TEXT NOT NULL,
  guest_name TEXT NOT NULL,
  guest_email TEXT NOT NULL
);
