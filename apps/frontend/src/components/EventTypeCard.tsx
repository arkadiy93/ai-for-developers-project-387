import { DeleteEventTypeButton } from '@/components/DeleteEventTypeButton';
import { EventTypeForm } from '@/components/EventTypeForm';
import { api, type EventType } from '@/lib/api';
import { formatDuration } from '@/lib/duration';

interface EventTypeCardProps {
  eventType: EventType;
  expanded: boolean;
  onExpand: () => void;
  onCollapse: () => void;
  /** Called after a save, or when the Event Type turned out to be gone, so the list refetches. */
  onChanged: () => void;
}

/** One Event Type in the Admin panel. Clicking it expands the edit form. */
export function EventTypeCard({
  eventType,
  expanded,
  onExpand,
  onCollapse,
  onChanged,
}: EventTypeCardProps) {
  if (!expanded) {
    return (
      <button
        type="button"
        onClick={onExpand}
        className="bg-card ring-foreground/10 hover:bg-muted/50 focus-visible:ring-ring/50 flex w-full items-baseline justify-between gap-2 rounded-xl p-3 text-left text-sm ring-1 outline-none focus-visible:ring-3"
      >
        <span className="font-medium">{eventType.name}</span>
        <span className="text-muted-foreground shrink-0">
          {formatDuration(eventType.durationMinutes)}
        </span>
      </button>
    );
  }

  const { id, ...initial } = eventType;
  const collapseAndRefetch = () => {
    onCollapse();
    onChanged();
  };

  return (
    <EventTypeForm
      label={`Edit ${eventType.name}`}
      submitLabel="Save"
      failedMessage="Couldn't save the event type. Please try again."
      initial={initial}
      submit={(body) => api.PUT('/event-types/{id}', { params: { path: { id } }, body })}
      onSaved={collapseAndRefetch}
      onNotFound={collapseAndRefetch}
      onCancel={onCollapse}
    >
      <p className="text-muted-foreground text-xs">
        Changes apply to new bookings only. Calls already booked keep their time and name.
      </p>
      <DeleteEventTypeButton eventType={eventType} onDeleted={collapseAndRefetch} />
    </EventTypeForm>
  );
}
