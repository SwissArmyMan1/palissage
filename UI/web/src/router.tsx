import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ZONE, zoneBase } from '@/lib/zone';
import { wineryNav, shopNav, adminNav } from '@/lib/nav';
import { RoleShell } from '@/components/layout/DashboardLayout';
import { ConsumerShell } from '@/components/layout/ConsumerShell';
import { PublicShell } from '@/components/layout/PublicShell';

import Landing from '@/pages/public/Landing';
import SignIn from '@/pages/public/SignIn';
import { Placeholder } from '@/pages/Placeholder';

import WineryDashboard from '@/pages/winery/Dashboard';
import WineryLots from '@/pages/winery/Lots';
import WineryLotDetail from '@/pages/winery/LotDetail';
import WineryFinance from '@/pages/winery/Finance';

import Marketplace from '@/pages/shop/Marketplace';
import ShopLotDetail from '@/pages/shop/LotDetail';
import Portfolio from '@/pages/shop/Portfolio';

import AdminOverview from '@/pages/admin/Overview';
import Participants from '@/pages/admin/Participants';
import Verification from '@/pages/admin/Verification';

import ScanLanding from '@/pages/consumer/ScanLanding';
import Passport from '@/pages/consumer/Passport';
import Achievements from '@/pages/consumer/Achievements';

function wineryTree(base: string) {
  return (
    <Route key="winery" path={base || '/'} element={<RoleShell nav={wineryNav} role="winery" />}>
      <Route index element={<WineryDashboard />} />
      <Route path="lots" element={<WineryLots />} />
      <Route path="lots/:id" element={<WineryLotDetail />} />
      <Route path="finance" element={<WineryFinance />} />
      <Route path="deliveries" element={<Placeholder title="Deliveries" text="Redemption requests — Requested → Shipped → Completed. (P1)" />} />
    </Route>
  );
}

function shopTree(base: string) {
  return (
    <Route key="shop" path={base || '/'} element={<RoleShell nav={shopNav} role="shop" />}>
      <Route index element={<Marketplace />} />
      <Route path="lot/:id" element={<ShopLotDetail />} />
      <Route path="portfolio" element={<Portfolio />} />
      <Route path="secondary" element={<Placeholder title="Secondary market" text="Buy & list allocations on the whitelisted secondary market. (P1)" />} />
      <Route path="profile" element={<Placeholder title="Account settings" text="Email for invoices & notifications, appearance. (P1)" />} />
    </Route>
  );
}

function adminTree(base: string) {
  return (
    <Route key="admin" path={base || '/'} element={<RoleShell nav={adminNav} role="admin" />}>
      <Route index element={<AdminOverview />} />
      <Route path="participants" element={<Participants />} />
      <Route path="verification" element={<Verification />} />
      <Route path="settings" element={<Placeholder title="Protocol settings" text="Fees (bps), treasury, payment tokens, trusted issuers. (P1)" />} />
    </Route>
  );
}

function consumerTree(base: string) {
  return (
    <Route key="consumer" path={base || '/'} element={<ConsumerShell />}>
      <Route index element={<ScanLanding />} />
      <Route path="passport" element={<Passport />} />
      <Route path="achievements" element={<Achievements />} />
      <Route path="profile" element={<Placeholder title="Profile" text="Appearance, membership passes, account. (P1)" />} />
    </Route>
  );
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {ZONE === 'public' && (
          <Route element={<PublicShell />}>
            <Route path="/" element={<Landing />} />
            <Route path="/sign-in" element={<SignIn />} />
          </Route>
        )}
        {ZONE !== 'public' && (
          <Route element={<PublicShell />}>
            <Route path="/sign-in" element={<SignIn />} />
          </Route>
        )}

        {(ZONE === 'public' || ZONE === 'winery') && wineryTree(zoneBase('winery'))}
        {(ZONE === 'public' || ZONE === 'shop') && shopTree(zoneBase('shop'))}
        {(ZONE === 'public' || ZONE === 'admin') && adminTree(zoneBase('admin'))}
        {(ZONE === 'public' || ZONE === 'consumer') && consumerTree(zoneBase('consumer'))}

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
