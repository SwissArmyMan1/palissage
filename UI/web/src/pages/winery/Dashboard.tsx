import { Plus, Landmark, Truck, Clock, ShieldCheck, User, ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { PageHeader } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { StatCard, SectionTitle } from '@/components/ui/primitives';
import { StatusBadge, type Tone } from '@/components/ui/StatusBadge';
import { Stagger, StaggerItem } from '@/components/layout/Page';
import { activity } from '@/lib/mock';

const stats = [
  { label: 'Total sales', value: '€86 400.00', delta: '↑ 12% vs last month', tone: 'success' as const },
  { label: 'In escrow', value: '€32 150.00', delta: '3 active offers', tone: 'muted' as const },
  { label: 'Available to withdraw', value: '€12 940.00', delta: 'Withdraw →', tone: 'muted' as const },
  { label: 'Bottles reserved', value: '4 870', delta: 'across 3 lots', tone: 'muted' as const, num: true },
];

const actions: { icon: ReactNode; text: string; cta: string; tone: 'success' | 'warning' }[] = [
  { icon: <Landmark size={18} />, text: 'Milestone “Harvest 30%” confirmed — €9 645.00 ready to withdraw', cta: 'Withdraw', tone: 'success' },
  { icon: <Truck size={18} />, text: 'Delivery requested: Cave Lumière · 2 400 bottles · Tour de Rissac 2021', cta: 'Mark shipped', tone: 'warning' },
  { icon: <Clock size={18} />, text: 'Helsinki Wine Co — remainder €12 096.00 due in 3 days (15.09.2026)', cta: 'View', tone: 'warning' },
];

const offers: { name: string; price: string; reserved: string; ends: string; tone: Tone; status: string }[] = [
  { name: 'A1353 Limousis 2022 — Standard', price: '€11.50', reserved: '1 760 / 2 400', ends: '12 Jul', tone: 'success', status: 'Active' },
  { name: 'A1353 Limousis 2026 — En Primeur', price: '€8.90', reserved: '2 400 / 10 000', ends: '30 Sep', tone: 'info', status: 'En Primeur' },
  { name: 'Demoiselle 2022 — Standard', price: '€9.40', reserved: '6 000 / 6 000', ends: 'Ended', tone: 'neutral', status: 'Closed' },
];

const activityIcons: Record<string, ReactNode> = {
  'shield-check': <ShieldCheck size={16} />,
  user: <User size={16} />,
  landmark: <Landmark size={16} />,
  truck: <Truck size={16} />,
};

export default function WineryDashboard() {
  return (
    <div>
      <PageHeader title="Dashboard" action={<Button icon={<Plus size={16} />}>Create offer</Button>} />

      <Stagger className="flex flex-col gap-8">
        <StaggerItem className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {stats.map((s) => (
            <StatCard key={s.label} label={s.label} value={s.value} delta={s.delta} deltaTone={s.tone} />
          ))}
        </StaggerItem>

        <StaggerItem className="flex flex-col gap-3">
          <SectionTitle>Action required</SectionTitle>
          <div className="card overflow-hidden">
            {actions.map((a, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3.5 [&:not(:first-child)]:border-t [&:not(:first-child)]:border-line">
                <span className={a.tone === 'success' ? 'text-success' : 'text-warning'}>{a.icon}</span>
                <span className="t-body flex-1 text-fg">{a.text}</span>
                <Button kind="secondary" size="sm">{a.cta}</Button>
              </div>
            ))}
          </div>
        </StaggerItem>

        <StaggerItem className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="flex flex-col gap-3">
            <SectionTitle>Active offers</SectionTitle>
            <div className="card overflow-hidden">
              <div className="hidden grid-cols-[1fr_80px_120px_70px_110px] items-center gap-3 bg-page-subtle px-4 py-2.5 md:grid">
                {['OFFER', 'PRICE', 'RESERVED / QTY', 'ENDS', 'STATUS'].map((h) => (
                  <span key={h} className="t-caption text-fg-secondary">{h}</span>
                ))}
              </div>
              {offers.map((o) => (
                <div key={o.name} className="grid grid-cols-1 items-center gap-1 border-t border-line px-4 py-3 md:grid-cols-[1fr_80px_120px_70px_110px] md:gap-3 md:py-2">
                  <span className="t-body-strong text-fg">{o.name}</span>
                  <span className="t-mono text-fg md:text-left">{o.price}</span>
                  <span className="t-mono text-fg-secondary">{o.reserved}</span>
                  <span className="t-small text-fg-secondary">{o.ends}</span>
                  <StatusBadge tone={o.tone}>{o.status}</StatusBadge>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <SectionTitle>Recent activity</SectionTitle>
            <div className="card overflow-hidden">
              {activity.map((a, i) => (
                <div key={i} className="flex items-start gap-3 px-4 py-3 [&:not(:first-child)]:border-t [&:not(:first-child)]:border-line">
                  <span className="mt-0.5 text-fg-secondary">{activityIcons[a.icon]}</span>
                  <div className="flex-1">
                    <p className="t-small text-fg">{a.text}</p>
                    <p className="t-caption normal-case tracking-normal text-fg-tertiary">{a.time}</p>
                  </div>
                  <ChevronRight size={16} className="text-fg-tertiary" />
                </div>
              ))}
            </div>
          </div>
        </StaggerItem>
      </Stagger>
    </div>
  );
}
