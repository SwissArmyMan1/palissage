import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import type { ProductionStatus } from '@/domain/types';
import { PRODUCTION_ORDER } from '@/domain/types';
import { useI18n } from '@/app/i18n-context';
import { useEnvironment, useFocusHeading, useModeLink } from '@/app/environment-context';
import { useAction } from '@/app/actions';
import { activityForEntity, offerableBottles, offersForLot, reservedNotMinted, reviewForLot } from '@/app/selectors';
import { formatMoney, withdrawableGross } from '@/domain/money';
import { canAdvanceProduction, canCreateOffer, offerAvailable, offerState } from '@/domain/capabilities';
import { WorkspacePage } from '@/components/layout/AppShell';
import { Button, ButtonLink } from '@/components/ui/Button';
import { DataTable } from '@/components/ui/DataTable';
import { Tabs } from '@/components/ui/Tabs';
import { DefinitionList, EmptyState, Notice, SectionHeader } from '@/components/ui/Feedback';
import { SelectField } from '@/components/ui/Field';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EvidencePanel } from '@/components/trade/EvidencePanel';
import { LotTimeline } from '@/components/trade/LotTimeline';
import { productionEvents } from '@/components/trade/production-events';
import { ActionReview } from '@/components/trade/ActionReview';
import { OfferEditor } from './OfferEditor';
import { NotFound } from '@/features/system/EnvironmentGate';

/**
 * WIN-04. Overview, documents, offers, production and history. Publishing an
 * offer, moving production forward and unlocking money are three separate
 * operations that never trigger one another.
 */
export default function WineryLotDetail() {
  const { lotId } = useParams();
  const { d, locale, fmt, formatDate, formatNumber } = useI18n();
  const { ledger, actorId, actor } = useEnvironment();
  const link = useModeLink();
  const [params] = useSearchParams();
  const tab = params.get('tab') ?? 'overview';
  const submitAction = useAction();
  const productionAction = useAction();
  const milestoneAction = useAction();
  const [nextStage, setNextStage] = useState<ProductionStatus | ''>('');
  const [offerFormOpen, setOfferFormOpen] = useState(false);

  const lot = lotId ? ledger.lots[lotId] : undefined;
  useFocusHeading(lot?.name ?? d.errors.notFound.title);

  if (!lot) return <NotFound entity={d.winery.lots} />;
  if (lot.producerId !== actorId) {
    return (
      <WorkspacePage title={d.winery.lotDetail}>
        <Notice tone="warning" title={d.errors.readOnly.title}>
          {d.reason.NOT_OWNER}
        </Notice>
      </WorkspacePage>
    );
  }

  const presentation = ledger.presentations[lot.id];
  const offers = offersForLot(ledger, lot.id);
  const review = reviewForLot(ledger, lot.id);
  const offerable = offerableBottles(ledger, lot);
  const offerCapability = canCreateOffer({ lot, actor, offerableBottles: offerable, markets: ledger.markets, nowIso: ledger.nowIso });
  const productionCapability = canAdvanceProduction({ lot, actor, nowIso: ledger.nowIso });
  const currentIndex = PRODUCTION_ORDER.indexOf(lot.production);
  const forwardStages = PRODUCTION_ORDER.slice(currentIndex + 1);
  const history = activityForEntity(ledger, lot.id, 20);

  const readinessDocument = ledger.documents['demo-doc-lot-001-readiness'];

  return (
    <WorkspacePage
      title={lot.name}
      description={`${lot.vintage} · ${lot.region}`}
      breadcrumbs={[{ to: '/app/winery/lots', label: d.winery.lots }, { label: lot.name }]}
      status={
        <>
          <StatusBadge tone={lot.status === 'Verified' ? 'success' : 'neutral'}>{d.status.lot[lot.status]}</StatusBadge>
          <StatusBadge tone="neutral">{d.status.production[lot.production]}</StatusBadge>
          {review ? <StatusBadge tone="info">{d.status.review[review.state]}</StatusBadge> : null}
        </>
      }
      actions={
        lot.status === 'Draft' ? (
          <Button
            loading={submitAction.busy}
            disabled={review?.state === 'submitted'}
            onClick={() => {
              void submitAction.review({
                action: 'submitLotReview',
                lotId: lot.id,
                documentIds: (presentation?.documents ?? []).map((document) => document.id),
              });
            }}
          >
            {d.action.submitReview}
          </Button>
        ) : (
          <ButtonLink to={link(`/app/lots/${lot.id}`)} variant="secondary">
            {d.lot.about}
          </ButtonLink>
        )
      }
    >
      {review?.state === 'needs_changes' ? (
        <Notice tone="warning" title={d.status.review.needs_changes}>
          {review.reason ?? d.operations.decision}
        </Notice>
      ) : null}
      {review?.state === 'submitted' ? (
        <Notice tone="info" title={d.status.review.submitted}>
          {formatDate(review.submittedAt, { withTime: true })}
        </Notice>
      ) : null}

      <Tabs
        label={d.winery.lotDetail}
        activeId={tab}
        items={[
          { id: 'overview', label: d.winery.tabs.overview },
          { id: 'documents', label: d.winery.tabs.documents, count: presentation?.documents.length ?? 0 },
          { id: 'offers', label: d.winery.tabs.offers, count: offers.length },
          { id: 'production', label: d.winery.tabs.production },
          { id: 'history', label: d.winery.tabs.history, count: history.length },
        ]}
      />

      {tab === 'overview' ? (
        <section className="panel">
          <SectionHeader as="h3" title={d.lot.accounting} />
          <div className="mt-5">
            <DefinitionList
              columns={2}
              items={[
                { term: d.lot.totalCap, value: formatNumber(lot.totalBottles) },
                { term: d.lot.reservedNotMinted, value: formatNumber(reservedNotMinted(ledger, lot)) },
                { term: d.lot.mintedOutstanding, value: formatNumber(lot.mintedBottles - lot.redeemedBottles) },
                { term: d.lot.redeemed, value: formatNumber(lot.redeemedBottles) },
                { term: d.winery.remaining, value: formatNumber(offerable) },
                { term: d.field.royalty, value: `${lot.royaltyBps / 100}%` },
                { term: d.field.bottleSize, value: `${lot.bottleSizeMl} ml` },
                {
                  term: d.lot.expectedReadiness,
                  value: `${formatDate(presentation?.expectedAvailability?.value)} · ${d.lot.estimated}`,
                },
              ]}
            />
          </div>
          {lot.docsHash ? (
            <div className="mt-6">
              <p className="caption">{d.lot.evidenceAnchor}</p>
              <p className="code mt-1">{lot.docsHash}</p>
              <p className="caption mt-2">{d.faq.verify.a}</p>
            </div>
          ) : null}
        </section>
      ) : null}

      {tab === 'documents' ? (
        <section className="panel">
          <SectionHeader as="h3" title={d.lot.documents} />
          <div className="mt-4">
            <EvidencePanel documents={presentation?.documents ?? []} emptyLabel={d.common.notProvidedSample} />
          </div>
        </section>
      ) : null}

      {tab === 'offers' ? (
        <>
          <section>
            <SectionHeader
              as="h3"
              title={d.winery.tabs.offers}
              action={
                <Button
                  variant="secondary"
                  disabled={!offerCapability.allowed}
                  onClick={() => setOfferFormOpen((value) => !value)}
                >
                  {d.winery.createOffer}
                </Button>
              }
            />
            {!offerCapability.allowed ? (
              <p className="caption mt-2">{d.reason[offerCapability.reasonCode ?? 'UNKNOWN']}</p>
            ) : (
              <p className="caption mt-2">{fmt(d.winery.offerable, { count: formatNumber(offerable) })}</p>
            )}
          </section>

          {offerFormOpen ? (
            <OfferEditor lot={lot} offerableBottles={offerable} onDone={() => setOfferFormOpen(false)} onCancel={() => setOfferFormOpen(false)} />
          ) : null}

          <DataTable
            caption={d.winery.tabs.offers}
            rows={offers}
            rowKey={(offer) => offer.id}
            mobileTitle={(offer) => offer.id}
            empty={<EmptyState title={d.winery.noOffers} body={d.empty.noLots.body} />}
            columns={[
              { key: 'id', header: d.buyer.columns.reference, render: (offer) => offer.id },
              {
                key: 'kind',
                header: d.lot.offerType,
                render: (offer) => (offer.kind === 'EnPrimeur' ? d.lot.enPrimeur : d.lot.standard),
              },
              {
                key: 'price',
                header: d.field.price,
                numeric: true,
                render: (offer) => formatMoney(offer.pricePerBottle, locale),
              },
              { key: 'quantity', header: d.field.quantity, numeric: true, render: (offer) => formatNumber(offer.quantity) },
              {
                key: 'available',
                header: d.buyer.columns.available,
                numeric: true,
                render: (offer) => formatNumber(offerAvailable(offer)),
              },
              {
                key: 'deposit',
                header: d.field.deposit,
                numeric: true,
                render: (offer) => (offer.depositBps > 0 ? `${offer.depositBps / 100}%` : d.common.none),
              },
              {
                key: 'state',
                header: d.buyer.columns.state,
                render: (offer) => {
                  const state = offerState(offer, ledger.nowIso);
                  return (
                    <StatusBadge tone={state === 'open' ? 'success' : 'neutral'}>
                      {fmt(d.status.offer[state], { date: formatDate(offer.startTime) })}
                    </StatusBadge>
                  );
                },
              },
              {
                key: 'settlement',
                header: d.winery.withdrawable,
                numeric: true,
                render: (offer) => {
                  const settlement = ledger.settlements[offer.id];
                  if (!settlement) return d.common.notProvided;
                  return formatMoney(
                    withdrawableGross(settlement.settledFunds, settlement.releasedBps, settlement.withdrawnGross),
                    locale,
                  );
                },
              },
            ]}
          />

          <section className="panel">
            <SectionHeader as="h3" title={d.winery.milestones} />
            <ul className="mt-4 flex flex-col gap-3">
              {offers.flatMap((offer) => {
                const settlement = ledger.settlements[offer.id];
                if (!settlement) return [];
                return settlement.milestones.map((milestone) => (
                  <li key={`${offer.id}-${milestone.index}`} className="panel-flush flex flex-wrap items-center justify-between gap-3 p-4">
                    <div>
                      <p className="font-medium">{milestone.description}</p>
                      <p className="caption">
                        {offer.id} · {milestone.bps / 100}%
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <StatusBadge tone={milestone.released ? 'success' : 'neutral'}>
                        {milestone.released ? d.winery.milestoneReleased : d.winery.milestonePending}
                      </StatusBadge>
                      {!milestone.released ? (
                        <Button
                          size="compact"
                          variant="secondary"
                          loading={milestoneAction.busy}
                          onClick={() => {
                            void milestoneAction.review({
                              action: 'submitMilestoneEvidence',
                              offerId: offer.id,
                              milestoneIndex: milestone.index,
                              documentIds: readinessDocument ? [readinessDocument.id] : [],
                            });
                          }}
                        >
                          {d.winery.submitEvidence}
                        </Button>
                      ) : null}
                    </div>
                  </li>
                ));
              })}
            </ul>
            <p className="caption mt-4">{d.faq.escrow.a}</p>
          </section>
        </>
      ) : null}

      {tab === 'production' ? (
        <section className="panel flex flex-col gap-5">
          <SectionHeader as="h3" title={d.lot.timeline} />
          <LotTimeline label={d.lot.timeline} events={productionEvents(lot.production, d.status.production)} />
          <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <SelectField
              label={d.winery.advanceProduction}
              value={nextStage}
              onChange={(event) => setNextStage(event.target.value as ProductionStatus)}
              disabled={!productionCapability.allowed || forwardStages.length === 0}
            >
              <option value="">{d.common.none}</option>
              {forwardStages.map((stage) => (
                <option key={stage} value={stage}>
                  {d.status.production[stage]}
                </option>
              ))}
            </SelectField>
            <Button
              disabled={!nextStage || !productionCapability.allowed}
              loading={productionAction.busy}
              onClick={() => {
                if (!nextStage) return;
                void productionAction.review({
                  action: 'setProductionStatus',
                  lotId: lot.id,
                  production: nextStage,
                });
              }}
            >
              {d.action.updateProduction}
            </Button>
          </div>
          {!productionCapability.allowed ? (
            <p className="caption">{d.reason[productionCapability.reasonCode ?? 'UNKNOWN']}</p>
          ) : (
            <p className="caption">{d.faq.escrow.a}</p>
          )}
        </section>
      ) : null}

      {tab === 'history' ? (
        <section>
          <SectionHeader as="h3" title={d.winery.tabs.history} />
          <ul className="mt-4 flex flex-col gap-2 text-sm">
            {history.length === 0 ? <p className="text-fg-secondary">{d.empty.noActivity.body}</p> : null}
            {history.map((item) => (
              <li key={item.id} className="flex flex-wrap justify-between gap-2 border-b border-line pb-2">
                <span>
                  {fmt(d.activity[item.action], {
                    actor: item.actorLabel,
                    quantity: item.quantity ? formatNumber(item.quantity) : '',
                  })}
                </span>
                <span className="caption">
                  {formatDate(item.occurredAt)}
                  {item.receiptId ? ` · ${item.receiptId}` : ''}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div>
        <Link to={link('/app/winery/lots')} className="link text-sm">
          {d.common.back}
        </Link>
      </div>

      <ActionReview
        controller={submitAction}
        title={d.action.submitReview}
        summary={[
          { label: d.field.wineName, value: lot.name },
          { label: d.field.documents, value: formatNumber(presentation?.documents.length ?? 0) },
        ]}
        consequences={[d.status.review.submitted, d.faq.verify.a]}
        confirmLabel={d.action.submitReview}
        successBody={d.status.review.submitted}
      />

      <ActionReview
        controller={productionAction}
        title={d.action.updateProduction}
        summary={[
          { label: d.field.wineName, value: lot.name },
          { label: d.lot.production, value: d.status.production[lot.production] },
          { label: d.winery.advanceProduction, value: nextStage ? d.status.production[nextStage] : '', emphasis: true },
        ]}
        consequences={[d.faq.escrow.a]}
        confirmLabel={d.action.updateProduction}
        successBody={nextStage ? d.status.production[nextStage] : ''}
        onSuccess={() => setNextStage('')}
      />

      <ActionReview
        controller={milestoneAction}
        title={d.winery.submitEvidence}
        summary={[
          { label: d.field.wineName, value: lot.name },
          { label: d.field.documents, value: readinessDocument?.label ?? d.common.notProvidedSample },
        ]}
        consequences={[d.status.review.submitted, d.faq.escrow.a]}
        confirmLabel={d.winery.submitEvidence}
        successBody={d.status.review.submitted}
      />
    </WorkspacePage>
  );
}
