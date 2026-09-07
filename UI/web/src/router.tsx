import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { EnvironmentProvider } from '@/app/environment';
import { TourProvider } from '@/app/demo-tour';
import { LEGACY_REDIRECTS } from '@/app/route-manifest';
import { PublicShell } from '@/components/layout/PublicShell';
import { AppShell } from '@/components/layout/AppShell';
import { LoadingBlock } from '@/components/ui/Feedback';
import { NotFound } from '@/features/system/EnvironmentGate';
import { DemoToolbar } from '@/features/demo/DemoToolbar';

// The public pages and the workspace load as separate chunks, so a visitor
// reading the landing page never downloads the workspace bundle.
const Landing = lazy(() => import('@/features/public/Landing'));
const Marketplace = lazy(() => import('@/features/public/Marketplace'));
const PublicLotDetail = lazy(() => import('@/features/public/LotDetail'));
const Producer = lazy(() => import('@/features/public/Producer'));
const Pilot = lazy(() => import('@/features/public/Pilot'));
const Testnet = lazy(() => import('@/features/public/Testnet'));
const Legal = lazy(() => import('@/features/public/Legal'));
const DemoLauncher = lazy(() => import('@/features/demo/Launcher'));
const Passport = lazy(() => import('@/features/passport/Passport'));

const AppMarketplace = lazy(() => import('@/features/app/AppMarketplace'));
const AppLotDetail = lazy(() => import('@/features/app/AppLotDetail'));

const BuyerOverview = lazy(() => import('@/features/buyer/Overview'));
const Allocations = lazy(() => import('@/features/buyer/Allocations'));
const AllocationDetail = lazy(() => import('@/features/buyer/AllocationDetail'));
const Reserve = lazy(() => import('@/features/buyer/Reserve'));
const Secondary = lazy(() => import('@/features/buyer/Secondary'));
const SecondaryPurchase = lazy(() => import('@/features/buyer/SecondaryPurchase'));
const PositionDetail = lazy(() => import('@/features/buyer/PositionDetail'));
const BuyerDeliveries = lazy(() => import('@/features/fulfilment/BuyerDeliveries'));
const BuyerDeliveryDetail = lazy(() => import('@/features/fulfilment/BuyerDeliveryDetail'));

const WineryOverview = lazy(() => import('@/features/winery/Overview'));
const WineryLots = lazy(() => import('@/features/winery/Lots'));
const CreateLot = lazy(() => import('@/features/winery/CreateLot'));
const WineryLotDetail = lazy(() => import('@/features/winery/LotDetail'));
const Finance = lazy(() => import('@/features/winery/Finance'));
const WineryDeliveries = lazy(() => import('@/features/fulfilment/WineryDeliveries'));
const WineryDeliveryDetail = lazy(() => import('@/features/fulfilment/WineryDeliveryDetail'));

const OperationsOverview = lazy(() => import('@/features/operations/Overview'));
const Participants = lazy(() => import('@/features/operations/Participants'));
const ParticipantDetail = lazy(() => import('@/features/operations/ParticipantDetail'));
const Verification = lazy(() => import('@/features/operations/Verification'));
const VerificationDetail = lazy(() => import('@/features/operations/VerificationDetail'));
const Redemptions = lazy(() => import('@/features/operations/Redemptions'));
const RedemptionCase = lazy(() => import('@/features/operations/RedemptionCase'));
const Account = lazy(() => import('@/features/account/Account'));

function Loading() {
  return (
    <div className="container-public py-16">
      <LoadingBlock label="Loading" />
    </div>
  );
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <EnvironmentProvider>
        <TourProvider>
          <Suspense fallback={<Loading />}>
            <DemoToolbar />
            <Routes>
              {/* Public site */}
              <Route element={<PublicShell />}>
                <Route path="/" element={<Landing />} />
                <Route path="/marketplace" element={<Marketplace />} />
                <Route path="/lots/:lotId" element={<PublicLotDetail />} />
                <Route path="/producers/:producerId" element={<Producer />} />
                <Route path="/demo" element={<DemoLauncher />} />
                <Route path="/testnet" element={<Testnet />} />
                <Route path="/pilot" element={<Pilot />} />
                <Route path="/legal/:slug" element={<Legal />} />
              </Route>

              {/* The passport is its own mobile-first surface. */}
              <Route path="/passport/:passportId" element={<Passport />} />

              {/* Buyer workspace */}
              <Route element={<AppShell role="buyer" />}>
                <Route path="/app/buyer/overview" element={<BuyerOverview />} />
                <Route path="/app/buyer/allocations" element={<Allocations />} />
                <Route path="/app/buyer/allocations/:allocationId" element={<AllocationDetail />} />
                <Route path="/app/buyer/reserve/:offerId" element={<Reserve />} />
                <Route path="/app/buyer/secondary" element={<Secondary />} />
                <Route path="/app/buyer/secondary/:listingId" element={<SecondaryPurchase />} />
                <Route path="/app/buyer/positions/:lotId" element={<PositionDetail />} />
                <Route path="/app/buyer/deliveries" element={<BuyerDeliveries />} />
                <Route path="/app/buyer/deliveries/:redemptionId" element={<BuyerDeliveryDetail />} />
                <Route path="/app/buyer/account" element={<Account role="buyer" />} />
                {/* Catalogue of the selected environment, shared with the public one. */}
                <Route path="/app/marketplace" element={<AppMarketplace />} />
                <Route path="/app/lots/:lotId" element={<AppLotDetail />} />
              </Route>

              {/* Winery workspace */}
              <Route element={<AppShell role="winery" />}>
                <Route path="/app/winery/overview" element={<WineryOverview />} />
                <Route path="/app/winery/lots" element={<WineryLots />} />
                <Route path="/app/winery/lots/new" element={<CreateLot />} />
                <Route path="/app/winery/lots/:lotId" element={<WineryLotDetail />} />
                <Route path="/app/winery/finance" element={<Finance />} />
                <Route path="/app/winery/deliveries" element={<WineryDeliveries />} />
                <Route path="/app/winery/deliveries/:redemptionId" element={<WineryDeliveryDetail />} />
                <Route path="/app/winery/account" element={<Account role="winery" />} />
              </Route>

              {/* Operations workspace */}
              <Route element={<AppShell role="operations" />}>
                <Route path="/app/operations/overview" element={<OperationsOverview />} />
                <Route path="/app/operations/participants" element={<Participants />} />
                <Route path="/app/operations/participants/:participantId" element={<ParticipantDetail />} />
                <Route path="/app/operations/verification" element={<Verification />} />
                <Route path="/app/operations/verification/:lotId" element={<VerificationDetail />} />
                <Route path="/app/operations/redemptions" element={<Redemptions />} />
                <Route path="/app/operations/redemptions/:redemptionId" element={<RedemptionCase />} />
                <Route path="/app/operations/account" element={<Account role="operations" />} />
              </Route>

              {/* Zones from the previous interface keep working as redirects. */}
              {LEGACY_REDIRECTS.map((entry) => (
                <Route key={entry.from} path={entry.from} element={<Navigate to={entry.to} replace />} />
              ))}

              {/* An unknown identifier is a 404, never the first fixture. */}
              <Route element={<PublicShell />}>
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </Suspense>
        </TourProvider>
      </EnvironmentProvider>
    </BrowserRouter>
  );
}
