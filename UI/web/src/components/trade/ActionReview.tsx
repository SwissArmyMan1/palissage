import { useState, type ReactNode } from 'react';
import { useI18n } from '@/app/i18n-context';
import type { ActionController } from '@/app/actions';
import { useEnvironment } from '@/app/environment-context';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Notice } from '@/components/ui/Feedback';
import { StatusBadge } from '@/components/ui/StatusBadge';

export type ReviewRow = { label: string; value: ReactNode; emphasis?: boolean };

export type ActionReviewProps = {
  controller: ActionController;
  title: string;
  /** What the action means in business terms, before any technical detail. */
  summary: ReviewRow[];
  consequences: string[];
  confirmLabel: string;
  /** Required acknowledgement, never pre-selected. */
  acknowledgement?: string;
  /** Receives the receipt that produced the success, before the dialog resets. */
  onSuccess?: (receipt: import('@/adapters/types').Receipt | undefined) => void;
  successTitle?: string;
  successBody?: ReactNode;
  destructive?: boolean;
};

/**
 * The single confirmation surface (SYS-06). It states the object, the mode,
 * the amounts and the consequences, then confirms. Success is rendered only
 * after the adapter has returned a receipt.
 */
export function ActionReview({
  controller,
  title,
  summary,
  consequences,
  confirmLabel,
  acknowledgement,
  onSuccess,
  successTitle,
  successBody,
  destructive,
}: ActionReviewProps) {
  const { d, fmt } = useI18n();
  const { mode } = useEnvironment();
  const [acknowledged, setAcknowledged] = useState(false);
  const { state } = controller;

  const open = state.phase !== 'idle';
  if (!open) return null;

  const succeeded = state.phase === 'succeeded';
  const failed = state.phase === 'failed';
  const reasonKey = state.error as keyof typeof d.reason | undefined;

  const close = () => {
    setAcknowledged(false);
    if (succeeded) {
      const receipt = state.receipt;
      controller.reset();
      onSuccess?.(receipt);
    } else {
      controller.cancel();
    }
  };

  return (
    <Dialog open title={succeeded ? (successTitle ?? d.demo.simulationComplete) : title} onClose={close} closeLabel={d.common.close}>
      {succeeded ? (
        <div className="flex flex-col gap-4">
          <Notice tone="success" title={d.demo.simulationComplete}>
            {successBody}
          </Notice>
          {state.receipt?.reference ? (
            <p className="caption">
              {d.demo.localReference}: <span className="code">{state.receipt.reference}</span>
            </p>
          ) : null}
          <div>
            <Button onClick={close}>{d.common.close}</Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge tone={mode === 'testnet' ? 'info' : 'warning'}>
              {mode === 'testnet' ? d.mode.testnet : d.mode.demo}
            </StatusBadge>
          </div>

          <dl className="flex flex-col gap-2 text-sm">
            {summary.map((row, index) => (
              <div key={index} className="flex items-baseline justify-between gap-4 border-b border-line pb-2 last:border-0">
                <dt className="text-fg-secondary">{row.label}</dt>
                <dd className={row.emphasis ? 'text-right font-semibold tabular' : 'text-right tabular'}>{row.value}</dd>
              </div>
            ))}
          </dl>

          <section>
            <h3 className="text-sm font-semibold">{d.tx.consequences}</h3>
            <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 text-sm text-fg-secondary">
              {consequences.map((line, index) => (
                <li key={index}>{line}</li>
              ))}
            </ul>
          </section>

          {failed ? (
            <Notice tone="warning" title={d.errors.generic}>
              {reasonKey && d.reason[reasonKey] ? d.reason[reasonKey] : d.reason.UNKNOWN}
            </Notice>
          ) : null}

          {acknowledgement ? (
            <label className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(event) => setAcknowledged(event.target.checked)}
                className="mt-0.5 h-5 w-5 accent-[var(--c-accent)]"
              />
              <span>{acknowledgement}</span>
            </label>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <Button
              variant={destructive ? 'danger' : 'primary'}
              loading={state.phase === 'submitting'}
              loadingLabel={d.tx.working}
              disabled={Boolean(acknowledgement) && !acknowledged}
              onClick={() => {
                void controller.confirm();
              }}
            >
              {mode === 'demo' ? fmt(d.demo.simulate, { action: confirmLabel }) : confirmLabel}
            </Button>
            <Button variant="secondary" onClick={close} disabled={state.phase === 'submitting'}>
              {d.common.cancel}
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}

/** Inline result panel so an outcome is never only inside a toast. */
export function ActionResult({
  reference,
  title,
  body,
  action,
}: {
  reference?: string;
  title: string;
  body: ReactNode;
  action?: ReactNode;
}) {
  const { d } = useI18n();
  return (
    <div className="rounded-panel border border-success bg-success-subtle p-5">
      <h3 className="text-base font-semibold text-success">{title}</h3>
      <div className="mt-1 text-sm text-fg">{body}</div>
      {reference ? (
        <p className="caption mt-2">
          {d.demo.localReference}: <span className="code">{reference}</span>
        </p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
