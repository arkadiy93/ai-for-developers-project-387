import { Button } from '@/components/ui/button';
import type { Booking } from '@/lib/api';
import { formatDay, formatTime } from '@/lib/datetime';

interface DoneStepProps {
  booking: Booking;
  onBookAnother: () => void;
}

/** Step 4 of the booking wizard: the Booking is made. */
export function DoneStep({ booking, onBookAnother }: DoneStepProps) {
  return (
    <section className="ring-foreground/10 flex flex-col items-start gap-2 rounded-xl p-6 ring-1">
      <h2 className="text-lg font-semibold">Booked</h2>
      <p className="font-medium">{booking.eventTypeName}</p>
      <p className="tabular-nums">
        {formatDay(booking.start)}, {formatTime(booking.start)}–{formatTime(booking.end)} UTC
      </p>
      <p className="text-muted-foreground text-sm">
        The Owner will see this call in their list. There's nothing else to do.
      </p>
      <Button className="mt-2" onClick={onBookAnother}>
        Book another call
      </Button>
    </section>
  );
}
