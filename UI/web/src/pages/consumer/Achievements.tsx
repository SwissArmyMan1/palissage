import type { ReactNode } from 'react';
import { ScanLine, Wine, Users, Gift } from 'lucide-react';
import { Logo } from '@/components/layout/Logo';
import { SectionTitle } from '@/components/ui/primitives';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { AchievementBadge, QuestCard } from '@/components/ui/consumer';
import { Stagger, StaggerItem } from '@/components/layout/Page';
import { achievements, quests } from '@/lib/mock';

const groupIcon: Record<string, ReactNode> = {
  Explorer: <ScanLine size={32} />,
  Collector: <Wine size={32} />,
  Community: <Users size={32} />,
  Loyalty: <Gift size={32} />,
};

const groups = ['Explorer', 'Collector', 'Community', 'Loyalty'];

export default function Achievements() {
  return (
    <Stagger className="flex flex-col gap-6">
      <StaggerItem className="flex items-center gap-3">
        <Logo variant="mark" className="h-9 w-9" />
        <h1 className="t-h1 text-fg">Achievements</h1>
      </StaggerItem>

      <StaggerItem className="card flex flex-col gap-2.5 p-4">
        <div className="flex items-center gap-2">
          <span className="t-body-strong flex-1 text-fg">8 of 24 unlocked</span>
          <StatusBadge tone="gold">Level 3 · Connoisseur</StatusBadge>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-page-subtle">
          <div className="h-full rounded-full bg-gold" style={{ width: '33%' }} />
        </div>
      </StaggerItem>

      <StaggerItem className="flex flex-col gap-3">
        <SectionTitle>Loyalty rewards in progress</SectionTitle>
        {quests.map((q) => <QuestCard key={q.title} quest={q} />)}
      </StaggerItem>

      {groups.map((g) => (
        <StaggerItem key={g} className="flex flex-col gap-4">
          <SectionTitle>{g}</SectionTitle>
          <div className="grid grid-cols-3 gap-4 sm:grid-cols-4">
            {achievements
              .filter((a) => a.group === g)
              .map((a) => (
                <AchievementBadge key={a.name} a={a} icon={groupIcon[g]} />
              ))}
          </div>
        </StaggerItem>
      ))}

      <StaggerItem>
        <p className="t-caption normal-case tracking-normal text-fg-tertiary">
          Tap a badge for the medallion, unlock condition and date. Unlocked badges are saved to
          your passport (chain details one level down).
        </p>
      </StaggerItem>
    </Stagger>
  );
}
