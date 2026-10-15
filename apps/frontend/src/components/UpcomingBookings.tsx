import { useId } from 'react';
import { LoadError } from '@/components/LoadError';
import { Skeleton } from '@/components/ui/skeleton';
import type { Booking } from '@/lib/api';
import { formatRelativeDay, formatTime, utcDate } from '@/lib/datetime';
import { useBookings } from '@/lib/use-bookings';

/** The Bookings of each UTC date, in the server's start order. */
function groupByDay(bookings: Booking[]) {
  const days = new Map<string, Booking[]>();
  for (const booking of bookings) {
    const date = utcDate(booking.start);
    days.set(date, [...(days.get(date) ?? []), booking]);
  }
  return [...days];
}

/** The main column of the Admin area: every Booking that hasn't ended, read-only. */
export function UpcomingBookings() {
  const headingId = useId();
  const { state, reload } = useBookings();

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <div>
        <h2 id={headingId} className="text-lg font-semibold">
          Upcoming bookings
        </h2>
        <p className="text-muted-foreground text-sm">All times are UTC.</p>
      </div>
      {state.status === 'loading' && (
        <div role="status" aria-label="Loading bookings" className="flex flex-col gap-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-12 rounded-xl" />
          ))}
        </div>
      )}
      {state.status === 'error' && <LoadError message="Couldn't load bookings." onRetry={reload} />}
      {state.status === 'ready' &&
        (state.data.length === 0 ? (
          <p className="text-muted-foreground rounded-xl border border-dashed p-6 text-center text-sm">
            Nothing booked yet.
          </p>
        ) : (
          groupByDay(state.data).map(([date, bookings]) => (
            <BookingDay key={date} date={date} bookings={bookings} />
          ))
        ))}
    </section>
  );
}

function BookingDay({ date, bookings }: { date: string; bookings: Booking[] }) {
  const headingId = useId();

  return (
    <div className="flex flex-col gap-2">
      <h3 id={headingId} className="text-muted-foreground text-sm font-medium">
        {formatRelativeDay(date)}
      </h3>
      <ul aria-labelledby={headingId} className="flex flex-col gap-2">
        {bookings.map((booking) => (
          <li
            key={booking.id}
            className="ring-foreground/10 flex flex-col gap-1 rounded-xl p-3 ring-1 sm:flex-row sm:items-baseline sm:gap-4"
          >
            <span className="font-medium tabular-nums">
              {formatTime(booking.start)}–{formatTime(booking.end)}
            </span>
            <span className="flex-1">
              <em className="font-semibold">{booking.eventTypeName}</em> with {booking.guestName}
            </span>
            <a
              href={`mailto:${booking.guestEmail}`}
              className="text-muted-foreground hover:text-foreground text-sm break-all underline-offset-4 hover:underline"
            >
              {booking.guestEmail}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
