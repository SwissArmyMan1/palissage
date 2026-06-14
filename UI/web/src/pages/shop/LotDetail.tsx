import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Minus, Plus, ShieldCheck, FileText } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { LotPhoto } from '@/components/ui/LotCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { FeeBreakdown, SectionTitle } from '@/components/ui/primitives';
import { Stepper, type Step } from '@/components/ui/Stepper';
import { ReserveFlow } from './ReserveFlow';
import { marketplaceLots, PRODUCTION_STEPS, eur, qty as fmtQty } from '@/lib/mock';

export default function ShopLotDetail() {
  const { id } = useParams();
  const lot = marketplaceLots.find((l) => l.id === id) ?? marketplaceLots[0];
  const [count, setCount] = useState(Math.min(2400, lot.available || 60));
  const [pay, setPay] = useState<'full' | 'deposit'>('full');
  const [open, setOpen] = useState(false);

  const subtotal = count * lot.price;
  const fee = subtotal * 0.03;
  const total = subtotal + fee;

  const ci = PRODUCTION_STEPS.indexOf(lot.production);
  const steps: Step[] = PRODUCTION_STEPS.map((label, i) => ({
    label,
    state: i < ci ? 'done' : i === ci ? 'current' : 'future',
  }));

  const docs = [
    { name: 'Warehouse attestation — Moussoulens.pdf', hash: 'sha256: 8f3a…c91d' },
    { name: `AOP certificate — ${lot.region.split(' ')[0]} ${lot.vintage}.pdf`, hash: 'sha256: 41bc…77e2' },
  ];

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_380px] lg:items-start">
      {/* left */}
      <div className="flex flex-col gap-6">
        <LotPhoto src={lot.img} alt={lot.name} className="aspect-[3/2] w-full" />

        <div className="flex flex-col gap-2">
          <h1 className="t-display text-fg">{lot.name}</h1>
          <div className="flex items-center gap-2">
            <span className="t-body-strong text-accent underline">{lot.winery}</span>
            <StatusBadge tone="success">Verified winery</StatusBadge>
          </div>
        </div>

        <div className="card overflow-hidden">
          {[
            ['Vintage', String(lot.vintage)],
            ['Region', lot.region],
            ['Grapes', lot.grapes],
            ['Alcohol', lot.alcohol + ' vol'],
            ['Bottle size', lot.bottleMl + ' ml'],
            ['Export to', lot.exportTo.join(' · ')],
          ].map(([l, v], i) => (
            <div key={l} className={`flex items-center gap-4 px-5 py-3 ${i > 0 ? 'border-t border-line' : ''}`}>
              <span className="t-small w-40 shrink-0 text-fg-secondary">{l}</span>
              <span className="t-body text-fg">{v}</span>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-2">
          <SectionTitle>Documents</SectionTitle>
          {docs.map((d) => (
            <div key={d.name} className="flex items-center gap-3 rounded-md border border-line bg-surface px-4 py-3">
              <ShieldCheck size={20} className="text-success" />
              <div className="flex-1">
                <p className="t-body text-fg">{d.name}</p>
                <p className="t-mono text-fg-tertiary">{d.hash}</p>
              </div>
              <Button kind="ghost" size="sm" icon={<FileText size={14} />}>View</Button>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-3">
          <SectionTitle>Production</SectionTitle>
          <div className="hidden md:block"><Stepper steps={steps} /></div>
          <div className="md:hidden"><Stepper steps={steps} direction="vertical" /></div>
        </div>

        <div className="flex flex-col gap-3">
          <SectionTitle>Lot transparency</SectionTitle>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              [fmtQty(lot.total), 'issued'],
              [fmtQty(lot.reserved), 'reserved'],
              [fmtQty(lot.redeemed), 'redeemed'],
              [fmtQty(lot.available), 'available'],
            ].map(([n, l]) => (
              <div key={l} className="flex flex-col items-center gap-1 rounded-md bg-page-subtle px-4 py-3">
                <span className="t-mono text-fg">{n}</span>
                <span className="t-caption normal-case tracking-normal text-fg-secondary">{l}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* sticky offer card */}
      <div className="card flex flex-col gap-4 p-5 shadow-e2 lg:sticky lg:top-8">
        <div className="flex items-baseline gap-1.5">
          <span className="t-num text-fg">{eur(lot.price)}</span>
          <span className="t-body text-fg-secondary">/ bottle</span>
        </div>
        <p className="t-small text-fg-secondary">{fmtQty(lot.available)} of {fmtQty(lot.total)} bottles available</p>
        {lot.enPrimeur && <StatusBadge tone="warning">Ends in 6 days</StatusBadge>}

        <div>
          <span className="t-small text-fg-secondary">Quantity (min 60 · max {fmtQty(lot.available)})</span>
          <div className="mt-2 flex h-10 items-center rounded-md border border-line-strong">
            <button onClick={() => setCount((c) => Math.max(60, c - 60))} className="grid h-full w-10 place-items-center text-fg-secondary"><Minus size={16} /></button>
            <span className="t-mono flex-1 text-center text-fg">{fmtQty(count)}</span>
            <button onClick={() => setCount((c) => Math.min(lot.available, c + 60))} className="grid h-full w-10 place-items-center text-fg-secondary"><Plus size={16} /></button>
          </div>
        </div>

        <FeeBreakdown
          rows={[
            { label: `Subtotal · ${fmtQty(count)} × ${eur(lot.price)}`, value: eur(subtotal) },
            { label: 'Protocol fee 3%', value: eur(fee) },
          ]}
          total={{ label: 'Total', value: eur(total) }}
        />

        <div className="flex flex-col gap-2">
          <span className="t-small text-fg-secondary">Payment</span>
          {(['full', 'deposit'] as const).map((p) => (
            <label key={p} className="flex cursor-pointer items-center gap-3">
              <input type="radio" name="pay" checked={pay === p} onChange={() => setPay(p)} className="accent-[var(--c-accent)]" />
              <span className="t-body text-fg">
                {p === 'full' ? `Pay in full — ${eur(total)}` : `Deposit 30% now — ${eur(total * 0.3)}`}
              </span>
            </label>
          ))}
          <p className="t-caption normal-case tracking-normal text-fg-tertiary">
            Deposit: tokens are minted after full payment. Pay remainder by 15.09.2026.
          </p>
        </div>

        <Button full disabled={lot.soldOut} onClick={() => setOpen(true)}>
          {lot.soldOut ? 'Sold out' : 'Reserve allocation'}
        </Button>
      </div>

      <ReserveFlow lot={lot} qty={count} pay={pay} open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
