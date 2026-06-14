import { Link } from 'react-router-dom';
import { Logo } from '@/components/layout/Logo';
import { SectionTitle } from '@/components/ui/primitives';
import {
  PassportHeader,
  QuestCard,
  VoucherCard,
  BottleScanCard,
} from '@/components/ui/consumer';
import { Stagger, StaggerItem } from '@/components/layout/Page';
import { quests, scans } from '@/lib/mock';
import { zoneLink } from '@/lib/zone';

export default function Passport() {
  return (
    <Stagger className="flex flex-col gap-6">
      <StaggerItem className="flex items-center gap-3">
        <Logo variant="mark" className="h-9 w-9" />
        <h1 className="t-h1 text-fg">Wine Passport</h1>
      </StaggerItem>
      <StaggerItem><PassportHeader /></StaggerItem>

      <StaggerItem className="flex flex-col gap-3">
        <SectionTitle>Active quests</SectionTitle>
        {quests.slice(0, 2).map((q) => <QuestCard key={q.title} quest={q} />)}
      </StaggerItem>

      <StaggerItem><VoucherCard /></StaggerItem>

      <StaggerItem className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <SectionTitle>My collection</SectionTitle>
          <Link to={zoneLink('consumer', '/achievements')} className="t-small-strong text-accent">
            See all (12)
          </Link>
        </div>
        {scans.map((s) => <BottleScanCard key={s.name} scan={s} />)}
      </StaggerItem>

      <StaggerItem className="flex flex-col gap-3">
        <SectionTitle>Membership passes</SectionTitle>
        <div className="flex gap-3 overflow-x-auto pb-1">
          {[
            ['Cazaban Wine Club', 'Member since 2025'],
            ['Cabardès Collective', 'Member since 2026'],
          ].map(([name, since]) => (
            <div key={name} className="flex h-24 w-40 shrink-0 flex-col justify-end rounded-lg bg-accent-subtle p-3">
              <span className="t-small-strong text-accent">{name}</span>
              <span className="t-caption normal-case tracking-normal text-fg-secondary">{since}</span>
            </div>
          ))}
        </div>
      </StaggerItem>
    </Stagger>
  );
}
