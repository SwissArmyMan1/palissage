import { Link, useSearchParams } from 'react-router-dom';
import { useI18n } from '@/app/i18n-context';
import { useEnvironment, useFocusHeading, useModeLink } from '@/app/environment-context';
import { lotsForProducer, offersForLot, offerableBottles, reservedNotMinted } from '@/app/selectors';
import { offerAvailable, offerState } from '@/domain/capabilities';
import { WorkspacePage } from '@/components/layout/AppShell';
import { ButtonLink } from '@/components/ui/Button';
import { DataTable } from '@/components/ui/DataTable';
import { EmptyState } from '@/components/ui/Feedback';
import { SelectField, TextField } from '@/components/ui/Field';
import { StatusBadge } from '@/components/ui/StatusBadge';

/** WIN-02. All lots owned by this winery, with their commercial state. */
export default function WineryLots() {
  const { d, formatNumber } = useI18n();
  const { ledger, actorId } = useEnvironment();
  const link = useModeLink();
  const [params, setParams] = useSearchParams();
  const query = params.get('q') ?? '';
  const status = params.get('status') ?? '';
  useFocusHeading(d.winery.lots);

  const update = (next: Record<string, string>) => {
    const merged = new URLSearchParams(params);
    Object.entries(next).forEach(([key, value]) => {
      if (value) merged.set(key, value);
      else merged.delete(key);
    });
    setParams(merged);
  };

  const lots = lotsForProducer(ledger, actorId).filter((lot) => {
    if (query && !`${lot.name} ${lot.vintage}`.toLowerCase().includes(query.toLowerCase())) return false;
    if (status && lot.status !== status) return false;
    return true;
  });

  return (
    <WorkspacePage
      title={d.winery.lots}
      actions={<ButtonLink to={link('/app/winery/lots/new')}>{d.winery.createLot}</ButtonLink>}
    >
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[220px] flex-1">
          <TextField
            label={d.common.search}
            type="search"
            value={query}
            onChange={(event) => update({ q: event.target.value })}
          />
        </div>
        <div className="w-full sm:w-56">
          <SelectField label={d.buyer.columns.state} value={status} onChange={(event) => update({ status: event.target.value })}>
            <option value="">{d.common.all}</option>
            {(['Draft', 'Verified', 'Suspended', 'Closed'] as const).map((value) => (
              <option key={value} value={value}>
                {d.status.lot[value]}
              </option>
            ))}
          </SelectField>
        </div>
      </div>

      <DataTable
        caption={d.winery.lots}
        rows={lots}
        rowKey={(lot) => lot.id}
        mobileTitle={(lot) => lot.name}
        empty={
          <EmptyState
            title={d.empty.noLots.title}
            body={d.empty.noLots.body}
            action={<ButtonLink to={link('/app/winery/lots/new')}>{d.empty.noLots.action}</ButtonLink>}
          />
        }
        columns={[
          {
            key: 'name',
            header: d.field.wineName,
            render: (lot) => (
              <Link to={link(`/app/winery/lots/${lot.id}`)} className="link font-medium">
                {lot.name}
              </Link>
            ),
          },
          { key: 'vintage', header: d.field.vintage, numeric: true, render: (lot) => lot.vintage },
          {
            key: 'status',
            header: d.buyer.columns.state,
            render: (lot) => (
              <StatusBadge tone={lot.status === 'Verified' ? 'success' : lot.status === 'Suspended' ? 'warning' : 'neutral'}>
                {d.status.lot[lot.status]}
              </StatusBadge>
            ),
          },
          {
            key: 'production',
            header: d.lot.production,
            render: (lot) => <StatusBadge tone="neutral">{d.status.production[lot.production]}</StatusBadge>,
          },
          { key: 'total', header: d.lot.totalCap, numeric: true, render: (lot) => formatNumber(lot.totalBottles) },
          {
            key: 'reserved',
            header: d.lot.reservedNotMinted,
            numeric: true,
            render: (lot) => formatNumber(reservedNotMinted(ledger, lot)),
          },
          {
            key: 'remaining',
            header: d.winery.remaining,
            numeric: true,
            render: (lot) => formatNumber(offerableBottles(ledger, lot)),
          },
          {
            key: 'offer',
            header: d.lot.offerType,
            render: (lot) => {
              const offer = offersForLot(ledger, lot.id)[0];
              if (!offer) return d.winery.noOffers;
              const state = offerState(offer, ledger.nowIso);
              return (
                <span className="flex flex-col gap-1">
                  <StatusBadge tone={state === 'open' ? 'success' : 'neutral'}>{d.status.offer[state]}</StatusBadge>
                  <span className="caption">{formatNumber(offerAvailable(offer))}</span>
                </span>
              );
            },
          },
        ]}
      />
    </WorkspacePage>
  );
}
