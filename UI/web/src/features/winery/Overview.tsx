import { Link } from 'react-router-dom';
import { useI18n } from '@/app/i18n-context';
import { useEnvironment, useFocusHeading, useModeLink } from '@/app/environment-context';
import { activityFor, lotsForProducer, redemptionsForWinery, reviewForLot, wineryFinance } from '@/app/selectors';
import { formatMoney, isZero } from '@/domain/money';
import { WorkspacePage } from '@/components/layout/AppShell';
import { ButtonLink } from '@/components/ui/Button';
import { EmptyState, MetricTile, SectionHeader } from '@/components/ui/Feedback';
import { StatusBadge } from '@/components/ui/StatusBadge';

/** WIN-01. Next actions first, then the money, all from the shared ledger. */
export default function WineryOverview() {
  const { d, locale, fmt, formatDate, formatNumber } = useI18n();
  const { ledger, actorId, actor } = useEnvironment();
  const link = useModeLink();
  useFocusHeading(d.winery.overview);

  const lots = lotsForProducer(ledger, actorId);
  const finance = wineryFinance(ledger, actorId);
  const deliveries = redemptionsForWinery(ledger, actorId);
  const recent = activityFor(ledger, (item) => item.actorId === actorId, 8);

  const tasks = [
    ...(isZero(finance.withdrawable)
      ? []
      : [
          {
            id: 'withdraw',
            title: d.winery.withdraw,
            subtitle: formatMoney(finance.withdrawable, locale),
            to: '/app/winery/finance',
            action: d.winery.withdraw,
          },
        ]),
    ...deliveries
      .filter((redemption) => redemption.state === 'Requested')
      .map((redemption) => ({
        id: redemption.id,
        title: d.winery.recordShipment,
        subtitle: `${ledger.lots[redemption.lotId]?.name ?? redemption.lotId} · ${formatNumber(redemption.quantity)} ${d.order.quantityUnit}`,
        to: `/app/winery/deliveries/${redemption.id}`,
        action: d.winery.recordShipment,
      })),
    ...lots
      .filter((lot) => lot.status === 'Draft')
      .map((lot) => {
        const review = reviewForLot(ledger, lot.id);
        return {
          id: lot.id,
          title: review?.state === 'needs_changes' ? d.status.review.needs_changes : d.action.submitReview,
          subtitle: lot.name,
          to: `/app/winery/lots/${lot.id}`,
          action: d.action.submitReview,
        };
      }),
  ];

  return (
    <WorkspacePage
      title={d.winery.overview}
      description={actor?.displayLabel}
      actions={<ButtonLink to={link('/app/winery/lots/new')}>{d.winery.createLot}</ButtonLink>}
    >
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
                  <div>
                    <p className="font-medium">{task.subtitle}</p>
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

      <section className="grid gap-4 sm:grid-cols-3">
        <MetricTile label={d.winery.fundsReceived} value={formatMoney(finance.receivedGross, locale)} />
        <MetricTile label={d.winery.lockedEscrow} value={formatMoney(finance.locked, locale)} />
        <MetricTile
          label={d.winery.withdrawable}
          value={formatMoney(finance.withdrawable, locale)}
          tone={isZero(finance.withdrawable) ? 'neutral' : 'accent'}
        />
      </section>
      <p className="caption -mt-2">
        {d.winery.royaltiesEarned}: {formatMoney(finance.royalties, locale)}
      </p>

      <section>
        <SectionHeader
          as="h3"
          title={d.winery.lots}
          action={
            <ButtonLink to={link('/app/winery/lots')} variant="ghost" size="compact">
              {d.common.viewAll}
            </ButtonLink>
          }
        />
        <div className="mt-4">
          {lots.length === 0 ? (
            <EmptyState
              title={d.empty.noLots.title}
              body={d.empty.noLots.body}
              action={<ButtonLink to={link('/app/winery/lots/new')}>{d.empty.noLots.action}</ButtonLink>}
            />
          ) : (
            <ul className="flex flex-col gap-2">
              {lots.slice(0, 5).map((lot) => (
                <li key={lot.id} className="panel-flush flex flex-wrap items-center justify-between gap-3 p-4">
                  <div>
                    <Link to={link(`/app/winery/lots/${lot.id}`)} className="link font-medium">
                      {lot.name}
                    </Link>
                    <p className="caption">
                      {lot.vintage} · {formatNumber(lot.totalBottles)} {d.order.quantityUnit}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge tone={lot.status === 'Verified' ? 'success' : 'neutral'}>
                      {d.status.lot[lot.status]}
                    </StatusBadge>
                    <StatusBadge tone="neutral">{d.status.production[lot.production]}</StatusBadge>
                  </div>
                </li>
              ))}
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
