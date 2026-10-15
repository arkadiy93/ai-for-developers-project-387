import { type FormEvent, type ReactNode, useState } from 'react';
import { Field } from '@/components/Field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Textarea } from '@/components/ui/textarea';
import type { ApiError, EventTypeInput } from '@/lib/api';
import { durations, formatDuration } from '@/lib/duration';
import { type FieldErrors, toFieldErrors } from '@/lib/field-errors';

type FieldName = keyof EventTypeInput;

const fields: FieldName[] = ['name', 'description', 'durationMinutes'];

/** What `submit` resolves to: openapi-fetch's result, narrowed to what the form reads. */
export interface SubmitResult {
  data?: unknown;
  error?: ApiError;
  response: Response;
}

interface EventTypeFormProps {
  /** The form's accessible name, for example "New event type". */
  label: string;
  submitLabel: string;
  /** Shown when the request fails for a reason other than field errors or a 404. */
  failedMessage: string;
  initial?: EventTypeInput;
  submit: (body: EventTypeInput) => Promise<SubmitResult>;
  onSaved: () => void;
  /** Called on a 404, when the Event Type was deleted elsewhere. */
  onNotFound?: () => void;
  onCancel: () => void;
  /** Rendered between the fields and the buttons. */
  children?: ReactNode;
}

/** The inline form for creating or editing an Event Type. */
export function EventTypeForm({
  label,
  submitLabel,
  failedMessage,
  initial = { name: '', description: '', durationMinutes: 30 },
  submit,
  onSaved,
  onNotFound,
  onCancel,
  children,
}: EventTypeFormProps) {
  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description);
  const [durationMinutes, setDurationMinutes] = useState(initial.durationMinutes);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<FieldName>>({});
  const [formError, setFormError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setFieldErrors({});
    setFormError(undefined);
    try {
      const { data, error, response } = await submit({ name, description, durationMinutes });
      if (data) {
        onSaved();
        return;
      }
      if (response.status === 404 && onNotFound) {
        onNotFound();
        return;
      }
      const errors = error?.details?.length ? toFieldErrors(fields, error.details) : undefined;
      if (errors) {
        setFieldErrors(errors);
      } else {
        setFormError(failedMessage);
      }
    } catch {
      setFormError(failedMessage);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      aria-label={label}
      className="ring-foreground/10 flex flex-col gap-3 rounded-xl p-3 ring-1"
    >
      <Field label="Name" error={fieldErrors.name}>
        {(props) => (
          <Input
            {...props}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={100}
          />
        )}
      </Field>
      <Field label="Description" error={fieldErrors.description}>
        {(props) => (
          <Textarea
            {...props}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={500}
          />
        )}
      </Field>
      <Field label="Duration" error={fieldErrors.durationMinutes}>
        {(props) => (
          <NativeSelect
            {...props}
            className="w-full"
            value={durationMinutes}
            onChange={(e) => setDurationMinutes(Number(e.target.value))}
          >
            {durations.map((minutes) => (
              <NativeSelectOption key={minutes} value={minutes}>
                {formatDuration(minutes)}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        )}
      </Field>
      {children}
      {formError && (
        <p role="alert" className="text-destructive text-sm">
          {formError}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
