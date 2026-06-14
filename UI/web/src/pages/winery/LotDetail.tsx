import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { LotPhoto } from '@/components/ui/LotCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Tabs } from '@/components/ui/Tabs';
import { Stepper, type Step } from '@/components/ui/Stepper';
import { SectionTitle, OnchainRow } from '@/components/ui/primitives';
import { wineryLots, PRODUCTION_STEPS, qty } from '@/lib/mock';

export default function WineryLotDetail() {
  const { id } = useParams();
  const lot = wineryLots.find((l) => l.id === id) ?? wineryLots[0];
  const [tab, setTab] = useState('Overview');

  const currentIdx = PRODUCTION_STEPS.indexOf(lot.production);
  const steps: Step[] = PRODUCTION_STEPS.map((label, i) => ({
    label,
    state: i < currentIdx ? 'done' : i === currentIdx ? 'current' : 'future',
  }));

  const fields: [string, string, boolean][] = [
    ['Grapes', lot.grapes, false],
    ['Alcohol', lot.alcohol + ' vol', false],
    ['Bottle size', lot.bottleMl + ' ml', false],
    ['Total bottles', qty(lot.total), true],
    ['Minted / redeemed', `${qty(lot.minted)} / ${qty(lot.redeemed)}`, true],
    ['Royalty on secondary', `${(lot.royaltyBps / 100).toFixed(1)}% (${lot.royaltyBps} bps)`, true],
    ['Export availability', lot.exportTo.join(' · ') + ' ✓', false],
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <LotPhoto src={lot.img} alt={lot.name} className="h-32 w-44 shrink-0" />
        <div className="flex flex-1 flex-col gap-2">
          <h1 className="t-display text-fg">{lot.name}</h1>
          <p className="t-body text-fg-secondary">
            {lot.vintage} · {lot.region} · {lot.winery}
          </p>
          <div className="flex flex-wrap gap-2">
            <StatusBadge tone={lot.status === 'Verified' ? 'success' : 'neutral'}>
              {lot.status === 'Verified' ? 'Verified ✓' : lot.status}
            </StatusBadge>
            <StatusBadge tone="info">{lot.production}</StatusBadge>
          </div>
        </div>
        <div className="flex gap-2 md:flex-col">
          <Button>{lot.status === 'Draft' ? 'Submit for verification' : 'Create offer'}</Button>
          <Button kind="ghost">Edit</Button>
        </div>
      </div>

      <Tabs items={['Overview', 'Documents', 'Offers', 'History']} value={tab} onChange={setTab} />

      {tab === 'Overview' && (
        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <div className="card overflow-hidden">
            {fields.map(([label, value, mono], i) => (
              <div key={label} className={`flex items-center gap-4 px-5 py-3 ${i > 0 ? 'border-t border-line' : ''}`}>
                <span className="t-small w-48 shrink-0 text-fg-secondary">{label}</span>
                <span className={mono ? 't-mono text-fg' : 't-body text-fg'}>{value}</span>
              </div>
            ))}
            <div className="border-t border-line p-3">
              <OnchainRow>
                <ChevronRight size={16} /> Onchain details — tokenId 4 · docsHash 0x8f3a…c91d · verifier 0x71bE…04D8
              </OnchainRow>
            </div>
          </div>

          <div className="card flex flex-col gap-4 p-5">
            <SectionTitle>Production progress</SectionTitle>
            <Stepper steps={steps} direction="vertical" />
            <Button kind="secondary" size="sm">Advance status</Button>
          </div>
        </div>
      )}

      {tab !== 'Overview' && (
        <div className="card p-8 text-center">
          <p className="t-body text-fg-secondary">
            {tab === 'Documents' && 'Documents, sha256 hashes and verifier signature.'}
            {tab === 'Offers' && 'Standard & En Primeur offers for this lot.'}
            {tab === 'History' && 'created → verified → offer created → reserved → milestone released.'}
          </p>
        </div>
      )}
    </div>
  );
}
