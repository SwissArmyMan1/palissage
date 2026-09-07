/**
 * The action state machine shared by every confirmation flow.
 *
 * `idle → validating → awaiting_confirmation → submitting → succeeded`, with
 * explicit failure branches. Success is only ever set from a receipt the
 * adapter returned; there is no timer, and no animation completes an action.
 */

import { useCallback, useMemo, useRef, useState } from 'react';
import type { CommandArgs, PreparedAction, Receipt } from '@/adapters/types';
import { AdapterFailure } from '@/adapters/types';
import { useEnvironment } from './environment-context';

export type ActionPhase =
  | 'idle'
  | 'validating'
  | 'awaiting_confirmation'
  | 'submitting'
  | 'succeeded'
  | 'failed';

export type ActionState = {
  phase: ActionPhase;
  prepared?: PreparedAction;
  receipt?: Receipt;
  /** Reason code; the caller resolves it through the locale dictionary. */
  error?: string;
};

export type ActionController = {
  state: ActionState;
  /** Runs the capability and arithmetic checks and opens the review. */
  review: (args: CommandArgs, options?: { actorId?: string }) => Promise<boolean>;
  /** Applies the reviewed action. Only a returned receipt sets success. */
  confirm: () => Promise<Receipt | undefined>;
  cancel: () => void;
  reset: () => void;
  busy: boolean;
};

let requestSequence = 0;

function failureCode(error: unknown): string {
  if (error instanceof AdapterFailure) {
    return error.failure.reason ?? error.failure.code;
  }
  return 'UNKNOWN';
}

export function useAction(): ActionController {
  const { demo, actorId, ledger } = useEnvironment();
  const [state, setState] = useState<ActionState>({ phase: 'idle' });
  const inFlight = useRef(false);

  const review = useCallback(
    async (args: CommandArgs, options?: { actorId?: string }) => {
      if (inFlight.current) return false;
      inFlight.current = true;
      setState({ phase: 'validating' });
      try {
        requestSequence += 1;
        const prepared = await demo.prepare({
          actorId: options?.actorId ?? actorId,
          args,
          expectedSequence: ledger.sequence,
          clientRequestId: `ui-${ledger.sequence}-${requestSequence}`,
        });
        setState({ phase: 'awaiting_confirmation', prepared });
        return true;
      } catch (error) {
        setState({ phase: 'failed', error: failureCode(error) });
        return false;
      } finally {
        inFlight.current = false;
      }
    },
    [demo, actorId, ledger.sequence],
  );

  const confirm = useCallback(async () => {
    const prepared = state.prepared;
    if (!prepared || inFlight.current) return undefined;
    inFlight.current = true;
    setState({ phase: 'submitting', prepared });
    try {
      const receipt = await demo.execute(prepared.id);
      setState({ phase: 'succeeded', prepared, receipt });
      return receipt;
    } catch (error) {
      setState({ phase: 'failed', prepared, error: failureCode(error) });
      return undefined;
    } finally {
      inFlight.current = false;
    }
  }, [demo, state.prepared]);

  const cancel = useCallback(() => setState({ phase: 'idle' }), []);
  const reset = useCallback(() => setState({ phase: 'idle' }), []);

  return useMemo(
    () => ({
      state,
      review,
      confirm,
      cancel,
      reset,
      busy: state.phase === 'validating' || state.phase === 'submitting',
    }),
    [state, review, confirm, cancel, reset],
  );
}
