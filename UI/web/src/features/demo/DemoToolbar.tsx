import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { Role } from '@/domain/types';
import { useI18n } from '@/app/i18n-context';
import { useEnvironment, useModeLink } from '@/app/environment-context';
import { useTour } from '@/app/tour-context';
import { useAction } from '@/app/actions';
import { CLOCK_STAGES } from '@/adapters/demo/fixtures';
import { Button } from '@/components/ui/Button';
import { ActionReview } from '@/components/trade/ActionReview';
import { cn } from '@/lib/cn';

/**
 * Presenter controls: role, simulated clock, guided tour and reset.
 * They are visually separate from protocol actions so they can never be
 * mistaken for an operator's real controls.
 */
export function DemoToolbar() {
  const { d, fmt, formatDate, locale } = useI18n();
  const { mode, role, setRole, ledger, resetDemo } = useEnvironment();
  const tour = useTour();
  const navigate = useNavigate();
  const link = useModeLink();
  const controller = useAction();
  const location = useLocation();
  const panelRef = useRef<HTMLDivElement>(null);
  const [collapsed, setCollapsed] = useState(false);

  // Reserve the real height of the bar plus the safe area, so nothing at the
  // end of a page is ever hidden underneath it.
  useEffect(() => {
    const panel = panelRef.current;
    const root = document.documentElement;
    if (!panel) {
      root.style.setProperty('--sticky-action-height', '0px');
      document.body.style.paddingBottom = '';
      return;
    }
    const apply = () => {
      const height = panel.getBoundingClientRect().height + 24;
      root.style.setProperty('--sticky-action-height', `${height}px`);
      document.body.style.paddingBottom = `calc(${height}px + env(safe-area-inset-bottom))`;
    };
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(panel);
    return () => {
      observer.disconnect();
      root.style.setProperty('--sticky-action-height', '0px');
      document.body.style.paddingBottom = '';
    };
  }, [collapsed, mode, tour.active]);

  // Presenter controls appear in the workspace, and follow an active guided
  // tour onto the public pages it visits. They never sit on the marketing
  // pages of their own accord.
  const inWorkspace = location.pathname.startsWith('/app/');
  if (mode !== 'demo' || (!inWorkspace && !tour.active)) return null;

  const nextStage = CLOCK_STAGES.find((stage) => Date.parse(stage.toIso) > Date.parse(ledger.nowIso));
  const step = tour.step;

  const roles: { id: Exclude<Role, 'visitor'>; label: string; home: string }[] = [
    { id: 'buyer', label: d.role.buyer, home: '/app/buyer/overview' },
    { id: 'winery', label: d.role.winery, home: '/app/winery/overview' },
    { id: 'operations', label: d.role.operations, home: '/app/operations/overview' },
  ];

  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[25] flex justify-center p-3">
        <div
          ref={panelRef}
          className={cn(
            'pointer-events-auto w-full max-w-4xl rounded-panel border border-line bg-surface shadow-overlay',
            'transition-[max-height] duration-[var(--motion-panel)] ease-standard',
          )}
          style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
        >
          <div className="flex items-center justify-between gap-3 px-4 py-2">
            <p className="flex items-center gap-2 text-sm font-medium">
              <span className="inline-block h-2 w-2 rounded-full bg-warning" aria-hidden="true" />
              {d.mode.demo}
              <span className="hidden text-fg-secondary sm:inline">
                · {formatDate(ledger.nowIso)}
              </span>
            </p>
            <button
              type="button"
              onClick={() => setCollapsed((value) => !value)}
              aria-expanded={!collapsed}
              className="rounded-[8px] px-3 py-1.5 text-sm font-medium text-fg-secondary hover:bg-page-subtle"
            >
              {collapsed ? d.common.showMore : d.common.showLess}
            </button>
          </div>

          {collapsed ? null : (
            <div className="flex flex-col gap-3 border-t border-line px-4 py-3">
              {step && !tour.paused ? (
                <div className="rounded-[8px] bg-accent-subtle p-3">
                  <p className="caption text-accent">
                    {fmt(d.demo.tourStep, { index: tour.index + 1, total: tour.total })}
                  </p>
                  <p className="mt-1 text-sm font-medium">{locale === 'fr' ? step.titleFr : step.titleEn}</p>
                  <p className="mt-1 text-sm text-fg-secondary">{locale === 'fr' ? step.bodyFr : step.bodyEn}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      size="compact"
                      onClick={() => {
                        if (step.role !== 'visitor') setRole(step.role);
                        navigate(link(step.path));
                      }}
                    >
                      {d.demo.tourGo}
                    </Button>
                    <Button size="compact" variant="secondary" onClick={tour.previous} disabled={tour.index === 0}>
                      {d.demo.tourPrevious}
                    </Button>
                    <Button
                      size="compact"
                      variant="secondary"
                      onClick={tour.next}
                      disabled={tour.index === tour.total - 1}
                    >
                      {d.demo.tourNext}
                    </Button>
                    <Button size="compact" variant="ghost" onClick={tour.pause}>
                      {d.demo.tourPause}
                    </Button>
                  </div>
                </div>
              ) : null}

              <div className="flex flex-wrap items-center gap-2">
                <span className="caption">{d.demo.chooseRole}</span>
                {roles.map((entry) => (
                  <Button
                    key={entry.id}
                    size="compact"
                    variant={role === entry.id ? 'primary' : 'secondary'}
                    onClick={() => {
                      setRole(entry.id);
                      navigate(link(entry.home));
                    }}
                  >
                    {entry.label}
                  </Button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {nextStage ? (
                  <Button
                    size="compact"
                    variant="secondary"
                    onClick={() => {
                      void controller.review({ action: 'advanceClock', toIso: nextStage.toIso, label: nextStage.id });
                    }}
                  >
                    {d.demo.advance}
                  </Button>
                ) : null}
                {tour.active && tour.paused ? (
                  <Button size="compact" variant="secondary" onClick={tour.resume}>
                    {d.demo.tourResume}
                  </Button>
                ) : null}
                {tour.active ? (
                  <Button size="compact" variant="ghost" onClick={tour.stop}>
                    {d.demo.tourClose}
                  </Button>
                ) : (
                  <Button size="compact" variant="ghost" onClick={tour.start}>
                    {d.demo.guidedTour}
                  </Button>
                )}
                <Button
                  size="compact"
                  variant="ghost"
                  onClick={() => {
                    void resetDemo();
                    navigate('/demo');
                  }}
                >
                  {d.demo.reset}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <ActionReview
        controller={controller}
        title={d.demo.advance}
        summary={[
          { label: d.common.source, value: formatDate(ledger.nowIso, { withTime: true }) },
          {
            label: d.demo.advance,
            value: nextStage ? formatDate(nextStage.toIso, { withTime: true }) : '',
            emphasis: true,
          },
        ]}
        consequences={[
          fmt(d.demo.advanceBody, {
            from: formatDate(ledger.nowIso),
            to: nextStage ? formatDate(nextStage.toIso) : '',
          }),
        ]}
        confirmLabel={d.demo.advance}
        successBody={d.demo.advanceBody
          .replace('{from}', formatDate(ledger.nowIso))
          .replace('{to}', nextStage ? formatDate(nextStage.toIso) : '')}
      />
    </>
  );
}
