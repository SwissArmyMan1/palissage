import { useState } from 'react';
import { Filter } from 'lucide-react';
import { PageHeader } from '@/components/layout/DashboardLayout';
import { Tabs } from '@/components/ui/Tabs';
import { SearchInput, Select } from '@/components/ui/Field';
import { LotCard, LotCardSkeleton } from '@/components/ui/LotCard';
import { Stagger, StaggerItem } from '@/components/layout/Page';
import { marketplaceLots } from '@/lib/mock';
import { zoneLink } from '@/lib/zone';

export default function Marketplace() {
  const [market, setMarket] = useState('Primary market');
  const [loading] = useState(false);

  return (
    <div>
      <PageHeader title="Marketplace" />

      <div className="mb-4">
        <Tabs items={['Primary market', 'Secondary market']} value={market} onChange={setMarket} />
      </div>

      {/* filters: desktop row, mobile compact */}
      <div className="mb-4 hidden items-end gap-3 md:flex">
        <SearchInput placeholder="Search lots, wineries…" className="flex-1" />
        <Select label="Region" className="w-44"><option>All regions</option><option>Cabardès AOP</option><option>Limoux AOP</option></Select>
        <Select label="Vintage" className="w-40"><option>All vintages</option><option>2021</option><option>2022</option><option>2025</option></Select>
        <Select label="Type" className="w-40"><option>All types</option><option>Standard</option><option>En Primeur</option></Select>
      </div>
      <div className="mb-4 flex items-center gap-3 md:hidden">
        <span className="t-small flex-1 text-fg-secondary">6 lots · Newest first</span>
        <button className="flex items-center gap-2 rounded-full border border-line-strong px-3.5 py-2 t-small-strong text-fg">
          <Filter size={16} /> Filters
        </button>
      </div>
      <p className="mb-4 hidden t-small text-fg-secondary md:block">6 verified lots · sorted by newest</p>

      {loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => <LotCardSkeleton key={i} />)}
        </div>
      ) : (
        <Stagger className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {marketplaceLots.map((lot) => (
            <StaggerItem key={lot.id} className="h-full">
              <LotCard lot={lot} to={zoneLink('shop', `/lot/${lot.id}`)} />
            </StaggerItem>
          ))}
        </Stagger>
      )}
    </div>
  );
}
