import { useState } from 'react';
import { PageHeader } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { StatCard, SectionTitle, FeeBreakdown } from '@/components/ui/primitives';
import { StatusBadge, type Tone } from '@/components/ui/StatusBadge';
import { Modal } from '@/components/ui/Modal';
import { Stagger, StaggerItem } from '@/components/layout/Page';
import { PAYMENT_LABEL } from '@/contracts/config';

interface Milestone {
  desc: string;
  pct: string;
  amount: string;
  state: 'released' | 'confirmable' | 'pending';
}

const milestones: Milestone[] = [
  { desc: 'Harvest', pct: '30%', amount: '€9 645.00', state: 'released' },
  { desc: 'Bottling', pct: '40%', amount: '€12 860.00', state: 'confirmable' },
  { desc: 'Delivery', pct: '30%', amount: '€9 645.00', state: 'pending' },
];

const msTone: Record<Milestone['state'], { tone: Tone; label: string }> = {
  released: { tone: 'success', label: 'Released' },
  confirmable: { tone: 'warning', label: 'Awaiting verifier' },
  pending: { tone: 'warning', label: 'Awaiting verifier' },
};

const payouts = [
  { date: '28.05.2026', offer: 'A1353 Limousis 2026 — En Primeur', ms: 'Harvest 30%', amount: '€9 355.65', tx: '0x8c2f…b911' },
  { date: '02.04.2026', offer: 'Demoiselle 2022 — Standard', ms: 'Full release', amount: '€16 564.35', tx: '0x91aa…03f7' },
];

export default function WineryFinance() {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <PageHeader title="Finance" action={<Button onClick={() => setOpen(true)}>Withdraw available</Button>} />

      <Stagger className="flex flex-col gap-8">
        <StaggerItem className="grid gap-4 md:grid-cols-3">
          <StatCard label="In escrow" value="€32 150.00" delta="across 2 offers" deltaTone="muted" />
          <StatCard label="Released to date" value="€25 920.00" delta="3 milestones" deltaTone="muted" />
          <StatCard label="Available to withdraw" value="€12 940.00" delta="after 3% protocol fee" deltaTone="muted" />
        </StaggerItem>

        <StaggerItem className="card flex flex-col gap-3 p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <SectionTitle>A1353 Limousis 2026 — En Primeur</SectionTitle>
            <span className="t-mono text-fg-secondary">Paid total: €32 150.00</span>
          </div>
          <div className="flex flex-col gap-2">
            {milestones.map((m) => (
              <div key={m.desc} className="flex flex-wrap items-center gap-3 rounded-md border border-line px-4 py-3">
                <span className="t-body flex-1 text-fg">{m.desc}</span>
                <span className="t-mono text-fg-secondary">{m.pct}</span>
                <span className="t-mono text-fg">{m.amount}</span>
                <StatusBadge tone={msTone[m.state].tone}>{msTone[m.state].label}</StatusBadge>
                {m.state === 'confirmable' && <Button kind="secondary" size="sm">Confirm</Button>}
              </div>
            ))}
          </div>
          <p className="t-caption normal-case tracking-normal text-fg-tertiary">
            Protocol fee 3% is withheld on each release
          </p>
        </StaggerItem>

        <StaggerItem className="flex flex-col gap-3">
          <SectionTitle>Payout history</SectionTitle>
          <div className="card overflow-hidden">
            <div className="hidden grid-cols-[110px_1fr_130px_130px_120px] gap-4 bg-page-subtle px-4 py-2.5 md:grid">
              {['DATE', 'OFFER', 'MILESTONE', 'AMOUNT', 'TX'].map((h, i) => (
                <span key={h} className={`t-caption text-fg-secondary ${i >= 3 ? 'text-right' : ''}`}>{h}</span>
              ))}
            </div>
            {payouts.map((p) => (
              <div key={p.tx} className="grid grid-cols-1 gap-1 border-t border-line px-4 py-3 md:grid-cols-[110px_1fr_130px_130px_120px] md:items-center md:gap-4">
                <span className="t-small text-fg-secondary">{p.date}</span>
                <span className="t-body text-fg">{p.offer}</span>
                <span className="t-small text-fg-secondary">{p.ms}</span>
                <span className="t-mono text-fg md:text-right">{p.amount}</span>
                <span className="t-mono text-fg-secondary md:text-right">{p.tx} ↗</span>
              </div>
            ))}
          </div>
        </StaggerItem>
      </Stagger>

      <Modal open={open} onClose={() => setOpen(false)} title="Withdraw available">
        <div className="flex flex-col gap-4">
          <FeeBreakdown
            rows={[
              { label: 'Available balance', value: '€13 340.21' },
              { label: 'Protocol fee 3%', value: '€400.21' },
            ]}
            total={{ label: 'You receive', value: '€12 940.00' }}
          />
          <p className="t-small text-fg-secondary">Payment token: {PAYMENT_LABEL} · gas paid in ETH</p>
          <Button full>Confirm in wallet</Button>
        </div>
      </Modal>
    </div>
  );
}
