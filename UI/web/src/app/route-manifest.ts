/**
 * Canonical routes and their screen IDs.
 *
 * The IDs are the contract used by the specification, the guided demo and any
 * end-to-end test, so a new screen is added here and in the router together.
 */

import type { Role } from '@/domain/types';

export type ScreenId =
  | 'PUB-01' | 'PUB-02' | 'PUB-03' | 'PUB-04' | 'PUB-05' | 'PUB-06' | 'PUB-07' | 'PUB-08'
  | 'BUY-01' | 'BUY-02' | 'BUY-03' | 'BUY-04' | 'BUY-05' | 'BUY-06' | 'BUY-07' | 'BUY-08' | 'BUY-09'
  | 'WIN-01' | 'WIN-02' | 'WIN-03' | 'WIN-04' | 'WIN-05' | 'WIN-06' | 'WIN-07'
  | 'OPS-01' | 'OPS-02' | 'OPS-03' | 'OPS-04' | 'OPS-05' | 'OPS-06' | 'OPS-07'
  | 'PAS-01'
  | 'SYS-01' | 'SYS-02' | 'SYS-03' | 'SYS-04' | 'SYS-05' | 'SYS-07' | 'SYS-08';

export type RouteEntry = { id: ScreenId; path: string; roles?: Role[] };

export const ROUTES: RouteEntry[] = [
  { id: 'PUB-01', path: '/' },
  { id: 'PUB-02', path: '/marketplace' },
  { id: 'PUB-03', path: '/lots/:lotId' },
  { id: 'PUB-04', path: '/producers/:producerId' },
  { id: 'PUB-05', path: '/demo' },
  { id: 'PUB-06', path: '/testnet' },
  { id: 'PUB-07', path: '/pilot' },
  { id: 'PUB-08', path: '/legal/:slug' },
  { id: 'PAS-01', path: '/passport/:passportId' },
  { id: 'SYS-07', path: '/app/marketplace' },
  { id: 'SYS-08', path: '/app/lots/:lotId' },
  { id: 'BUY-01', path: '/app/buyer/overview', roles: ['buyer'] },
  { id: 'BUY-02', path: '/app/buyer/allocations', roles: ['buyer'] },
  { id: 'BUY-03', path: '/app/buyer/allocations/:allocationId', roles: ['buyer'] },
  { id: 'BUY-04', path: '/app/buyer/reserve/:offerId', roles: ['buyer'] },
  { id: 'BUY-05', path: '/app/buyer/secondary', roles: ['buyer'] },
  { id: 'BUY-06', path: '/app/buyer/secondary/:listingId', roles: ['buyer'] },
  { id: 'BUY-07', path: '/app/buyer/deliveries', roles: ['buyer'] },
  { id: 'BUY-08', path: '/app/buyer/deliveries/:redemptionId', roles: ['buyer'] },
  { id: 'BUY-09', path: '/app/buyer/positions/:lotId', roles: ['buyer'] },
  { id: 'SYS-01', path: '/app/buyer/account', roles: ['buyer'] },
  { id: 'WIN-01', path: '/app/winery/overview', roles: ['winery'] },
  { id: 'WIN-02', path: '/app/winery/lots', roles: ['winery'] },
  { id: 'WIN-03', path: '/app/winery/lots/new', roles: ['winery'] },
  { id: 'WIN-04', path: '/app/winery/lots/:lotId', roles: ['winery'] },
  { id: 'WIN-05', path: '/app/winery/finance', roles: ['winery'] },
  { id: 'WIN-06', path: '/app/winery/deliveries', roles: ['winery'] },
  { id: 'WIN-07', path: '/app/winery/deliveries/:redemptionId', roles: ['winery'] },
  { id: 'SYS-02', path: '/app/winery/account', roles: ['winery'] },
  { id: 'OPS-01', path: '/app/operations/overview', roles: ['operations'] },
  { id: 'OPS-02', path: '/app/operations/participants', roles: ['operations'] },
  { id: 'OPS-03', path: '/app/operations/participants/:participantId', roles: ['operations'] },
  { id: 'OPS-04', path: '/app/operations/verification', roles: ['operations'] },
  { id: 'OPS-05', path: '/app/operations/verification/:lotId', roles: ['operations'] },
  { id: 'OPS-06', path: '/app/operations/redemptions', roles: ['operations'] },
  { id: 'OPS-07', path: '/app/operations/redemptions/:redemptionId', roles: ['operations'] },
  { id: 'SYS-03', path: '/app/operations/account', roles: ['operations'] },
];

/** Legacy zones from the previous interface redirect to their replacement. */
export const LEGACY_REDIRECTS: { from: string; to: string }[] = [
  { from: '/shop', to: '/app/marketplace' },
  { from: '/shop/portfolio', to: '/app/buyer/allocations' },
  { from: '/shop/secondary', to: '/app/buyer/secondary' },
  { from: '/winery', to: '/app/winery/overview' },
  { from: '/winery/lots', to: '/app/winery/lots' },
  { from: '/winery/finance', to: '/app/winery/finance' },
  { from: '/admin', to: '/app/operations/overview' },
  { from: '/admin/participants', to: '/app/operations/participants' },
  { from: '/admin/verification', to: '/app/operations/verification' },
  { from: '/sign-in', to: '/demo' },
  // The old consumer zone only ever had a passport; it maps to the sample one.
  { from: '/consumer', to: '/passport/demo-passport-001' },
  { from: '/consumer/passport', to: '/passport/demo-passport-001' },
  { from: '/consumer/achievements', to: '/passport/demo-passport-001' },
];

export const HOME_FOR_ROLE: Record<Role, string> = {
  buyer: '/app/buyer/overview',
  winery: '/app/winery/overview',
  operations: '/app/operations/overview',
  visitor: '/demo',
};

/** Only relative in-app paths are accepted as a return target. */
export function safeReturnTo(value: string | null): string | undefined {
  if (!value) return undefined;
  if (!value.startsWith('/') || value.startsWith('//')) return undefined;
  return value;
}
