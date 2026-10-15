import { cn } from '@/lib/utils';

const steps = ['Event type', 'Time', 'Your details', 'Done'];

/** The Guest booking wizard's steps, with `current` (1-based) highlighted. */
export function StepIndicator({ current }: { current: number }) {
  return (
    <ol aria-label="Booking steps" className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
      {steps.map((label, i) => {
        const step = i + 1;
        return (
          <li
            key={label}
            aria-current={step === current ? 'step' : undefined}
            className={cn(
              'text-muted-foreground',
              step === current && 'text-foreground font-medium underline underline-offset-4',
            )}
          >
            {step}. {label}
          </li>
        );
      })}
    </ol>
  );
}
