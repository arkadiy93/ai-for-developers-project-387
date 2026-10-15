import { LoadError } from '@/components/LoadError';
import { Skeleton } from '@/components/ui/skeleton';
import type { EventType } from '@/lib/api';
import { formatDuration } from '@/lib/duration';
import { useEventTypes } from '@/lib/use-event-types';
import { cn } from '@/lib/utils';

interface EventTypeStepProps {
  selectedId?: string;
  onSelect: (eventType: EventType) => void;
}

/** Step 1 of the booking wizard: the Guest picks an Event Type. */
export function EventTypeStep({ selectedId, onSelect }: EventTypeStepProps) {
  const { state, reload } = useEventTypes();

  if (state.status === 'loading') {
    return (
      <div role="status" aria-label="Loading event types" className="grid gap-3 sm:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
    );
  }

  if (state.status === 'error') {
    return <LoadError message="Couldn't load event types." onRetry={reload} />;
  }

  if (state.data.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-6 text-center">
        <p className="font-medium">No calls to book yet.</p>
        <p className="text-muted-foreground text-sm">
          The Owner hasn't set up any event types. Check back later.
        </p>
      </div>
    );
  }

  return (
    <ul aria-label="Event types" className="grid gap-3 sm:grid-cols-2">
      {state.data.map((eventType) => (
        <li key={eventType.id}>
          <button
            type="button"
            aria-pressed={eventType.id === selectedId}
            onClick={() => onSelect(eventType)}
            className={cn(
              'bg-card hover:bg-muted/50 ring-foreground/10 flex h-full w-full flex-col items-start gap-1 rounded-xl p-4 text-left text-sm ring-1 transition-colors',
              'focus-visible:ring-ring/50 outline-none focus-visible:ring-3',
              'aria-pressed:ring-primary aria-pressed:ring-2',
            )}
          >
            <span className="flex w-full items-baseline justify-between gap-2">
              <span className="text-base font-medium">{eventType.name}</span>
              <span className="text-muted-foreground shrink-0">
                {formatDuration(eventType.durationMinutes)}
              </span>
            </span>
            <span className="text-muted-foreground">{eventType.description}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
