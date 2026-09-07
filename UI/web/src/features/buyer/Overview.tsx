import { Link } from 'react-router-dom';
import { useI18n } from '@/app/i18n-context';
import { useEnvironment, useFocusHeading, useModeLink } from '@/app/environment-context';
import {
  activityFor,
  allocationsFor,
  balanceDue,
  bottlesHeld,
  bottlesInEscrow,
  positionsFor,
  redemptionsForBuyer,
} from '@/app/selectors';
import { formatMoney, isZero, subMoney } from '@/domain/money';
import { eligibilityReason, isOverdue } from '@/domain/capabilities';
import { WorkspacePage } from '@/components/layout/AppShell';
import { ButtonLink } from '@/components/ui/Button';
import { EmptyState, MetricTile, Notice, SectionHeader } from '@/components/ui/Feedback';
import { StatusBadge } from '@/components/ui/StatusBadge';

/** BUY-01. Due payments first, then a small set of accounting figures. */
export default function BuyerOverview() {
  const { d, locale, fmt, formatDate, formatNumber } = useI18n();
  const { ledger, actorId, actor } = useEnvironment();
  const link = useModeLink();
  useFocusHeading(d.buyer.overview);

  const allocations = allocationsFor(ledger, actorId);
  const due = balanceDue(ledger, actorId);
  const held = bottlesHeld(ledger, actorId);
  const escrow = bottlesInEscrow(ledger, actorId);
  const deliveries = redemptionsForBuyer(ledger, actorId);
  const positions = positionsFor(ledger, actorId);
  const eligibility = eligibilityReason(actor, ledger.nowIso);

  const tasks = [
    ...allocations
      .filter((allocation) => allocation.state === 'Reserved')
      .map((allocation) => {
        const offer = ledger.offers[allocation.offerId];
        const lot = offer ? ledger.lots[offer.lotId] : undefined;
        const overdue = offer ? isOverdue(allocation, offer, ledger.nowIso) : false;
        return {
          id: allocation.id,
          title: fmt(d.order.deadline, {
            date: offer ? formatDate(offer.fullPaymentDeadline, { withTime: true, withZone: true }) : '',
          }),
          subtitle: `${lot?.name ?? allocation.offerId} · ${formatMoney(subMoney(allocation.totalDue, allocation.paidAmount), locale)}`,
          to: `/app/buyer/allocations/${allocation.id}`,
          action: d.buyer.payRemainder,
          tone: overdue ? ('warning' as const) : ('accent' as const),
          badge: overdue ? d.status.overdue : d.status.allocation.Reserved,
        };
      }),
    ...deliveries
      .filter((redemption) => redemption.state === 'Shipped')
      .map((redemption) => ({
        id: redemption.id,
        title: d.buyer.confirmReceipt,
        subtitle: `${ledger.lots[redemption.lotId]?.name ?? redemption.lotId} · ${formatNumber(redemption.quantity)} ${d.order.quantityUnit}`,
        to: `/app/buyer/deliveries/${redemption.id}`,
        action: d.buyer.confirmReceipt,
        tone: 'accent' as const,
        badge: d.status.redemption.Shipped,
      })),
  ];

  const recent = activityFor(
    ledger,
    (item) =>
      item.actorId === actorId ||
      Object.values(ledger.allocations).some((allocation) => allocation.buyerId === actorId && allocation.id === item.entityId),
    8,
  );

  return (
    <WorkspacePage
      title={d.buyer.overview}
      description={actor?.displayLabel}
      status={
        eligibility ? (
          <StatusBadge tone="warning">{d.reason[eligibility]}</StatusBadge>
        ) : (
          <StatusBadge tone="success">{d.status.review.accepted}</StatusBadge>
        )
      }
      actions={<ButtonLink to={link('/app/marketplace')} variant="secondary">{d.nav.exploreLots}</ButtonLink>}
    >
      {eligibility ? (
        <Notice tone="warning" title={d.errors.unverifiedBuyer.title}>
          {d.reason[eligibility]}
        </Notice>
      ) : null}

      <section>
        <SectionHeader as="h3" title={d.buyer.actionRequired} />
        <div className="mt-4">
          {tasks.length === 0 ? (
            <p className="rounded-panel border border-line bg-surface p-5 text-sm text-fg-secondary">
              {d.buyer.nothingDue}
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {tasks.map((task) => (
                <li key={task.id} className="panel-flush flex flex-wrap items-center justify-between gap-4 p-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge tone={task.tone}>{task.badge}</StatusBadge>
                    </div>
                    <p className="mt-1.5 font-medium">{task.subtitle}</p>
                    <p className="caption">{task.title}</p>
                  </div>
                  <ButtonLink to={link(task.to)} size="compact">
                    {task.action}
                  </ButtonLink>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section>
        <div className="grid gap-4 sm:grid-cols-3">
          <MetricTile
            label={d.buyer.remainderDue}
            value={formatMoney(due, locale)}
            detail={isZero(due) ? d.buyer.nothingDue : undefined}
          />
          <MetricTile label={d.buyer.bottlesHeld} value={formatNumber(held)} detail={d.order.quantityUnit} />
          <MetricTile label={d.buyer.bottlesInEscrow} value={formatNumber(escrow)} detail={d.delivery.escrow} />
        </div>
        <p className="caption mt-3">{formatMoney(ledger.cash[actorId], locale)} · {d.buyer.spendable}</p>
      </section>

      <section>
        <SectionHeader as="h3" title={d.buyer.allocations} action={<ButtonLink to={link('/app/buyer/allocations')} variant="ghost" size="compact">{d.common.viewAll}</ButtonLink>} />
        <div className="mt-4">
          {allocations.length === 0 && positions.length === 0 ? (
            <EmptyState
              title={d.empty.noAllocations.title}
              body={d.empty.noAllocations.body}
              action={<ButtonLink to={link('/app/marketplace')} variant="secondary">{d.empty.noAllocations.action}</ButtonLink>}
            />
          ) : (
            <ul className="flex flex-col gap-2">
              {positions.map((position) => {
                const lot = ledger.lots[position.lotId];
                return (
                  <li key={position.lotId} className="panel-flush flex flex-wrap items-center justify-between gap-3 p-4">
                    <div>
                      <p className="font-medium">{lot?.name}</p>
                      <p className="caption">
                        {formatNumber(position.walletBottles)} {d.order.quantityUnit}
                        {position.redemptionEscrowBottles > 0
                          ? ` · ${formatNumber(position.redemptionEscrowBottles)} ${d.buyer.columns.escrow}`
                          : ''}
                      </p>
                    </div>
                    <Link to={link(`/app/buyer/positions/${position.lotId}`)} className="link text-sm">
                      {d.buyer.viewPosition}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      {recent.length > 0 ? (
        <section>
          <SectionHeader as="h3" title={d.buyer.recentActivity} />
          <ul className="mt-4 flex flex-col gap-2 text-sm">
            {recent.map((item) => (
              <li key={item.id} className="flex flex-wrap justify-between gap-2 border-b border-line pb-2">
                <span>
                  {fmt(d.activity[item.action], {
                    actor: item.actorLabel,
                    quantity: item.quantity ? formatNumber(item.quantity) : '',
                  })}
                </span>
                <span className="caption">{formatDate(item.occurredAt)}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </WorkspacePage>
  );
}
