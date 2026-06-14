import { cn } from '@/lib/cn';

export type StepState = 'done' | 'current' | 'future';

export interface Step {
  label: string;
  state: StepState;
}

function Dot({ state }: { state: StepState }) {
  return (
    <span className="relative grid h-5 w-5 place-items-center">
      {state === 'current' && (
        <span className="absolute inset-0 rounded-full border-2 border-accent animate-pulseRing" />
      )}
      <span
        className={cn(
          'h-3 w-3 rounded-full',
          state === 'done' && 'bg-success',
          state === 'current' && 'bg-accent',
          state === 'future' && 'border-2 border-line-strong',
        )}
      />
    </span>
  );
}

/** Step indicator for the escrow / redemption / production lifecycle; horizontal or vertical. */
export function Stepper({
  steps,
  direction = 'horizontal',
}: {
  steps: Step[];
  direction?: 'horizontal' | 'vertical';
}) {
  if (direction === 'vertical') {
    return (
      <div className="flex flex-col">
        {steps.map((s, i) => (
          <div key={s.label} className="flex gap-3">
            <div className="flex flex-col items-center">
              <Dot state={s.state} />
              {i < steps.length - 1 && (
                <span
                  className={cn(
                    'w-0.5 flex-1 min-h-5',
                    s.state === 'done' ? 'bg-success' : 'bg-line-strong',
                  )}
                />
              )}
            </div>
            <span
              className={cn(
                't-caption pb-4',
                s.state === 'current' && 'text-accent',
                s.state === 'done' && 'text-fg-secondary',
                s.state === 'future' && 'text-fg-tertiary',
              )}
            >
              {s.label}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="flex items-start">
      {steps.map((s, i) => (
        <div key={s.label} className="flex flex-1 items-start last:flex-none">
          <div className="flex w-12 flex-col items-center gap-2">
            <Dot state={s.state} />
            <span
              className={cn(
                't-caption text-center leading-tight',
                s.state === 'current' && 'text-accent',
                s.state === 'done' && 'text-fg-secondary',
                s.state === 'future' && 'text-fg-tertiary',
              )}
            >
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <span
              className={cn(
                'mt-2.5 h-0.5 flex-1',
                s.state === 'done' ? 'bg-success' : 'bg-line-strong',
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}
