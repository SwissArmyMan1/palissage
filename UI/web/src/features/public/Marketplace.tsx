import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { ProductionStatus } from '@/domain/types';
import { useI18n } from '@/app/i18n-context';
import { useEnvironment, useFocusHeading } from '@/app/environment-context';
import { catalogue, type CatalogueEntry } from '@/app/selectors';
import { parseAmount, units } from '@/domain/money';
import { LotCard } from '@/components/trade/LotCard';
import { Button } from '@/components/ui/Button';
import { Drawer } from '@/components/ui/Dialog';
import { EmptyState } from '@/components/ui/Feedback';
import { SelectField, TextField } from '@/components/ui/Field';
import { StatusBadge } from '@/components/ui/StatusBadge';

const PAGE_SIZE = 12;

type Filters = {
  q: string;
  type: 'all' | 'available' | 'enprimeur';
  producer: string;
  region: string;
  vintage: string;
  production: string;
  min: string;
  max: string;
  reviewed: boolean;
  sort: 'featured' | 'priceAsc' | 'priceDesc' | 'readiness';
  page: number;
};

function readFilters(params: URLSearchParams): Filters {
  return {
    q: params.get('q') ?? '',
    type: (params.get('type') as Filters['type']) ?? 'all',
    producer: params.get('producer') ?? '',
    region: params.get('region') ?? '',
    vintage: params.get('vintage') ?? '',
    production: params.get('production') ?? '',
    min: params.get('min') ?? '',
    max: params.get('max') ?? '',
    reviewed: params.get('reviewed') === '1',
    sort: (params.get('sort') as Filters['sort']) ?? 'featured',
    page: Math.max(Number(params.get('page') ?? '1') || 1, 1),
  };
}

function writeFilters(filters: Filters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.q) params.set('q', filters.q);
  if (filters.type !== 'all') params.set('type', filters.type);
  if (filters.producer) params.set('producer', filters.producer);
  if (filters.region) params.set('region', filters.region);
  if (filters.vintage) params.set('vintage', filters.vintage);
  if (filters.production) params.set('production', filters.production);
  if (filters.min) params.set('min', filters.min);
  if (filters.max) params.set('max', filters.max);
  if (filters.reviewed) params.set('reviewed', '1');
  if (filters.sort !== 'featured') params.set('sort', filters.sort);
  if (filters.page > 1) params.set('page', String(filters.page));
  return params;
}

/**
 * PUB-02 / SYS-07. Filters, sort and page live in the query string, so the
 * catalogue is shareable and Back restores exactly what was on screen.
 */
export function MarketplaceView({ basePath = '/lots', title }: { basePath?: string; title?: string }) {
  const { d, locale, fmt, formatNumber } = useI18n();
  const { ledger } = useEnvironment();
  const [params, setParams] = useSearchParams();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const filters = readFilters(params);
  useFocusHeading(title ?? d.marketplace.title);

  const entries = useMemo(() => catalogue(ledger), [ledger]);

  const producers = useMemo(
    () => Array.from(new Set(entries.map((entry) => entry.producerName))).sort(),
    [entries],
  );
  const regions = useMemo(() => Array.from(new Set(entries.map((entry) => entry.lot.region))).sort(), [entries]);
  const vintages = useMemo(
    () => Array.from(new Set(entries.map((entry) => entry.lot.vintage))).sort((a, b) => b - a),
    [entries],
  );

  const update = (next: Partial<Filters>) => {
    setParams(writeFilters({ ...filters, page: 1, ...next }), { replace: false });
  };

  const filtered = useMemo(() => {
    const min = filters.min ? parseAmount(filters.min, 18, locale) : undefined;
    const max = filters.max ? parseAmount(filters.max, 18, locale) : undefined;
    const query = filters.q.trim().toLowerCase();
    const result = entries.filter((entry) => {
      if (query) {
        const haystack = `${entry.lot.name} ${entry.producerName} ${entry.lot.region}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      // "Available now" means an open standard offer; readiness is a separate
      // production filter and the two are never merged.
      if (filters.type === 'available' && !(entry.state === 'open' && entry.offer?.kind === 'Standard')) return false;
      if (filters.type === 'enprimeur' && entry.offer?.kind !== 'EnPrimeur') return false;
      if (filters.producer && entry.producerName !== filters.producer) return false;
      if (filters.region && entry.lot.region !== filters.region) return false;
      if (filters.vintage && String(entry.lot.vintage) !== filters.vintage) return false;
      if (filters.production && entry.lot.production !== filters.production) return false;
      if (filters.reviewed && entry.lot.status !== 'Verified') return false;
      if (entry.offer) {
        const price = units(entry.offer.pricePerBottle);
        if (min?.ok && price < min.units) return false;
        if (max?.ok && price > max.units) return false;
      }
      return true;
    });

    const readiness = (entry: CatalogueEntry) =>
      Date.parse(entry.presentation?.expectedAvailability?.value ?? '2100-01-01T00:00:00Z');
    // A lot without an offer sorts last on price rather than as free.
    const price = (entry: CatalogueEntry) => (entry.offer ? units(entry.offer.pricePerBottle) : -1n);
    const byPrice = (a: bigint, b: bigint) => (a < b ? -1 : a > b ? 1 : 0);

    switch (filters.sort) {
      case 'priceAsc':
        return [...result].sort((a, b) => byPrice(price(a), price(b)));
      case 'priceDesc':
        return [...result].sort((a, b) => byPrice(price(b), price(a)));
      case 'readiness':
        return [...result].sort((a, b) => readiness(a) - readiness(b));
      default:
        // Featured is a fixed curated order from the fixture, not personalisation.
        return result;
    }
  }, [entries, filters, locale]);

  const totalPages = Math.max(Math.ceil(filtered.length / PAGE_SIZE), 1);
  const page = Math.min(filters.page, totalPages);
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const activeChips = [
    filters.producer && { key: 'producer', label: filters.producer, clear: { producer: '' } },
    filters.region && { key: 'region', label: filters.region, clear: { region: '' } },
    filters.vintage && { key: 'vintage', label: filters.vintage, clear: { vintage: '' } },
    filters.production && {
      key: 'production',
      label: d.status.production[filters.production as ProductionStatus],
      clear: { production: '' },
    },
    filters.min && { key: 'min', label: `${d.marketplace.filters.min} ${filters.min}`, clear: { min: '' } },
    filters.max && { key: 'max', label: `${d.marketplace.filters.max} ${filters.max}`, clear: { max: '' } },
    filters.reviewed && { key: 'reviewed', label: d.marketplace.filters.verifiedOnly, clear: { reviewed: false } },
  ].filter(Boolean) as { key: string; label: string; clear: Partial<Filters> }[];

  const filterControls = (
    <div className="flex flex-col gap-4">
      <SelectField
        label={d.marketplace.filters.producer}
        value={filters.producer}
        onChange={(event) => update({ producer: event.target.value })}
      >
        <option value="">{d.marketplace.filters.any}</option>
        {producers.map((producer) => (
          <option key={producer} value={producer}>
            {producer}
          </option>
        ))}
      </SelectField>
      <SelectField
        label={d.marketplace.filters.region}
        value={filters.region}
        onChange={(event) => update({ region: event.target.value })}
      >
        <option value="">{d.marketplace.filters.any}</option>
        {regions.map((region) => (
          <option key={region} value={region}>
            {region}
          </option>
        ))}
      </SelectField>
      <SelectField
        label={d.marketplace.filters.vintage}
        value={filters.vintage}
        onChange={(event) => update({ vintage: event.target.value })}
      >
        <option value="">{d.marketplace.filters.any}</option>
        {vintages.map((vintage) => (
          <option key={vintage} value={String(vintage)}>
            {vintage}
          </option>
        ))}
      </SelectField>
      <SelectField
        label={d.marketplace.filters.production}
        value={filters.production}
        onChange={(event) => update({ production: event.target.value })}
      >
        <option value="">{d.marketplace.filters.any}</option>
        {(Object.keys(d.status.production) as ProductionStatus[]).map((stage) => (
          <option key={stage} value={stage}>
            {d.status.production[stage]}
          </option>
        ))}
      </SelectField>
      <fieldset className="grid grid-cols-2 gap-3">
        <legend className="label mb-1.5">{d.marketplace.filters.price}</legend>
        <TextField
          label={d.marketplace.filters.min}
          inputMode="decimal"
          value={filters.min}
          placeholder={locale === 'fr' ? '8,00' : '8.00'}
          onChange={(event) => update({ min: event.target.value })}
        />
        <TextField
          label={d.marketplace.filters.max}
          inputMode="decimal"
          value={filters.max}
          placeholder={locale === 'fr' ? '12,00' : '12.00'}
          onChange={(event) => update({ max: event.target.value })}
        />
      </fieldset>
      <label className="flex items-center gap-3 text-sm">
        <input
          type="checkbox"
          checked={filters.reviewed}
          onChange={(event) => update({ reviewed: event.target.checked })}
          className="h-5 w-5 accent-[var(--c-accent)]"
        />
        {d.marketplace.filters.verifiedOnly}
      </label>
    </div>
  );

  return (
    <div className="container-public py-10 md:py-14">
      <h1 className="h1">{title ?? d.marketplace.title}</h1>
      <p className="lead mt-3">{d.marketplace.lead}</p>

      <div className="mt-8 flex flex-col gap-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[240px] flex-1">
            <TextField
              label={d.marketplace.searchLabel}
              type="search"
              value={filters.q}
              placeholder={d.marketplace.searchPlaceholder}
              onChange={(event) => update({ q: event.target.value })}
            />
          </div>
          <div className="w-full sm:w-56">
            <SelectField
              label={d.a11y.sortBy}
              value={filters.sort}
              onChange={(event) => update({ sort: event.target.value as Filters['sort'] })}
            >
              <option value="featured">{d.marketplace.sort.featured}</option>
              <option value="priceAsc">{d.marketplace.sort.priceAsc}</option>
              <option value="priceDesc">{d.marketplace.sort.priceDesc}</option>
              <option value="readiness">{d.marketplace.sort.readiness}</option>
            </SelectField>
          </div>
          <Button variant="secondary" className="lg:hidden" onClick={() => setDrawerOpen(true)}>
            {d.marketplace.filters.open}
            {activeChips.length > 0 ? ` (${activeChips.length})` : ''}
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          {(['all', 'available', 'enprimeur'] as const).map((type) => (
            <Button
              key={type}
              size="compact"
              variant={filters.type === type ? 'primary' : 'secondary'}
              onClick={() => update({ type })}
            >
              {type === 'all' ? d.marketplace.tabs.all : type === 'available' ? d.marketplace.tabs.available : d.marketplace.tabs.enPrimeur}
            </Button>
          ))}
        </div>

        {activeChips.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            {activeChips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                onClick={() => update(chip.clear)}
                className="inline-flex min-h-[36px] items-center gap-2 rounded-full border border-line-strong px-3 text-sm"
              >
                {chip.label}
                <span aria-hidden="true">×</span>
                <span className="sr-only">{fmt(d.marketplace.filters.remove, { name: chip.label })}</span>
              </button>
            ))}
            <Button size="compact" variant="ghost" onClick={() => setParams(new URLSearchParams())}>
              {d.marketplace.filters.clear}
            </Button>
          </div>
        ) : null}

        <p role="status" className="caption">
          {fmt(d.marketplace.count, { count: formatNumber(filtered.length) })}
        </p>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[224px_minmax(0,1fr)] xl:grid-cols-[248px_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <h2 className="h3 mb-4">{d.marketplace.filters.legend}</h2>
          {filterControls}
        </aside>

        <div>
          {visible.length === 0 ? (
            <EmptyState
              title={d.empty.noResults.title}
              body={d.empty.noResults.body}
              action={
                <Button variant="secondary" onClick={() => setParams(new URLSearchParams())}>
                  {d.empty.noResults.action}
                </Button>
              }
            />
          ) : (
            <>
              <ul className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {visible.map((entry) => (
                  <li key={entry.lot.id} className="relative">
                    <LotCard entry={entry} basePath={basePath} />
                  </li>
                ))}
              </ul>
              {totalPages > 1 ? (
                <nav className="mt-8 flex items-center justify-between gap-4" aria-label={d.marketplace.pagination}>
                  <Button
                    variant="secondary"
                    size="compact"
                    disabled={page <= 1}
                    onClick={() => setParams(writeFilters({ ...filters, page: page - 1 }))}
                  >
                    {d.marketplace.previous}
                  </Button>
                  <span className="caption tabular">{fmt(d.marketplace.pagination, { page, total: totalPages })}</span>
                  <Button
                    variant="secondary"
                    size="compact"
                    disabled={page >= totalPages}
                    onClick={() => setParams(writeFilters({ ...filters, page: page + 1 }))}
                  >
                    {d.marketplace.next}
                  </Button>
                </nav>
              ) : null}
            </>
          )}
        </div>
      </div>

      <Drawer
        open={drawerOpen}
        title={d.marketplace.filters.legend}
        onClose={() => setDrawerOpen(false)}
        closeLabel={d.common.close}
        footer={
          <div className="flex gap-3">
            <Button fullWidth onClick={() => setDrawerOpen(false)}>
              {fmt(d.marketplace.filters.apply, { count: filtered.length })}
            </Button>
            <Button variant="secondary" onClick={() => setParams(new URLSearchParams())}>
              {d.marketplace.filters.clear}
            </Button>
          </div>
        }
      >
        {filterControls}
      </Drawer>

      <p className="caption mt-10 flex items-center gap-2">
        <StatusBadge tone="warning">{d.marketplace.sampleBadge}</StatusBadge>
        {d.demo.syntheticNotice}
      </p>
    </div>
  );
}

export default function Marketplace() {
  return <MarketplaceView />;
}
