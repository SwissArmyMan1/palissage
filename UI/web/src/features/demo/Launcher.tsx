import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { Role } from '@/domain/types';
import type { ScenarioPreset } from '@/adapters/types';
import { useI18n } from '@/app/i18n-context';
import { useEnvironment, useFocusHeading } from '@/app/environment-context';
import { useTour } from '@/app/tour-context';
import { TOUR_STEPS } from '@/app/tour-steps';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Notice, SectionHeader } from '@/components/ui/Feedback';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Trellis } from '@/components/layout/Logo';

const PRESETS: { id: ScenarioPreset; titleKey: 'presetBuyerReady' | 'presetProducerStart' | 'presetDeliveryReady' | 'presetIssues'; bodyKey: 'presetBuyerReadyBody' | 'presetProducerStartBody' | 'presetDeliveryReadyBody' | 'presetIssuesBody'; role: Role; home: string }[] = [
  { id: 'buyer-ready', titleKey: 'presetBuyerReady', bodyKey: 'presetBuyerReadyBody', role: 'buyer', home: '/lots/demo-lot-001' },
  { id: 'producer-start', titleKey: 'presetProducerStart', bodyKey: 'presetProducerStartBody', role: 'winery', home: '/app/winery/lots' },
  { id: 'delivery-ready', titleKey: 'presetDeliveryReady', bodyKey: 'presetDeliveryReadyBody', role: 'buyer', home: '/app/buyer/allocations' },
  { id: 'issues', titleKey: 'presetIssues', bodyKey: 'presetIssuesBody', role: 'buyer', home: '/app/buyer/overview' },
];

/**
 * PUB-05. Choosing a starting point is always explicit: nothing is loaded in
 * the background, and replacing an existing session is confirmed first.
 */
export default function DemoLauncher() {
  const { d, fmt, formatDate, locale } = useI18n();
  const { ledger, demo, setRole, resetDemo, enterDemo, preset, recovery } = useEnvironment();
  const tour = useTour();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [pending, setPending] = useState<(typeof PRESETS)[number] | undefined>();
  const [resetOpen, setResetOpen] = useState(false);
  useFocusHeading(d.demo.title);

  const hasProgress = demo.storedCommandCount() > 0;

  // A role or scenario asked for by a landing-page link is applied once.
  useEffect(() => {
    const role = params.get('role');
    if (role === 'buyer' || role === 'winery' || role === 'operations') setRole(role);
  }, [params, setRole]);

  const go = async (entry: (typeof PRESETS)[number]) => {
    await enterDemo(entry.id);
    setRole(entry.role);
    navigate(entry.home.startsWith('/app') ? `${entry.home}?mode=demo` : entry.home);
  };

  const choose = (entry: (typeof PRESETS)[number]) => {
    if (hasProgress && entry.id !== preset) {
      setPending(entry);
      return;
    }
    void go(entry);
  };

  const requestedScenario = params.get('scenario') as ScenarioPreset | null;

  return (
    <div className="container-public py-10 md:py-16">
      <div className="max-w-3xl">
        <Trellis className="h-10 w-10 text-accent" />
        <h1 className="h1 mt-4">{d.demo.title}</h1>
        <p className="lead mt-4">{d.demo.syntheticNotice}</p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <StatusBadge tone="warning">{d.mode.demo}</StatusBadge>
          <span className="caption">{fmt(d.demo.snapshot, { date: formatDate(ledger.nowIso) })}</span>
        </div>
      </div>

      {recovery ? (
        <div className="mt-8 max-w-2xl">
          <Notice tone="warning" title={d.errors.persistedVersion.title}>
            {d.errors.persistedVersion.body}
          </Notice>
        </div>
      ) : null}

      <div className="mt-10 grid gap-6 lg:grid-cols-[1.3fr_1fr] lg:gap-12">
        <section>
          <SectionHeader title={d.demo.guidedTour} description={d.demo.tourFinishedBody} />
          <ol className="mt-6 flex flex-col gap-3">
            {TOUR_STEPS.slice(0, 5).map((step, index) => (
              <li key={step.id} className="flex gap-3 text-sm">
                <span className="caption tabular w-6 shrink-0 text-accent">{String(index + 1).padStart(2, '0')}</span>
                <span>{locale === 'fr' ? step.titleFr : step.titleEn}</span>
              </li>
            ))}
          </ol>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button
              size="hero"
              onClick={() => {
                void (async () => {
                  if (hasProgress) {
                    setPending(PRESETS[0]);
                    return;
                  }
                  await enterDemo('buyer-ready');
                  setRole('buyer');
                  tour.start();
                  navigate(TOUR_STEPS[0].path);
                })();
              }}
            >
              {d.demo.start}
            </Button>
            {hasProgress ? (
              <Button
                size="hero"
                variant="secondary"
                onClick={() => {
                  setRole('buyer');
                  navigate('/app/buyer/overview?mode=demo');
                }}
              >
                {d.demo.resume}
              </Button>
            ) : null}
            <Button size="hero" variant="ghost" onClick={() => setResetOpen(true)}>
              {d.demo.startOver}
            </Button>
          </div>
          {hasProgress ? (
            <p className="caption mt-3">{fmt(d.demo.storedLocally, { count: demo.storedCommandCount() })}</p>
          ) : null}
        </section>

        <section>
          <SectionHeader as="h3" title={d.demo.chooseRole} />
          <div className="mt-4 flex flex-col gap-3">
            {(
              [
                { role: 'buyer' as const, label: d.demo.exploreBuyer, home: '/app/buyer/overview' },
                { role: 'winery' as const, label: d.demo.exploreWinery, home: '/app/winery/overview' },
                { role: 'operations' as const, label: d.demo.exploreOperations, home: '/app/operations/overview' },
              ]
            ).map((entry) => (
              <Button
                key={entry.role}
                variant="secondary"
                onClick={() => {
                  setRole(entry.role);
                  navigate(`${entry.home}?mode=demo`);
                }}
              >
                {entry.label}
              </Button>
            ))}
          </div>
          <p className="caption mt-4">{d.demo.presetActive}: {d.demo[PRESETS.find((entry) => entry.id === preset)?.titleKey ?? 'presetBuyerReady']}</p>
        </section>
      </div>

      <section className="mt-14">
        <SectionHeader title={d.demo.presets} description={d.demo.presetSwitchWarning} />
        <ul className="mt-6 grid gap-4 md:grid-cols-2">
          {PRESETS.map((entry) => (
            <li key={entry.id} className="panel-flush flex flex-col gap-3 p-5">
              <div className="flex items-start justify-between gap-3">
                <h3 className="h3">{d.demo[entry.titleKey]}</h3>
                {preset === entry.id ? <StatusBadge tone="accent">{d.demo.presetActive}</StatusBadge> : null}
              </div>
              <p className="text-sm text-fg-secondary">{d.demo[entry.bodyKey]}</p>
              <div className="mt-auto pt-2">
                <Button
                  variant={requestedScenario === entry.id ? 'primary' : 'secondary'}
                  size="compact"
                  onClick={() => choose(entry)}
                >
                  {d.demo.presetSwitch}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-14 max-w-2xl">
        <Notice tone="info" title={d.testnet.title}>
          {d.testnet.lead}
          <div className="mt-3">
            <ButtonLink to="/testnet" variant="secondary" size="compact">
              {d.mode.openTestnet}
            </ButtonLink>
          </div>
        </Notice>
      </section>

      <Dialog
        open={Boolean(pending)}
        title={d.demo.presetSwitch}
        onClose={() => setPending(undefined)}
        closeLabel={d.common.close}
      >
        <p className="text-sm">{d.demo.presetSwitchWarning}</p>
        <p className="mt-2 text-sm text-fg-secondary">{d.demo.resetBody}</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button
            onClick={() => {
              const entry = pending;
              setPending(undefined);
              if (entry) void go(entry);
            }}
          >
            {d.demo.presetSwitch}
          </Button>
          <Button variant="secondary" onClick={() => setPending(undefined)}>
            {d.common.cancel}
          </Button>
        </div>
      </Dialog>

      <Dialog open={resetOpen} title={d.demo.resetConfirm} onClose={() => setResetOpen(false)} closeLabel={d.common.close}>
        <p className="text-sm">{d.demo.resetBody}</p>
        <p className="caption mt-2">{fmt(d.demo.storedLocally, { count: demo.storedCommandCount() })}</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button
            variant="danger"
            onClick={() => {
              void resetDemo('buyer-ready');
              tour.stop();
              setResetOpen(false);
            }}
          >
            {d.demo.reset}
          </Button>
          <Button variant="secondary" onClick={() => setResetOpen(false)}>
            {d.common.cancel}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
