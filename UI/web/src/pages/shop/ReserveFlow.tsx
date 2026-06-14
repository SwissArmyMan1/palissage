import { useEffect, useState } from 'react';
import { Loader2, CheckCircle2, Copy, ExternalLink, AlertTriangle } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { FeeBreakdown } from '@/components/ui/primitives';
import { LotPhoto } from '@/components/ui/LotCard';
import { eur, qty as fmtQty, type Lot } from '@/lib/mock';
import { useSession } from '@/lib/session';
import { useEure } from '@/lib/eure';
import { contracts, isContractsConfigured, parseEure, EURE } from '@/contracts';
import { PAYMENT_LABEL, CHAIN_LABEL } from '@/contracts/config';

type Step = 'review' | 'pending' | 'success';

export function ReserveFlow({
  lot,
  qty,
  pay,
  open,
  onClose,
}: {
  lot: Lot;
  qty: number;
  pay: 'full' | 'deposit';
  open: boolean;
  onClose: () => void;
}) {
  const [step, setStep] = useState<Step>('review');
  const subtotal = qty * lot.price;
  const fee = subtotal * 0.03;
  const total = subtotal + fee;
  const due = pay === 'deposit' ? total * 0.3 : total;

  const { isConnected } = useSession();
  const spender = contracts.primaryMarket.address;
  const eure = useEure(spender);
  // Live EURe path: a real deployment is configured and a wallet is connected.
  // Otherwise we keep the offline-demo simulation (mock lots have no on-chain offer).
  const live = isContractsConfigured && isConnected && eure.configured;

  // Amount to authorise, in EURe base units (18 decimals). Fixed to 2 dp first so
  // float noise (e.g. total * 0.3) never reaches parseUnits.
  const dueUnits = parseEure(due.toFixed(2));
  const insufficient = live && !eure.hasBalance(dueUnits);

  useEffect(() => {
    if (!open) {
      setStep('review');
      eure.clearApproveError();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Demo-only auto-advance; the live path is driven by the approve tx instead.
  useEffect(() => {
    if (step === 'pending' && !live) {
      const t = setTimeout(() => setStep('success'), 1800);
      return () => clearTimeout(t);
    }
  }, [step, live]);

  async function confirm() {
    if (!live) {
      setStep('pending');
      return;
    }
    setStep('pending');
    const ok = await eure.approve(spender, dueUnits);
    if (ok) {
      eure.refetch();
      setStep('success');
    } else {
      setStep('review');
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={step === 'success' ? 'Allocation reserved ✓' : `Reserve allocation`}>
      {step === 'review' && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3 rounded-md bg-page-subtle p-3">
            <LotPhoto src={lot.img} alt={lot.name} className="h-14 w-14 shrink-0" />
            <div>
              <p className="t-body-strong text-fg">{lot.name}</p>
              <p className="t-mono text-fg-secondary">{fmtQty(qty)} bottles × {eur(lot.price)}</p>
            </div>
          </div>
          <FeeBreakdown
            rows={[
              { label: `Subtotal · ${fmtQty(qty)} × ${eur(lot.price)}`, value: eur(subtotal) },
              { label: 'Protocol fee 3%', value: eur(fee) },
              ...(pay === 'deposit' ? [{ label: 'Deposit due now (30%)', value: eur(due) }] : []),
            ]}
            total={{ label: pay === 'deposit' ? 'Pay now' : 'Total to pay', value: eur(due) }}
          />
          {live && (
            <div className="flex items-center justify-between rounded-md bg-page-subtle px-3 py-2">
              <span className="t-small text-fg-secondary">Your balance</span>
              <span className={`t-mono ${insufficient ? 'text-danger' : 'text-fg'}`}>
                {Number(eure.balanceFormatted).toLocaleString('en-US', { maximumFractionDigits: 2 })} {EURE.symbol}
              </span>
            </div>
          )}
          {insufficient && (
            <p className="t-small flex items-center gap-1.5 text-danger">
              <AlertTriangle size={14} /> Not enough {EURE.symbol} to cover {eur(due)}.
            </p>
          )}
          {eure.decimalsMismatch && (
            <p className="t-small flex items-center gap-1.5 text-danger">
              <AlertTriangle size={14} /> {EURE.symbol} decimals mismatch — amounts may be wrong. Check the deployment.
            </p>
          )}
          {eure.approveError && <p className="t-small text-danger">{eure.approveError}</p>}
          <p className="t-caption normal-case tracking-normal text-fg-tertiary">
            Payment token: {PAYMENT_LABEL} · gas paid in ETH
          </p>
          <div className="flex justify-end gap-3">
            <Button kind="ghost" onClick={onClose}>Cancel</Button>
            <Button onClick={confirm} disabled={insufficient || eure.decimalsMismatch}>
              {live ? `Approve ${eur(due)} in ${EURE.symbol}` : 'Confirm in wallet'}
            </Button>
          </div>
        </div>
      )}

      {step === 'pending' && (
        <div className="flex flex-col items-center gap-4 py-4 text-center">
          <span className="grid h-16 w-16 place-items-center rounded-full bg-accent-subtle">
            <Loader2 size={32} className="animate-spin text-accent" />
          </span>
          <h3 className="t-h3 text-fg">Confirming on {CHAIN_LABEL}…</h3>
          <p className="t-small text-fg-secondary">
            {live ? `Approve the ${EURE.symbol} spend in your wallet.` : 'Usually takes a few seconds. Don’t close this window.'}
          </p>
          {!live && (
            <span className="flex items-center gap-2 t-mono text-fg-secondary">
              tx 0x8c2f…b911 <Copy size={16} className="text-fg-tertiary" /> <ExternalLink size={16} className="text-fg-tertiary" />
            </span>
          )}
        </div>
      )}

      {step === 'success' && (
        <div className="flex flex-col items-center gap-4 py-2 text-center">
          <span className="grid h-16 w-16 place-items-center rounded-full bg-success-subtle">
            <CheckCircle2 size={32} className="text-success" />
          </span>
          <h3 className="t-h3 text-fg">{live ? `${eur(due)} approved` : `${fmtQty(qty)} bottles reserved`}</h3>
          <p className="t-small text-fg-secondary">
            {live
              ? `${EURE.symbol} spend authorised for the primary market. Settlement runs once the on-chain offer is wired.`
              : pay === 'deposit'
                ? `Deposit paid. Pay remainder ${eur(total - due)} by 15.09.2026.`
                : `${fmtQty(qty)} bottle tokens minted to your wallet.`}
          </p>
          <Button kind="secondary" onClick={onClose}>View in portfolio</Button>
        </div>
      )}
    </Modal>
  );
}
