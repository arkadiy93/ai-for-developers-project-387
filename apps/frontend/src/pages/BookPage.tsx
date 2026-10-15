import { useState } from 'react';
import { DetailsStep } from '@/components/DetailsStep';
import { DoneStep } from '@/components/DoneStep';
import { EventTypeStep } from '@/components/EventTypeStep';
import { StepIndicator } from '@/components/StepIndicator';
import { TimeStep } from '@/components/TimeStep';
import type { Booking, EventType } from '@/lib/api';

// Kept in local state only, so reloading the page starts over.
type Wizard =
  | { step: 1; eventType?: EventType }
  | { step: 2; eventType: EventType }
  | { step: 3; eventType: EventType; start: string }
  | { step: 4; booking: Booking };

export function BookPage() {
  const [wizard, setWizard] = useState<Wizard>({ step: 1 });

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4 p-4">
      <h1 className="text-2xl font-semibold">Book a call</h1>
      <StepIndicator current={wizard.step} />
      {wizard.step === 1 && (
        <EventTypeStep
          selectedId={wizard.eventType?.id}
          onSelect={(eventType) => setWizard({ step: 2, eventType })}
        />
      )}
      {wizard.step === 2 && (
        <TimeStep
          eventType={wizard.eventType}
          onChangeEventType={() => setWizard({ step: 1, eventType: wizard.eventType })}
          onSelect={(start) => setWizard({ step: 3, eventType: wizard.eventType, start })}
        />
      )}
      {wizard.step === 3 && (
        <DetailsStep
          eventType={wizard.eventType}
          start={wizard.start}
          onChangeTime={() => setWizard({ step: 2, eventType: wizard.eventType })}
          onChangeEventType={() => setWizard({ step: 1 })}
          onBooked={(booking) => setWizard({ step: 4, booking })}
        />
      )}
      {wizard.step === 4 && (
        <DoneStep booking={wizard.booking} onBookAnother={() => setWizard({ step: 1 })} />
      )}
    </main>
  );
}
