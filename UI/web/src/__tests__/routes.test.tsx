/**
 * Renders every canonical route and asserts it produces real content.
 *
 * This is a smoke test, not a substitute for the interaction checks in the
 * acceptance runbook: it catches a screen that throws, resolves the wrong
 * entity, or renders an empty shell.
 */

import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Suspense } from 'react';
import { I18nProvider } from '@/app/i18n';
import { EnvironmentProvider } from '@/app/environment';
import { TourProvider } from '@/app/demo-tour';
import { PublicShell } from '@/components/layout/PublicShell';
import { AppShell } from '@/components/layout/AppShell';
import type { Role } from '@/domain/types';

import Landing from '@/features/public/Landing';
import Marketplace from '@/features/public/Marketplace';
import PublicLotDetail from '@/features/public/LotDetail';
import Producer from '@/features/public/Producer';
import Pilot from '@/features/public/Pilot';
import Testnet from '@/features/public/Testnet';
import Legal from '@/features/public/Legal';
import DemoLauncher from '@/features/demo/Launcher';
import Passport from '@/features/passport/Passport';
import BuyerOverview from '@/features/buyer/Overview';
import Allocations from '@/features/buyer/Allocations';
import AllocationDetail from '@/features/buyer/AllocationDetail';
import Reserve from '@/features/buyer/Reserve';
import Secondary from '@/features/buyer/Secondary';
import SecondaryPurchase from '@/features/buyer/SecondaryPurchase';
import PositionDetail from '@/features/buyer/PositionDetail';
import BuyerDeliveries from '@/features/fulfilment/BuyerDeliveries';
import BuyerDeliveryDetail from '@/features/fulfilment/BuyerDeliveryDetail';
import WineryOverview from '@/features/winery/Overview';
import WineryLots from '@/features/winery/Lots';
import CreateLot from '@/features/winery/CreateLot';
import WineryLotDetail from '@/features/winery/LotDetail';
import Finance from '@/features/winery/Finance';
import WineryDeliveries from '@/features/fulfilment/WineryDeliveries';
import WineryDeliveryDetail from '@/features/fulfilment/WineryDeliveryDetail';
import OperationsOverview from '@/features/operations/Overview';
import Participants from '@/features/operations/Participants';
import ParticipantDetail from '@/features/operations/ParticipantDetail';
import Verification from '@/features/operations/Verification';
import VerificationDetail from '@/features/operations/VerificationDetail';
import Redemptions from '@/features/operations/Redemptions';
import RedemptionCase from '@/features/operations/RedemptionCase';
import Account from '@/features/account/Account';
import AppMarketplace from '@/features/app/AppMarketplace';
import AppLotDetail from '@/features/app/AppLotDetail';
import { NotFound } from '@/features/system/EnvironmentGate';

type Screen = { id: string; path: string; url: string; element: React.ReactNode; shell: 'public' | Role | 'none' };

const SCREENS: Screen[] = [
  { id: 'PUB-01', path: '/', url: '/', element: <Landing />, shell: 'public' },
  { id: 'PUB-02', path: '/marketplace', url: '/marketplace', element: <Marketplace />, shell: 'public' },
  { id: 'PUB-03', path: '/lots/:lotId', url: '/lots/demo-lot-001', element: <PublicLotDetail />, shell: 'public' },
  {
    id: 'PUB-04',
    path: '/producers/:producerId',
    url: '/producers/demo-producer-001',
    element: <Producer />,
    shell: 'public',
  },
  { id: 'PUB-05', path: '/demo', url: '/demo', element: <DemoLauncher />, shell: 'public' },
  { id: 'PUB-06', path: '/testnet', url: '/testnet', element: <Testnet />, shell: 'public' },
  { id: 'PUB-07', path: '/pilot', url: '/pilot', element: <Pilot />, shell: 'public' },
  { id: 'PUB-08', path: '/legal/:slug', url: '/legal/privacy', element: <Legal />, shell: 'public' },
  {
    id: 'PAS-01',
    path: '/passport/:passportId',
    url: '/passport/demo-passport-001',
    element: <Passport />,
    shell: 'none',
  },
  { id: 'SYS-07', path: '/app/marketplace', url: '/app/marketplace?mode=demo', element: <AppMarketplace />, shell: 'buyer' },
  {
    id: 'SYS-08',
    path: '/app/lots/:lotId',
    url: '/app/lots/demo-lot-001?mode=demo',
    element: <AppLotDetail />,
    shell: 'buyer',
  },
  { id: 'BUY-01', path: '/app/buyer/overview', url: '/app/buyer/overview?mode=demo', element: <BuyerOverview />, shell: 'buyer' },
  {
    id: 'BUY-02',
    path: '/app/buyer/allocations',
    url: '/app/buyer/allocations?mode=demo',
    element: <Allocations />,
    shell: 'buyer',
  },
  {
    id: 'BUY-03',
    path: '/app/buyer/allocations/:allocationId',
    url: '/app/buyer/allocations/demo-allocation-seed-006?mode=demo',
    element: <AllocationDetail />,
    shell: 'buyer',
  },
  {
    id: 'BUY-04',
    path: '/app/buyer/reserve/:offerId',
    url: '/app/buyer/reserve/demo-offer-001?mode=demo',
    element: <Reserve />,
    shell: 'buyer',
  },
  { id: 'BUY-05', path: '/app/buyer/secondary', url: '/app/buyer/secondary?mode=demo', element: <Secondary />, shell: 'buyer' },
  {
    id: 'BUY-06',
    path: '/app/buyer/secondary/:listingId',
    url: '/app/buyer/secondary/demo-listing-001?mode=demo',
    element: <SecondaryPurchase />,
    shell: 'buyer',
  },
  {
    id: 'BUY-07',
    path: '/app/buyer/deliveries',
    url: '/app/buyer/deliveries?mode=demo',
    element: <BuyerDeliveries />,
    shell: 'buyer',
  },
  {
    id: 'BUY-08',
    path: '/app/buyer/deliveries/:redemptionId',
    url: '/app/buyer/deliveries/demo-redemption-001?mode=demo',
    element: <BuyerDeliveryDetail />,
    shell: 'buyer',
  },
  {
    id: 'BUY-09',
    path: '/app/buyer/positions/:lotId',
    url: '/app/buyer/positions/demo-lot-006?mode=demo',
    element: <PositionDetail />,
    shell: 'buyer',
  },
  { id: 'SYS-01', path: '/app/buyer/account', url: '/app/buyer/account?mode=demo', element: <Account role="buyer" />, shell: 'buyer' },
  {
    id: 'WIN-01',
    path: '/app/winery/overview',
    url: '/app/winery/overview?mode=demo',
    element: <WineryOverview />,
    shell: 'winery',
  },
  { id: 'WIN-02', path: '/app/winery/lots', url: '/app/winery/lots?mode=demo', element: <WineryLots />, shell: 'winery' },
  { id: 'WIN-03', path: '/app/winery/lots/new', url: '/app/winery/lots/new?mode=demo', element: <CreateLot />, shell: 'winery' },
  {
    id: 'WIN-04',
    path: '/app/winery/lots/:lotId',
    url: '/app/winery/lots/demo-lot-001?mode=demo',
    element: <WineryLotDetail />,
    shell: 'winery',
  },
  { id: 'WIN-05', path: '/app/winery/finance', url: '/app/winery/finance?mode=demo', element: <Finance />, shell: 'winery' },
  {
    id: 'WIN-06',
    path: '/app/winery/deliveries',
    url: '/app/winery/deliveries?mode=demo',
    element: <WineryDeliveries />,
    shell: 'winery',
  },
  {
    id: 'WIN-07',
    path: '/app/winery/deliveries/:redemptionId',
    url: '/app/winery/deliveries/demo-redemption-001?mode=demo',
    element: <WineryDeliveryDetail />,
    shell: 'winery',
  },
  {
    id: 'SYS-02',
    path: '/app/winery/account',
    url: '/app/winery/account?mode=demo',
    element: <Account role="winery" />,
    shell: 'winery',
  },
  {
    id: 'OPS-01',
    path: '/app/operations/overview',
    url: '/app/operations/overview?mode=demo',
    element: <OperationsOverview />,
    shell: 'operations',
  },
  {
    id: 'OPS-02',
    path: '/app/operations/participants',
    url: '/app/operations/participants?mode=demo',
    element: <Participants />,
    shell: 'operations',
  },
  {
    id: 'OPS-03',
    path: '/app/operations/participants/:participantId',
    url: '/app/operations/participants/demo-buyer-003?mode=demo',
    element: <ParticipantDetail />,
    shell: 'operations',
  },
  {
    id: 'OPS-04',
    path: '/app/operations/verification',
    url: '/app/operations/verification?mode=demo',
    element: <Verification />,
    shell: 'operations',
  },
  {
    id: 'OPS-05',
    path: '/app/operations/verification/:lotId',
    url: '/app/operations/verification/demo-lot-001?mode=demo',
    element: <VerificationDetail />,
    shell: 'operations',
  },
  {
    id: 'OPS-06',
    path: '/app/operations/redemptions',
    url: '/app/operations/redemptions?mode=demo',
    element: <Redemptions />,
    shell: 'operations',
  },
  {
    id: 'OPS-07',
    path: '/app/operations/redemptions/:redemptionId',
    url: '/app/operations/redemptions/demo-redemption-001?mode=demo',
    element: <RedemptionCase />,
    shell: 'operations',
  },
  {
    id: 'SYS-03',
    path: '/app/operations/account',
    url: '/app/operations/account?mode=demo',
    element: <Account role="operations" />,
    shell: 'operations',
  },
  { id: 'SYS-04', path: '/lots/:lotId', url: '/lots/does-not-exist', element: <PublicLotDetail />, shell: 'public' },
];

function render(screen: Screen, locale?: 'en' | 'fr'): string {
  const routes =
    screen.shell === 'public' ? (
      <Route element={<PublicShell />}>
        <Route path={screen.path} element={screen.element} />
      </Route>
    ) : screen.shell === 'none' ? (
      <Route path={screen.path} element={screen.element} />
    ) : (
      <Route element={<AppShell role={screen.shell} />}>
        <Route path={screen.path} element={screen.element} />
      </Route>
    );

  return renderToStaticMarkup(
    <I18nProvider initialLocale={locale}>
      <MemoryRouter initialEntries={[screen.url]}>
        <EnvironmentProvider>
          <TourProvider>
            <Suspense fallback={null}>
              <Routes>
                {routes}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </TourProvider>
        </EnvironmentProvider>
      </MemoryRouter>
    </I18nProvider>,
  );
}

describe('every route in the manifest renders', () => {
  SCREENS.forEach((screen) => {
    it(`${screen.id} — ${screen.url}`, () => {
      const html = render(screen);
      expect(html).toContain('<h1');
      expect(html).not.toContain('undefined');
      expect(html).not.toContain('NaN');
      // A missing translation key would surface as the raw placeholder.
      expect(html).not.toMatch(/\{[a-z]+\}/i);
    });
  });

  it('an unknown lot id resolves to a not-found screen, not the first fixture', () => {
    const html = render(SCREENS[SCREENS.length - 1]);
    expect(html).not.toContain('Les Terrasses');
  });

  it('the landing page states the offer terms without a wallet prompt', () => {
    const html = render(SCREENS[0]);
    expect(html).toContain('Good wine. A more direct route.');
    expect(html).toContain('€8.40');
    expect(html.toLowerCase()).not.toContain('connect wallet');
  });

  it('renders in French without leaking an English string or a placeholder', () => {
    const html = render(SCREENS[2], 'fr');
    expect(html).toContain('Examiner l’achat'); // the primary call to action
    expect(html).toContain('8,40'); // French decimal comma
    // fr-FR groups with a narrow no-break space, not an ordinary one.
    expect(html).toMatch(/2\s400/u);
    expect(html).toContain('Les jetons sont créés après paiement intégral.');
    expect(html).not.toContain('Per bottle');
    expect(html).not.toContain('September'); // an English month leaking through a formatter
    expect(html).not.toMatch(/\{[a-z]+\}/i);
  });

  it('formats the same amount identically in both locales', () => {
    const en = render(SCREENS[2], 'en');
    const fr = render(SCREENS[2], 'fr');
    expect(en).toContain('€8.40');
    expect(fr).toContain('8,40 €');
  });

  it('the public lot detail shows the exact demo terms', () => {
    const html = render(SCREENS[2]);
    expect(html).toContain('Les Terrasses');
    expect(html).toContain('€8.40');
    expect(html).toContain('2,400 bottles available');
    expect(html).toContain('Tokens are created after full payment.');
  });
});
