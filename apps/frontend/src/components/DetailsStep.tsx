import { type FormEvent, type ReactNode, useState } from 'react';
import { Field } from '@/components/Field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api, type Booking, type BookingInput, type EventType } from '@/lib/api';
import { formatDay, formatTime } from '@/lib/datetime';
import { type FieldErrors, toFieldErrors } from '@/lib/field-errors';

type FieldName = 'guestName' | 'guestEmail';

const fields: FieldName[] = ['guestName', 'guestEmail'];

// The server's email rule: ajv-formats' "fast" email format, which express-openapi-validator uses.
const emailPattern =
  /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*$/i;

// The same rules the server checks, on the trimmed values it would save.
function validate({
  guestName,
  guestEmail,
}: Pick<BookingInput, FieldName>): FieldErrors<FieldName> {
  const errors: FieldErrors<FieldName> = {};
  if (guestName === '') {
    errors.guestName = 'Enter your name.';
  } else if (guestName.length > 100) {
    errors.guestName = 'Name must be at most 100 characters.';
  }
  if (guestEmail.length > 254) {
    errors.guestEmail = 'Email must be at most 254 characters.';
  } else if (!emailPattern.test(guestEmail)) {
    errors.guestEmail = 'Enter a valid email address.';
  }
  return errors;
}

/** Why the last attempt to book failed, other than field errors. */
type Problem = 'taken' | 'gone' | 'failed';

interface DetailsStepProps {
  eventType: EventType;
  start: string;
  /** Goes back to step 2. Also how the Guest picks another time after a 409. */
  onChangeTime: () => void;
  /** Goes back to step 1 after a 404, when the Event Type was deleted. */
  onChangeEventType: () => void;
  onBooked: (booking: Booking) => void;
}

/** Step 3 of the booking wizard: the Guest enters their name and email and books. */
export function DetailsStep({
  eventType,
  start,
  onChangeTime,
  onChangeEventType,
  onBooked,
}: DetailsStepProps) {
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<FieldName>>({});
  const [problem, setProblem] = useState<Problem>();
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const guest = { guestName: guestName.trim(), guestEmail: guestEmail.trim() };
    const errors = validate(guest);
    setFieldErrors(errors);
    setProblem(undefined);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    try {
      const { data, error, response } = await api.POST('/bookings', {
        body: { eventTypeId: eventType.id, start, ...guest },
      });
      if (data) {
        onBooked(data);
        return;
      }
      if (response.status === 409) {
        setProblem('taken');
        return;
      }
      if (response.status === 404) {
        setProblem('gone');
        return;
      }
      const serverErrors = error?.details?.length
        ? toFieldErrors(fields, error.details)
        : undefined;
      if (serverErrors) {
        setFieldErrors(serverErrors);
      } else {
        setProblem('failed');
      }
    } catch {
      setProblem('failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg">
          <em className="font-semibold">{eventType.name}</em> · {formatDay(start)},{' '}
          {formatTime(start)} UTC
        </h2>
        <Button variant="link" className="px-0" onClick={onChangeTime}>
          change
        </Button>
      </div>
      {problem === 'taken' && (
        <Banner message="Sorry, that time was just booked by someone else.">
          <Button variant="outline" size="sm" onClick={onChangeTime}>
            Pick another time
          </Button>
        </Banner>
      )}
      {problem === 'gone' && (
        <Banner message="This event type is no longer available.">
          <Button variant="outline" size="sm" onClick={onChangeEventType}>
            Choose another event type
          </Button>
        </Banner>
      )}
      <form
        onSubmit={handleSubmit}
        noValidate
        aria-label="Your details"
        className="flex max-w-md flex-col gap-3"
      >
        <Field label="Your name" error={fieldErrors.guestName}>
          {(props) => (
            <Input
              {...props}
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              autoComplete="name"
              maxLength={100}
            />
          )}
        </Field>
        <Field label="Email" error={fieldErrors.guestEmail}>
          {(props) => (
            <Input
              {...props}
              type="email"
              value={guestEmail}
              onChange={(e) => setGuestEmail(e.target.value)}
              autoComplete="email"
            />
          )}
        </Field>
        {problem === 'failed' && (
          <p role="alert" className="text-destructive text-sm">
            Something went wrong. Please try again.
          </p>
        )}
        {/* After a 409 or 404 the only way on is the banner's button. */}
        <Button
          type="submit"
          className="self-start"
          disabled={submitting || problem === 'taken' || problem === 'gone'}
        >
          Book
        </Button>
      </form>
    </section>
  );
}

function Banner({ message, children }: { message: string; children: ReactNode }) {
  return (
    <div
      role="alert"
      className="border-destructive/30 bg-destructive/5 flex flex-wrap items-center justify-between gap-2 rounded-xl border p-4"
    >
      <p className="text-destructive text-sm">{message}</p>
      {children}
    </div>
  );
}
