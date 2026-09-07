import { Link, useSearchParams } from 'react-router-dom';
import { useI18n } from '@/app/i18n-context';
import { useEnvironment, useFocusHeading, useModeLink } from '@/app/environment-context';
import { reviewQueues } from '@/app/selectors';
import { WorkspacePage } from '@/components/layout/AppShell';
import { DataTable } from '@/components/ui/DataTable';
import { Tabs } from '@/components/ui/Tabs';
import { EmptyState } from '@/components/ui/Feedback';
import { StatusBadge } from '@/components/ui/StatusBadge';

/** OPS-04. Two queues: lots awaiting review, milestones awaiting confirmation. */
export default function Verification() {
  const { d, formatDate } = useI18n();
  const { ledger } = useEnvironment();
  const link = useModeLink();
  const [params] = useSearchParams();
  const tab = params.get('tab') ?? 'lots';
  useFocusHeading(d.operations.verification);

  const queues = reviewQueues(ledger);
  const rows = tab === 'milestones' ? queues.milestones : queues.lots;

  return (
    <WorkspacePage title={d.operations.verification}>
      <Tabs
        label={d.operations.verification}
        activeId={tab}
        items={[
          { id: 'lots', label: d.operations.tabs.lots, count: queues.lots.length },
          { id: 'milestones', label: d.operations.tabs.milestones, count: queues.milestones.length },
        ]}
      />

      <DataTable
        caption={d.operations.verification}
        rows={rows}
        rowKey={(review) => review.id}
        mobileTitle={(review) => ledger.lots[review.lotId]?.name ?? review.lotId}
        empty={<EmptyState title={d.empty.noQueue.title} body={d.empty.noQueue.body} />}
        columns={[
          {
            key: 'lot',
            header: d.buyer.columns.lot,
            render: (review) => (
              <Link to={link(`/app/operations/verification/${review.lotId}?review=${review.id}`)} className="link font-medium">
                {ledger.lots[review.lotId]?.name ?? review.lotId}
              </Link>
            ),
          },
          {
            key: 'producer',
            header: d.buyer.columns.producer,
            render: (review) =>
              ledger.producers[ledger.lots[review.lotId]?.producerId ?? '']?.displayName ?? d.common.unknown,
          },
          { key: 'revision', header: d.buyer.columns.reference, render: (review) => `${review.id} · r${review.revision}` },
          {
            key: 'documents',
            header: d.field.documents,
            numeric: true,
            render: (review) => review.documentIds.length,
          },
          { key: 'submitted', header: d.buyer.columns.date, render: (review) => formatDate(review.submittedAt) },
          {
            key: 'state',
            header: d.buyer.columns.state,
            render: (review) => <StatusBadge tone="accent">{d.status.review[review.state]}</StatusBadge>,
          },
        ]}
      />
    </WorkspacePage>
  );
}
