import { useState } from 'react';
import { PageHeader } from '@/components/layout/DashboardLayout';
import { Tabs } from '@/components/ui/Tabs';
import { Button } from '@/components/ui/Button';
import { StatCard } from '@/components/ui/primitives';
import { StatusBadge, type Tone } from '@/components/ui/StatusBadge';
import { Stagger, StaggerItem } from '@/components/layout/Page';
import { allocations, eur, qty, type Allocation } from '@/lib/mock';

const stateMap: Record<Allocation['state'], { tone: Tone; label: string }> = {
  Paid: { tone: 'success', label: 'Paid · tokens minted' },
  Reserved: { tone: 'warning', label: 'Reserved · deposit paid' },
  Defaulted: { tone: 'danger', label: 'Defaulted' },
  Cancelled: { tone: 'neutral', label: 'Cancelled' },
};

export default function Portfolio() {
  const [tab, setTab] = useState('Allocations');
  return (
    <div>
      <PageHeader title="Portfolio" />

      <Stagger className="flex flex-col gap-6">
        <StaggerItem className="grid gap-4 md:grid-cols-3">
          <StatCard label="Portfolio value" value="€38 250.00" delta="at reservation prices" deltaTone="muted" />
          <StatCard label="Bottles owned" value="5 100" delta="3 lots" deltaTone="muted" />
          <StatCard label="Pending payments" value="€12 458.88" delta="due 15.09.2026" deltaTone="warning" />
        </StaggerItem>

        <StaggerItem>
          <Tabs items={['Allocations', 'Tokens', 'Deliveries']} value={tab} onChange={setTab} />
        </StaggerItem>

        {tab === 'Allocations' && (
          <StaggerItem className="card overflow-hidden">
            <div className="hidden grid-cols-[1fr_150px_70px_180px_100px_180px_130px] items-center gap-4 bg-page-subtle px-4 py-2.5 md:grid">
              {['LOT', 'WINERY', 'QTY', 'PAID OF TOTAL', 'DEADLINE', 'STATUS', 'ACTION'].map((h, i) => (
                <span key={h} className={`t-caption text-fg-secondary ${i === 2 || i === 3 || i === 6 ? 'text-right' : ''}`}>{h}</span>
              ))}
            </div>
            {allocations.map((a) => (
              <div key={a.lot} className="grid grid-cols-1 gap-2 border-t border-line px-4 py-3 md:grid-cols-[1fr_150px_70px_180px_100px_180px_130px] md:items-center md:gap-4">
                <div className="flex items-center justify-between md:block">
                  <span className="t-body-strong text-fg">{a.lot}</span>
                  <span className="md:hidden">{<StatusBadge tone={stateMap[a.state].tone}>{stateMap[a.state].label}</StatusBadge>}</span>
                </div>
                <span className="t-small text-fg-secondary">{a.winery}</span>
                <span className="t-mono text-fg md:text-right">{qty(a.qty)}</span>
                <span className="t-mono text-fg md:text-right">{eur(a.paid)} / {eur(a.total)}</span>
                <span className={`t-small ${a.deadline ? 'text-warning' : 'text-fg-secondary'}`}>{a.deadline ?? '—'}</span>
                <span className="hidden md:flex"><StatusBadge tone={stateMap[a.state].tone}>{stateMap[a.state].label}</StatusBadge></span>
                <span className="flex md:justify-end">
                  {a.action && <Button kind="secondary" size="sm">{a.action}</Button>}
                </span>
              </div>
            ))}
          </StaggerItem>
        )}

        {tab !== 'Allocations' && (
          <StaggerItem className="card p-8 text-center">
            <p className="t-body text-fg-secondary">
              {tab === 'Tokens'
                ? 'Token balances per lot. Frozen tokens appear as a danger row with a snowflake.'
                : 'Redemption requests with a Requested → Shipped → Delivered stepper.'}
            </p>
          </StaggerItem>
        )}

        <StaggerItem>
          <p className="t-caption normal-case tracking-normal text-danger">
            Defaulted: full payment was not received by the deadline — the deposit is forfeited to the winery (protocol fee deducted).
          </p>
        </StaggerItem>
      </Stagger>
    </div>
  );
}
