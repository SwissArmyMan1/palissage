import { Gift, Lock, Wine } from 'lucide-react';
import type { ReactNode } from 'react';
import { StatusBadge } from './StatusBadge';
import { Button } from './Button';
import { LotPhoto } from './LotCard';
import type { Achievement, Quest, Scan } from '@/lib/mock';
import { cn } from '@/lib/cn';

/* ---- PassportHeader ---- */
export function PassportHeader() {
  return (
    <div className="card flex flex-col gap-3 p-4">
      <div className="flex items-center gap-3">
        <span className="grid h-16 w-16 place-items-center rounded-full bg-accent-subtle t-h2 text-accent">E</span>
        <div className="flex flex-col gap-1">
          <span className="t-h2 text-fg">Etienne</span>
          <StatusBadge tone="gold">Level 3 · Connoisseur</StatusBadge>
        </div>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-page-subtle">
        <div className="h-full rounded-full bg-gold" style={{ width: '60%' }} />
      </div>
      <span className="t-caption normal-case tracking-normal text-fg-secondary">120 / 200 XP to Level 4</span>
      <div className="flex">
        {[['12', 'Wines'], ['5', 'Wineries'], ['3', 'Countries']].map(([n, l]) => (
          <div key={l} className="flex flex-1 flex-col items-center">
            <span className="t-h2 text-fg">{n}</span>
            <span className="t-caption normal-case tracking-normal text-fg-secondary">{l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---- QuestCard ---- */
export function QuestCard({ quest }: { quest: Quest }) {
  const done = quest.state === 'completed';
  return (
    <div className={cn('card flex gap-3 p-4', done && 'border-success')}>
      <Gift size={24} className={done ? 'text-success' : 'text-accent'} />
      <div className="flex flex-1 flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <span className="t-body-strong flex-1 text-fg">{quest.title}</span>
          <StatusBadge tone="gold">Reward: {quest.reward}</StatusBadge>
        </div>
        <p className="t-small text-fg-secondary">{quest.desc}</p>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-page-subtle">
          <div
            className={cn('h-full rounded-full', done ? 'bg-success' : 'bg-accent')}
            style={{ width: `${quest.progress * 100}%` }}
          />
        </div>
        <span className={cn('t-caption normal-case tracking-normal', done ? 'text-success' : 'text-fg-secondary')}>
          {quest.label}
        </span>
        {done && <Button size="sm" className="mt-1 self-start">Claim reward</Button>}
      </div>
    </div>
  );
}

/* ---- AchievementBadge ---- */
export function AchievementBadge({ a, icon }: { a: Achievement; icon?: ReactNode }) {
  const pct = a.state === 'inProgress' ? progressFrom(a.sub) : 0;
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <div className="relative grid h-24 w-24 place-items-center">
        {a.state === 'inProgress' ? (
          <span
            className="absolute inset-0 rounded-full"
            style={{ background: `conic-gradient(var(--c-accent) ${pct}%, var(--c-line) 0)` }}
          >
            <span className="absolute inset-[3px] rounded-full bg-page" />
          </span>
        ) : (
          <span
            className={cn(
              'absolute inset-0 rounded-full border-[3px]',
              a.state === 'unlocked' ? 'border-gold bg-gold-subtle' : 'border-line bg-page-subtle',
            )}
          />
        )}
        <span
          className={cn(
            'relative',
            a.state === 'unlocked' ? 'text-gold' : a.state === 'inProgress' ? 'text-fg-secondary' : 'text-fg-tertiary',
          )}
        >
          {icon ?? <Wine size={32} />}
        </span>
        {a.state === 'locked' && (
          <span className="absolute bottom-0 right-0 grid h-6 w-6 place-items-center rounded-full border border-line bg-surface">
            <Lock size={12} className="text-fg-tertiary" />
          </span>
        )}
      </div>
      <span className={cn('t-body-strong', a.state === 'locked' ? 'text-fg-tertiary' : 'text-fg')}>{a.name}</span>
      <span
        className={cn(
          't-caption normal-case tracking-normal',
          a.state === 'unlocked' ? 'text-gold' : a.state === 'inProgress' ? 'text-info' : 'text-fg-tertiary',
        )}
      >
        {a.sub}
      </span>
    </div>
  );
}

function progressFrom(sub: string): number {
  const m = sub.match(/(\d+)\s*\/\s*(\d+)/);
  if (!m) return 50;
  return (Number(m[1]) / Number(m[2])) * 100;
}

/* ---- BottleScanCard ---- */
export function BottleScanCard({ scan }: { scan: Scan }) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-line bg-surface p-3">
      <LotPhoto src={scan.img} alt={scan.name} className="h-16 w-16 shrink-0" />
      <div className="flex-1">
        <p className="t-body-strong text-fg">{scan.name}</p>
        <p className="t-small text-fg-secondary">{scan.winery}</p>
        <p className="t-caption normal-case tracking-normal text-fg-tertiary">{scan.date}</p>
      </div>
      {scan.reward && <span className="h-2.5 w-2.5 rounded-full bg-gold" />}
    </div>
  );
}

/* ---- VoucherCard ---- */
export function VoucherCard() {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-gold bg-gold-subtle p-4">
      <div className="grid h-12 w-12 place-items-center rounded-md bg-surface">
        <div className="grid grid-cols-3 grid-rows-3 gap-0.5">
          {Array.from({ length: 9 }).map((_, i) => (
            <span key={i} className={cn('h-1.5 w-1.5', [0, 2, 4, 5, 8].includes(i) ? 'bg-fg' : 'bg-transparent')} />
          ))}
        </div>
      </div>
      <div className="flex-1">
        <p className="t-body-strong text-fg">Free bottle voucher</p>
        <p className="t-small text-fg-secondary">A1353 Limousis 2022 · show at partner store</p>
      </div>
    </div>
  );
}
