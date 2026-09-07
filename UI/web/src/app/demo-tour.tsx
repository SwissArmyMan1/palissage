import { useMemo, useState, type ReactNode } from 'react';
import { TourContext, type TourValue } from './tour-context';
import { TOUR_STEPS } from './tour-steps';

export function TourProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState(false);
  const [paused, setPaused] = useState(false);
  const [index, setIndex] = useState(0);

  const value = useMemo<TourValue>(
    () => ({
      active,
      paused,
      index,
      total: TOUR_STEPS.length,
      step: active ? TOUR_STEPS[index] : undefined,
      start: () => {
        setActive(true);
        setPaused(false);
        setIndex(0);
      },
      next: () => setIndex((current) => Math.min(current + 1, TOUR_STEPS.length - 1)),
      previous: () => setIndex((current) => Math.max(current - 1, 0)),
      pause: () => setPaused(true),
      resume: () => setPaused(false),
      stop: () => {
        setActive(false);
        setPaused(false);
      },
      goTo: (next: number) => setIndex(Math.min(Math.max(next, 0), TOUR_STEPS.length - 1)),
    }),
    [active, paused, index],
  );

  return <TourContext.Provider value={value}>{children}</TourContext.Provider>;
}
