import { Wine, Landmark, ChevronRight, ShieldCheck, User, Snowflake } from 'lucide-react';
import type { ReactNode } from 'react';
import { PageHeader } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { StatCard, SectionTitle } from '@/components/ui/primitives';
import { Stagger, StaggerItem } from '@/components/layout/Page';

const stats = [
  { label: 'TVL in escrow', value: '€214 500', delta: 'across 9 offers' },
  { label: 'Protocol revenue · 30d', value: '€6 320', delta: '↑ 8% vs prior 30d', tone: 'success' as const },
  { label: 'Active lots', value: '24', delta: '4 awaiting verification' },
  { label: 'Participants', value: '61', delta: '3 pending claims' },
];

const lotsQueue = [
  'Château Deumié — Cabardès 2022 · submitted 12.06.2026',
  'La Mijane — Galéa Blanc 2025 · submitted 09.06.2026',
  'Villemartin — Cadix 2023 · submitted 08.06.2026',
];
const msQueue = [
  'Villemartin 2026 EP — “Bottling 40%” · €12 860.00',
  'A1353 Limousis 2026 — “Delivery 30%” · €8 820.00',
];

const events: { icon: ReactNode; ev: string; detail: string; time: string; danger?: boolean }[] = [
  { icon: <ShieldCheck size={16} />, ev: 'LotVerified', detail: 'lotId 7 · Demoiselle 2022 · verifier 0x71bE…04D8', time: '2h ago' },
  { icon: <User size={16} />, ev: 'AllocationCreated', detail: 'offerId 12 · buyer 0x3Fa4…9C21 · 2 400 × €7.20', time: '5h ago' },
  { icon: <Landmark size={16} />, ev: 'MilestoneReleased', detail: 'offerId 9 · Harvest 30% · €9 645.00 → winery', time: '1d ago' },
  { icon: <Snowflake size={16} />, ev: 'TokensFrozen', detail: 'account 0x9921…aa01 · lotId 3 · 1 200 bottles', time: '2d ago', danger: true },
];

function QueueCard({ title, rows, cta, icon }: { title: string; rows: string[]; cta: string; icon: ReactNode }) {
  return (
    <div className="card flex flex-col gap-3 p-5">
      <SectionTitle>{title}</SectionTitle>
      {rows.map((r) => (
        <div key={r} className="flex items-center gap-2.5">
          <span className="text-fg-secondary">{icon}</span>
          <span className="t-small flex-1 text-fg">{r}</span>
          <ChevronRight size={16} className="text-fg-tertiary" />
        </div>
      ))}
      <Button kind="secondary" size="sm" className="self-start">{cta}</Button>
    </div>
  );
}

export default function AdminOverview() {
  return (
    <div>
      <PageHeader title="Protocol overview" />
      <Stagger className="flex flex-col gap-8">
        <StaggerItem className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {stats.map((s) => (
            <StatCard key={s.label} label={s.label} value={s.value} delta={s.delta} deltaTone={(s as { tone?: 'success' }).tone ?? 'muted'} />
          ))}
        </StaggerItem>

        <StaggerItem className="grid gap-6 md:grid-cols-2">
          <QueueCard title="Lots awaiting verification (3)" rows={lotsQueue} cta="Open verification queue" icon={<Wine size={16} />} />
          <QueueCard title="Milestones awaiting confirmation (2)" rows={msQueue} cta="Review milestones" icon={<Landmark size={16} />} />
        </StaggerItem>

        <StaggerItem className="flex flex-col gap-3">
          <SectionTitle>Latest protocol events</SectionTitle>
          <div className="card overflow-hidden">
            {events.map((e) => (
              <div key={e.ev} className="flex items-center gap-3 px-4 py-3 [&:not(:first-child)]:border-t [&:not(:first-child)]:border-line">
                <span className={e.danger ? 'text-danger' : 'text-fg-secondary'}>{e.icon}</span>
                <span className={`t-small-strong w-40 shrink-0 ${e.danger ? 'text-danger' : 'text-fg'}`}>{e.ev}</span>
                <span className="t-mono flex-1 truncate text-fg-secondary">{e.detail}</span>
                <span className="t-caption normal-case tracking-normal text-fg-tertiary">{e.time}</span>
              </div>
            ))}
          </div>
        </StaggerItem>
      </Stagger>
    </div>
  );
}
