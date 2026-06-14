/**
 * Role metadata — the four signed-in zones plus the demo wallet identity each
 * one uses in test mode. Pure data (no JSX) so it can be imported anywhere.
 */
import type { Zone } from './zone';

/** A signed-in role = any zone except the public marketing site. */
export type Role = Exclude<Zone, 'public'>;

export interface RoleMeta {
  role: Role;
  /** Label shown in the top bar / wallet area. */
  label: string;
  /** Truncated demo wallet address shown in the wallet chip (test mode). */
  address: string;
  /** Whether this demo identity is KYB-verified (drives the chip badge). */
  kyb: boolean;
  /** One-line description used in the test-mode role chooser. */
  tagline: string;
}

/** Order the roles are offered in the test-mode chooser. */
export const ROLE_ORDER: Role[] = ['admin', 'shop', 'winery', 'consumer'];

/**
 * RoleGateway `Role` enum (Solidity): None=0, Admin=1, Winery=2, Shop=3, Consumer=4.
 * These map the on-chain enum to/from the UI role strings.
 */
export const ROLE_ENUM: Record<Role, number> = {
  admin: 1,
  winery: 2,
  shop: 3,
  consumer: 4,
};

export function roleFromEnum(value: number): Role | null {
  switch (value) {
    case 1:
      return 'admin';
    case 2:
      return 'winery';
    case 3:
      return 'shop';
    case 4:
      return 'consumer';
    default:
      return null;
  }
}

/** Claim topics (mirror of `ClaimTopicsLib`) used for the live role fallback. */
export const CLAIM_TOPIC = {
  kyc: 1n,
  winery: 3n,
  b2bBuyer: 4n,
} as const;

export const ROLE_META: Record<Role, RoleMeta> = {
  admin: {
    role: 'admin',
    label: 'Admin',
    address: '0x71bE…04D8',
    kyb: true,
    tagline: 'Protocol operator — verify lots, manage members & settings',
  },
  shop: {
    role: 'shop',
    label: 'Shop',
    address: '0x3Fa4…9C21',
    kyb: true,
    tagline: 'Shop or importer — buy verified lots, track your portfolio',
  },
  winery: {
    role: 'winery',
    label: 'Winery',
    address: '0x81cD…77f0',
    kyb: true,
    tagline: 'Producer — publish lots, run En Primeur, follow finance',
  },
  consumer: {
    role: 'consumer',
    label: 'Collector',
    address: '0x9E2a…5C7b',
    kyb: false,
    tagline: 'Wine lover — scan bottles, loyalty passport & rewards',
  },
};
