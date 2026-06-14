import { Hammer } from 'lucide-react';
import { PageHeader } from '@/components/layout/DashboardLayout';
import { EmptyState } from '@/components/ui/primitives';

export function Placeholder({ title, text }: { title: string; text?: string }) {
  return (
    <div>
      <PageHeader title={title} />
      <div className="card">
        <EmptyState
          icon={<Hammer size={28} />}
          title="On the roadmap"
          text={text ?? 'This screen is part of the next iteration.'}
        />
      </div>
    </div>
  );
}
