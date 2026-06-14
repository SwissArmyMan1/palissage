import { ShieldCheck, ChevronRight, Wine, Award, Gift } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { LotPhoto } from '@/components/ui/LotCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Stagger, StaggerItem } from '@/components/layout/Page';
import { img } from '@/lib/mock';

const benefits = [
  { icon: <Wine size={18} />, text: 'Personal wine passport — your collection in one place' },
  { icon: <Award size={18} />, text: 'Achievements & levels for every scan' },
  { icon: <Gift size={18} />, text: 'Rewards: every 10th bottle of this wine is free' },
];

export default function ScanLanding() {
  return (
    <>
      <Stagger className="flex flex-col gap-4 pb-4">
        <StaggerItem>
          <LotPhoto src={img.boticaRissac} alt="Tour de Rissac" className="aspect-[3/2] w-full" />
        </StaggerItem>

        <StaggerItem className="flex flex-col gap-3">
          <h1 className="t-display text-fg">Tour de Rissac — Cabardès 2021</h1>
          <div className="flex items-center gap-2.5">
            <span className="h-8 w-8 overflow-hidden rounded-full">
              <img src={img.rissacDomain} alt="" className="h-full w-full object-cover" />
            </span>
            <span className="t-small-strong text-fg">Château Tour de Rissac</span>
            <StatusBadge tone="success">Verified</StatusBadge>
          </div>

          <div className="flex flex-col gap-1.5 rounded-lg bg-success-subtle px-4 py-3.5">
            <div className="flex items-center gap-2">
              <ShieldCheck size={18} className="text-success" />
              <span className="t-small-strong text-success">Authentic bottle ✓</span>
            </div>
            <span className="t-small text-fg">Bottle #0482 of 10 000 · verified by Palissage</span>
            <span className="flex items-center gap-1.5 t-caption normal-case tracking-normal text-fg-tertiary">
              <ChevronRight size={14} /> Onchain details
            </span>
          </div>

          <Button full>Add to your Wine Passport</Button>

          <div className="flex flex-col gap-2.5">
            {benefits.map((b) => (
              <div key={b.text} className="flex items-center gap-2.5">
                <span className="text-accent">{b.icon}</span>
                <span className="t-small text-fg">{b.text}</span>
              </div>
            ))}
          </div>
        </StaggerItem>

        <StaggerItem className="flex flex-col gap-3 pt-2">
          <LotPhoto src={img.rissacVineyard} alt="Vineyard" fit="cover" className="aspect-[16/9] w-full" />
          <h2 className="t-h2 text-fg">Between Montagne Noire and the Pyrenees</h2>
          <p className="t-body text-fg-secondary">
            Château Tour de Rissac has farmed the slopes of Moussoulens since 1453. Cabardès is
            the only French AOP that blends Atlantic varieties (Cabernet, Merlot) with
            Mediterranean Syrah and Grenache — a bridge between Bordeaux and the Rhône in one glass.
          </p>
        </StaggerItem>
      </Stagger>
    </>
  );
}
