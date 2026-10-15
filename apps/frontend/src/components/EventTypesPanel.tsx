import { useId, useState } from 'react';
import { EventTypeCard } from '@/components/EventTypeCard';
import { EventTypeForm } from '@/components/EventTypeForm';
import { LoadError } from '@/components/LoadError';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api';
import { useEventTypes } from '@/lib/use-event-types';

/** The Admin side panel where the Owner manages Event Types. */
export function EventTypesPanel() {
  const headingId = useId();
  const { state, reload } = useEventTypes();
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string>();

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <h2 id={headingId} className="text-lg font-semibold">
        Event types
      </h2>

      {state.status === 'loading' && (
        <div role="status" aria-label="Loading event types" className="flex flex-col gap-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      )}

      {state.status === 'error' && (
        <LoadError message="Couldn't load event types." onRetry={reload} />
      )}

      {state.status === 'ready' && (
        <>
          {state.data.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              None yet. Guests see an empty booking page.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {state.data.map((eventType) => (
                <li key={eventType.id}>
                  <EventTypeCard
                    eventType={eventType}
                    expanded={editingId === eventType.id}
                    onExpand={() => setEditingId(eventType.id)}
                    onCollapse={() => setEditingId(undefined)}
                    onChanged={reload}
                  />
                </li>
              ))}
            </ul>
          )}

          {creating ? (
            <EventTypeForm
              label="New event type"
              submitLabel="Create"
              failedMessage="Couldn't create the event type. Please try again."
              submit={(body) => api.POST('/event-types', { body })}
              onSaved={() => {
                setCreating(false);
                reload();
              }}
              onCancel={() => setCreating(false)}
            />
          ) : (
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="text-muted-foreground hover:bg-muted/50 hover:text-foreground focus-visible:ring-ring/50 rounded-xl border border-dashed p-3 text-sm outline-none focus-visible:ring-3"
            >
              + New event type
            </button>
          )}
        </>
      )}
    </section>
  );
}
