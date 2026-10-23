import { useState } from 'react';
import { LoadError } from '@/components/LoadError';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { EventType, Slots } from '@/lib/api';
import { formatDay, formatTime } from '@/lib/datetime';
import { formatDuration } from '@/lib/duration';
import { useSlots } from '@/lib/use-slots';
import { cn } from '@/lib/utils';

type SlotDay = Slots['days'][number];

function freeCount(day: SlotDay) {
  return day.starts.filter((s) => s.available).length;
}

const choiceButton = cn(
  'ring-foreground/10 rounded-lg ring-1 transition-colors outline-none',
  'hover:bg-muted/50 focus-visible:ring-ring/50 focus-visible:ring-3',
  'disabled:text-muted-foreground disabled:pointer-events-none disabled:opacity-50',
);

interface TimeStepProps {
  eventType: EventType;
  onChangeEventType: () => void;
  onSelect: (start: string) => void;
}

/** Step 2 of the booking wizard: the Guest picks a start time. The server decides availability. */
export function TimeStep({ eventType, onChangeEventType, onSelect }: TimeStepProps) {
  const { state, reload } = useSlots(eventType.id);

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg">
          Pick a time for <em className="font-semibold">{eventType.name}</em> (
          {formatDuration(eventType.durationMinutes)})
        </h2>
        <Button variant="link" className="px-0" onClick={onChangeEventType}>
          Change event type
        </Button>
      </div>
      <p className="text-muted-foreground text-sm">All times are UTC.</p>
      {state.status === 'loading' && (
        <div role="status" aria-label="Loading free times" className="flex flex-col gap-3">
          <Skeleton className="h-16 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
      )}
      {state.status === 'error' && (
        <LoadError message="Couldn't load free times." onRetry={reload} />
      )}
      {state.status === 'ready' && <DayPicker days={state.data.days} onSelect={onSelect} />}
    </section>
  );
}

function DayPicker({ days, onSelect }: { days: SlotDay[]; onSelect: (start: string) => void }) {
  const [picked, setPicked] = useState<string>();
  const selected =
    days.find((day) => day.date === picked) ?? days.find((day) => freeCount(day) > 0);

  return (
    <>
      <ul aria-label="Days" className="-m-1 flex gap-2 overflow-x-auto p-1">
        {days.map((day) => (
          <li key={day.date} className="shrink-0">
            <button
              type="button"
              disabled={freeCount(day) === 0}
              aria-pressed={day === selected}
              onClick={() => setPicked(day.date)}
              className={cn(
                choiceButton,
                'flex flex-col items-center px-3 py-2 text-sm',
                'aria-pressed:ring-primary aria-pressed:ring-2',
              )}
            >
              <span className="font-medium">{formatDay(day.date)}</span>
              <span className="text-muted-foreground text-xs">{freeCount(day)} free</span>
            </button>
          </li>
        ))}
      </ul>
      {selected ? (
        <ul aria-label="Start times" className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {selected.starts.map(({ start, available }) => (
            <li key={start}>
              <button
                type="button"
                disabled={!available}
                onClick={() => onSelect(start)}
                className={cn(choiceButton, 'w-full py-2 text-sm tabular-nums')}
              >
                {formatTime(start)}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground rounded-xl border border-dashed p-6 text-center text-sm">
          No free times in the next 14 days.
        </p>
      )}
    </>
  );
}
