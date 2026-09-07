import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type { EntityId } from '@/domain/types';
import { useI18n } from '@/app/i18n-context';
import { useEnvironment, useFocusHeading, useModeLink } from '@/app/environment-context';
import { useAction } from '@/app/actions';
import { royaltiesForProducer, wineryFinance } from '@/app/selectors';
import { formatExact, formatMoney, isZero, primaryFee, subMoney } from '@/domain/money';
import { WorkspacePage } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { DataTable } from '@/components/ui/DataTable';
import { Tabs } from '@/components/ui/Tabs';
import { EmptyState, MetricTile, Notice, SectionHeader } from '@/components/ui/Feedback';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { MoneySummary } from '@/components/trade/MoneySummary';
import { ActionReview } from '@/components/trade/ActionReview';

/**
 * WIN-05. Every figure is derived from the settlement ledger. Producer
 * royalties are shown separately from primary withdrawals and are never added
 * into the same total.
 */
export default function Finance() {
  const { d, locale, formatDate, formatNumber } = useI18n();
  const { ledger, actorId, actor } = useEnvironment();
  const link = useModeLink();
  const [params] = useSearchParams();
  const tab = params.get('tab') ?? 'overview';
  const controller = useAction();
  const [withdrawOffer, setWithdrawOffer] = useState<EntityId | undefined>();
  useFocusHeading(d.winery.finance);

  const finance = wineryFinance(ledger, actorId);
  const royalties = royaltiesForProducer(ledger, actorId);

  const exportCsv = () => {
    const header = ['offer', 'lot', 'settled', 'released_bps', 'withdrawn', 'withdrawable'];
    const rows = finance.perOffer.map((entry) => [
      entry.offer.id,
      entry.lot?.name ?? '',
      formatMoney(entry.settlement.settledFunds, 'en', { withSymbol: false }),
      String(entry.settlement.releasedBps),
      formatMoney(entry.settlement.withdrawnGross, 'en', { withSymbol: false }),
      formatMoney(entry.withdrawable, 'en', { withSymbol: false }),
    ]);
    const meta = [
      `# Palissage demo export — simulated data, not a financial statement`,
      `# mode=demo source=fixture generated=${ledger.nowIso}`,
    ];
    const csv = [...meta, header.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'palissage-demo-finance.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const selected = withdrawOffer ? finance.perOffer.find((entry) => entry.offer.id === withdrawOffer) : undefined;
  const selectedFee = selected ? primaryFee(selected.withdrawable, selected.settlement.primaryFeeBps) : undefined;
  const selectedNet = selected && selectedFee ? subMoney(selected.withdrawable, selectedFee) : undefined;

  return (
    <WorkspacePage
      title={d.winery.finance}
      description={actor?.displayLabel}
      actions={
        <Button variant="secondary" onClick={exportCsv}>
          {d.winery.exportCsv}
        </Button>
      }
    >
      <Tabs
        label={d.winery.finance}
        activeId={tab}
        items={[
          { id: 'overview', label: d.winery.tabs.overview },
          { id: 'escrow', label: d.winery.tabs.escrow, count: finance.perOffer.length },
          { id: 'royalties', label: d.winery.tabs.royalties, count: royalties.length },
        ]}
      />

      {tab === 'overview' ? (
        <>
          <section className="grid gap-4 sm:grid-cols-3">
            <MetricTile label={d.winery.fundsReceived} value={formatMoney(finance.receivedGross, locale)} />
            <MetricTile label={d.winery.lockedEscrow} value={formatMoney(finance.locked, locale)} />
            <MetricTile
              label={d.winery.withdrawable}
              value={formatMoney(finance.withdrawable, locale)}
              tone={isZero(finance.withdrawable) ? 'neutral' : 'accent'}
            />
          </section>

          <section className="panel">
            <SectionHeader as="h3" title={d.winery.tabs.withdrawals} />
            <div className="mt-5 max-w-md">
              <MoneySummary
                rows={[
                  { label: d.winery.fundsReceived, value: finance.receivedGross },
                  { label: d.winery.withdrawn, value: finance.withdrawnGross },
                  { label: d.winery.feesDeducted, value: finance.feesDeducted, negative: true },
                  { label: d.winery.netCredited, value: finance.netCredited, emphasis: true },
                  { label: d.winery.royaltiesEarned, value: finance.royalties, note: d.secondary.royalty },
                ]}
              />
            </div>
            <p className="caption mt-4">{d.faq.escrow.a}</p>
          </section>
        </>
      ) : null}

      {tab === 'escrow' ? (
        <>
          <DataTable
            caption={d.winery.tabs.escrow}
            rows={finance.perOffer}
            rowKey={(entry) => entry.offer.id}
            mobileTitle={(entry) => entry.lot?.name ?? entry.offer.id}
            empty={<EmptyState title={d.winery.noOffers} body={d.empty.noLots.body} />}
            columns={[
              {
                key: 'lot',
                header: d.buyer.columns.lot,
                render: (entry) => (
                  <Link to={link(`/app/winery/lots/${entry.offer.lotId}`)} className="link font-medium">
                    {entry.lot?.name ?? entry.offer.lotId}
                  </Link>
                ),
              },
              { key: 'offer', header: d.buyer.columns.reference, render: (entry) => entry.offer.id },
              {
                key: 'settled',
                header: d.winery.fundsReceived,
                numeric: true,
                render: (entry) => formatMoney(entry.settlement.settledFunds, locale),
              },
              {
                key: 'released',
                header: d.winery.milestones,
                numeric: true,
                render: (entry) => `${entry.settlement.releasedBps / 100}%`,
              },
              {
                key: 'withdrawn',
                header: d.winery.withdrawn,
                numeric: true,
                render: (entry) => formatMoney(entry.settlement.withdrawnGross, locale),
              },
              {
                key: 'withdrawable',
                header: d.winery.withdrawable,
                numeric: true,
                render: (entry) => formatMoney(entry.withdrawable, locale),
              },
              {
                key: 'action',
                header: d.buyer.columns.action,
                render: (entry) => (
                  <Button
                    size="compact"
                    variant="secondary"
                    disabled={isZero(entry.withdrawable)}
                    onClick={() => {
                      setWithdrawOffer(entry.offer.id);
                      void controller.review({ action: 'withdrawReleased', offerId: entry.offer.id });
                    }}
                  >
                    {d.action.withdraw}
                  </Button>
                ),
              },
            ]}
          />
          <Notice tone="info">{d.faq.escrow.a}</Notice>
        </>
      ) : null}

      {tab === 'royalties' ? (
        <>
          <DataTable
            caption={d.winery.tabs.royalties}
            rows={royalties}
            rowKey={(trade) => trade.id}
            mobileTitle={(trade) => ledger.lots[trade.lotId]?.name ?? trade.lotId}
            empty={<EmptyState title={d.empty.noActivity.title} body={d.buyer.secondaryContext} />}
            columns={[
              { key: 'date', header: d.buyer.columns.date, render: (trade) => formatDate(trade.occurredAt) },
              {
                key: 'lot',
                header: d.buyer.columns.lot,
                render: (trade) => ledger.lots[trade.lotId]?.name ?? trade.lotId,
              },
              {
                key: 'quantity',
                header: d.buyer.columns.bottles,
                numeric: true,
                render: (trade) => formatNumber(trade.quantity),
              },
              { key: 'gross', header: d.secondary.gross, numeric: true, render: (trade) => formatMoney(trade.gross, locale) },
              {
                key: 'rate',
                header: d.field.royalty,
                numeric: true,
                render: (trade) => `${(ledger.lots[trade.lotId]?.royaltyBps ?? 0) / 100}%`,
              },
              {
                key: 'royalty',
                header: d.secondary.royalty,
                numeric: true,
                render: (trade) => formatExact(trade.royalty, locale),
              },
              { key: 'source', header: d.buyer.columns.source, render: (trade) => trade.receiptId },
            ]}
          />
          <p className="caption">{d.price.precision}</p>
        </>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge tone="warning">{d.mode.demo}</StatusBadge>
        <span className="caption">{d.demo.syntheticNotice}</span>
      </div>

      <ActionReview
        controller={controller}
        title={d.action.withdraw}
        summary={[
          { label: d.buyer.columns.reference, value: selected?.offer.id ?? '' },
          { label: d.buyer.columns.lot, value: selected?.lot?.name ?? '' },
          { label: d.winery.withdrawable, value: selected ? formatMoney(selected.withdrawable, locale) : '' },
          { label: d.winery.feesDeducted, value: selectedFee ? formatMoney(selectedFee, locale) : '' },
          { label: d.winery.netCredited, value: selectedNet ? formatMoney(selectedNet, locale) : '', emphasis: true },
          { label: d.field.organisation, value: actor?.displayLabel ?? '' },
        ]}
        consequences={[d.faq.escrow.a, d.buyer.secondaryContext]}
        confirmLabel={d.action.withdraw}
        successBody={selectedNet ? formatMoney(selectedNet, locale) : ''}
        onSuccess={() => setWithdrawOffer(undefined)}
      />
    </WorkspacePage>
  );
}
