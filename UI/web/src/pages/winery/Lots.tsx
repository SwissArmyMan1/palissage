import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Check } from 'lucide-react';
import { PageHeader } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';
import { Chips } from '@/components/ui/Tabs';
import { ResponsiveTable, type Column } from '@/components/ui/Table';
import { LotPhoto } from '@/components/ui/LotCard';
import { StatusBadge, type Tone } from '@/components/ui/StatusBadge';
import { SectionTitle } from '@/components/ui/primitives';
import { wineryLots, qty, type Lot } from '@/lib/mock';
import { zoneLink } from '@/lib/zone';
import { useSession } from '@/lib/session';
import { useChainTx } from '@/lib/tx';
import { useOnchainLots } from '@/lib/lots';
import { contracts } from '@/contracts';

const statusTone: Record<string, Tone> = {
  Verified: 'success',
  Draft: 'neutral',
  Suspended: 'danger',
  Closed: 'neutral',
};

/** Live on-chain lots for the connected winery + an on-chain "create lot" form. */
function LiveLots() {
  const { account, role, gatewayConfigured } = useSession();
  const { lots, refetch } = useOnchainLots();
  const { send, pending, error, clearError } = useChainTx();
  const [form, setForm] = useState({ name: '', region: '', grapes: '', totalBottles: '', vintage: '2024' });
  const [done, setDone] = useState(false);

  if (!gatewayConfigured || role !== 'winery') return null;

  const mine = lots.filter((l) => account && l.winery.toLowerCase() === account.toLowerCase());
  const totalBottles = Number(form.totalBottles);
  const vintage = Number(form.vintage);
  const valid = form.name.trim() !== '' && totalBottles > 0 && vintage > 0;

  const create = async () => {
    clearError();
    setDone(false);
    const ok = await send({
      ...contracts.wineLotToken,
      functionName: 'createLot',
      args: [
        {
          totalBottles,
          vintage,
          royaltyBps: 250,
          bottleSizeMl: 750,
          exportAllowed: true,
          name: form.name.trim(),
          region: form.region.trim(),
          grapes: form.grapes.trim(),
          metadataURI: '',
        },
      ],
    });
    if (ok) {
      setDone(true);
      setForm({ name: '', region: '', grapes: '', totalBottles: '', vintage: '2024' });
      refetch();
    }
  };

  return (
    <div className="mb-6 flex flex-col gap-4">
      <div className="card flex flex-col gap-4 p-5">
        <SectionTitle>Create a lot (on-chain)</SectionTitle>
        <div className="grid gap-3 md:grid-cols-2">
          <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input label="Region" value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} />
          <Input label="Grapes" value={form.grapes} onChange={(e) => setForm({ ...form, grapes: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Total bottles"
              inputMode="numeric"
              value={form.totalBottles}
              onChange={(e) => setForm({ ...form, totalBottles: e.target.value.replace(/\D/g, '') })}
            />
            <Input
              label="Vintage"
              inputMode="numeric"
              value={form.vintage}
              onChange={(e) => setForm({ ...form, vintage: e.target.value.replace(/\D/g, '') })}
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button icon={<Plus size={16} />} loading={pending} disabled={!valid} onClick={create}>
            Create lot
          </Button>
          {done && (
            <span className="inline-flex items-center gap-1.5 t-small text-success">
              <Check size={16} /> Lot created on-chain
            </span>
          )}
          {error && <span className="t-small text-danger">{error}</span>}
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="bg-page-subtle px-4 py-2.5">
          <SectionTitle>My on-chain lots ({mine.length})</SectionTitle>
        </div>
        {mine.length === 0 ? (
          <p className="px-4 py-4 t-small text-fg-secondary">No on-chain lots yet — create one above.</p>
        ) : (
          mine.map((l) => (
            <div
              key={l.id}
              className="grid grid-cols-1 items-center gap-2 border-t border-line px-4 py-3 md:grid-cols-[40px_1fr_150px_130px_120px] md:gap-4"
            >
              <span className="t-mono text-fg-secondary">#{l.id}</span>
              <span className="t-body-strong text-fg">{l.name}</span>
              <span className="t-small text-fg-secondary">{l.region}</span>
              <StatusBadge tone={statusTone[l.statusLabel]}>
                {l.statusLabel === 'Verified' ? 'Verified ✓' : l.statusLabel}
              </StatusBadge>
              <span className="t-mono text-fg md:text-right">{qty(l.totalBottles)} btl</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

const columns: Column<Lot>[] = [
  {
    key: 'lot',
    header: 'Lot',
    width: '1fr',
    primary: true,
    cell: (l) => (
      <div className="flex items-center gap-3">
        <LotPhoto src={l.img} alt={l.name} className="h-10 w-10 shrink-0" />
        <span className="t-body-strong text-fg">{l.name}</span>
      </div>
    ),
  },
  { key: 'region', header: 'Region', width: '150px', card: true, cell: (l) => <span className="t-small text-fg-secondary">{l.region}</span> },
  {
    key: 'status',
    header: 'Status',
    width: '130px',
    cell: (l) => <StatusBadge tone={statusTone[l.status]}>{l.status === 'Verified' ? 'Verified ✓' : l.status}</StatusBadge>,
  },
  { key: 'production', header: 'Production', width: '150px', cell: (l) => <StatusBadge tone="info">{l.production}</StatusBadge> },
  {
    key: 'bottles',
    header: 'Bottles m/r/t',
    width: '160px',
    align: 'right',
    card: true,
    cell: (l) => (
      <span className="t-mono text-fg">{qty(l.minted)} / {qty(l.redeemed)} / {qty(l.total)}</span>
    ),
  },
];

const filters = ['All', 'Draft', 'Verified', 'Suspended', 'Closed'];

export default function WineryLots() {
  const [filter, setFilter] = useState('All');
  const navigate = useNavigate();
  const rows = wineryLots.filter((l) => filter === 'All' || l.status === filter);

  return (
    <div>
      <PageHeader title="Wine lots" action={<Button icon={<Plus size={16} />}>New lot</Button>} />
      <LiveLots />
      <div className="mb-4">
        <Chips items={filters} value={filter} onChange={setFilter} />
      </div>
      <ResponsiveTable
        columns={columns}
        rows={rows}
        rowKey={(l) => l.id}
        onRowClick={(l) => navigate(zoneLink('winery', `/lots/${l.id}`))}
      />
    </div>
  );
}
