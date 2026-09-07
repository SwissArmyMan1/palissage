/**
 * Guided-tour context.
 *
 * Tour state is presentation only, held apart from domain events, so pausing
 * or closing it leaves the ledger untouched.
 */

import { createContext, useContext } from 'react';
import type { TourStep } from './tour-steps';

export type TourValue = {
  active: boolean;
  paused: boolean;
  index: number;
  step: TourStep | undefined;
  total: number;
  start: () => void;
  next: () => void;
  previous: () => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  goTo: (index: number) => void;
};

export const TourContext = createContext<TourValue | undefined>(undefined);

export function useTour(): TourValue {
  const value = useContext(TourContext);
  if (!value) throw new Error('useTour must be used inside TourProvider');
  return value;
}
