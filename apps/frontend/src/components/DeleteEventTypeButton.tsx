import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { api, type EventType } from '@/lib/api';

const failedMessage = "Couldn't delete the event type. Please try again.";

interface DeleteEventTypeButtonProps {
  eventType: EventType;
  /** Called once the Event Type is gone, including when it was already deleted elsewhere. */
  onDeleted: () => void;
}

/** "Delete this event type", behind a confirmation dialog. Its Bookings stay (ADR 0004). */
export function DeleteEventTypeButton({ eventType, onDeleted }: DeleteEventTypeButtonProps) {
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string>();

  async function handleDelete() {
    setDeleting(true);
    setError(undefined);
    try {
      const { response } = await api.DELETE('/event-types/{id}', {
        params: { path: { id: eventType.id } },
      });
      // A 404 means someone else already deleted it, which is what the Owner wanted.
      if (response.ok || response.status === 404) {
        setOpen(false);
        onDeleted();
        return;
      }
      setError(failedMessage);
    } catch {
      setError(failedMessage);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        setError(undefined);
      }}
    >
      <AlertDialogTrigger
        render={<Button type="button" variant="destructive" size="sm" className="self-start" />}
      >
        Delete this event type
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Delete <em>{eventType.name}</em>?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Guests won't be able to book it anymore. Existing Bookings stay.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" disabled={deleting} onClick={handleDelete}>
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
