/* Static demo data for the UI — built around four real Cabardès-cluster
   wineries with realistic lot figures, so the screens look populated before
   the contracts are wired up. */

export type LotStatus = 'Draft' | 'Verified' | 'Suspended' | 'Closed';
export type Production =
  | 'Announced'
  | 'Growing'
  | 'Harvested'
  | 'Vinification'
  | 'Aging'
  | 'Bottled'
  | 'Ready for delivery';

export interface Lot {
  id: string;
  name: string;
  winery: string;
  region: string;
  vintage: number;
  grapes: string;
  alcohol: string;
  bottleMl: number;
  price: number;
  releasePrice?: number; // for en primeur
  enPrimeur?: boolean;
  total: number;
  minted: number;
  redeemed: number;
  available: number;
  reserved: number;
  status: LotStatus;
  production: Production;
  royaltyBps: number;
  exportTo: string[];
  img: string | null;
  soldOut?: boolean;
}

export const img = {
  cazabanA1353: '/img/wine/cazaban-a1353.jpg',
  cazabanDemoiselle: '/img/wine/cazaban-demoiselle.jpg',
  cazabanDomaine: '/img/wine/cazaban-domaine-2020.jpg',
  cazabanNaissance: '/img/wine/cazaban-naissance.jpg',
  mijaneGaleaRouge: '/img/wine/mijane-galea-rouge.png',
  mijaneGaleaBlanc: '/img/wine/mijane-galea-blanc.png',
  boticaRissac: '/img/wine/botica-rissac.jpg',
  boticaVillemartin: '/img/wine/botica-villemartin.jpg',
  boticaDeumie: '/img/wine/botica-deumie.jpg',
  parazolsNiAnge: '/img/wine/parazols-niange.jpg',
  rissacVineyard: '/img/estate/rissac-vineyard.jpg',
  rissacDomain: '/img/estate/rissac-domain.jpg',
  deumiePanorama: '/img/estate/deumie-panorama.jpg',
};

export const WINERIES = [
  'Domaine de Cazaban',
  'Domaines Botica Galy',
  'Domaine La Mijane',
  'Domaine Parazols Bertrou',
];

/** Marketplace lots — all four wineries. */
export const marketplaceLots: Lot[] = [
  {
    id: 'caz-a1353-22',
    name: 'A1353 Limousis 2022',
    winery: 'Domaine de Cazaban',
    region: 'Cabardès AOP',
    vintage: 2022,
    grapes: 'Grenache Noir — parcel A1353',
    alcohol: '14.5%',
    bottleMl: 750,
    price: 11.5,
    total: 2400,
    minted: 1760,
    redeemed: 0,
    available: 640,
    reserved: 1760,
    status: 'Verified',
    production: 'Aging',
    royaltyBps: 250,
    exportTo: ['EU', 'UK', 'CH'],
    img: img.cazabanA1353,
  },
  {
    id: 'mij-galea-r-25',
    name: 'Galéa Rouge 2025',
    winery: 'Domaine La Mijane',
    region: 'Cabardès AOC · organic',
    vintage: 2025,
    grapes: 'Merlot 45% · Grenache Noir 45% · Cabernet Franc 10%',
    alcohol: '13.5%',
    bottleMl: 750,
    price: 8.6,
    total: 3900,
    minted: 2700,
    redeemed: 0,
    available: 1200,
    reserved: 2700,
    status: 'Verified',
    production: 'Bottled',
    royaltyBps: 250,
    exportTo: ['EU', 'UK'],
    img: img.mijaneGaleaRouge,
  },
  {
    id: 'bot-rissac-21',
    name: 'Tour de Rissac 2021',
    winery: 'Domaines Botica Galy',
    region: 'Cabardès AOP',
    vintage: 2021,
    grapes: 'Cabernet Franc · Merlot · Syrah · Grenache',
    alcohol: '14.0%',
    bottleMl: 750,
    price: 7.2,
    total: 12000,
    minted: 9600,
    redeemed: 2400,
    available: 2400,
    reserved: 9600,
    status: 'Verified',
    production: 'Ready for delivery',
    royaltyBps: 250,
    exportTo: ['EU', 'UK', 'CH'],
    img: img.boticaRissac,
  },
  {
    id: 'bot-villemartin-26',
    name: 'Villemartin Limoux 2026 Harvest',
    winery: 'Domaines Botica Galy',
    region: 'Limoux AOP',
    vintage: 2026,
    grapes: 'Merlot 50% · Malbec 30% · Cabernet Sauvignon 20%',
    alcohol: '—',
    bottleMl: 750,
    price: 6.1,
    releasePrice: 7.2,
    enPrimeur: true,
    total: 10000,
    minted: 0,
    redeemed: 0,
    available: 2400,
    reserved: 7600,
    status: 'Verified',
    production: 'Announced',
    royaltyBps: 250,
    exportTo: ['EU', 'UK'],
    img: img.boticaVillemartin,
  },
  {
    id: 'par-niange-22',
    name: 'Ni Ange Ni Démon 2022',
    winery: 'Domaine Parazols Bertrou',
    region: 'Cabardès AOP',
    vintage: 2022,
    grapes: 'Cabernet Franc · Merlot · Grenache Noir · Syrah',
    alcohol: '14.0%',
    bottleMl: 750,
    price: 8.9,
    total: 4000,
    minted: 3100,
    redeemed: 0,
    available: 900,
    reserved: 3100,
    status: 'Verified',
    production: 'Bottled',
    royaltyBps: 200,
    exportTo: ['EU'],
    img: img.parazolsNiAnge,
  },
  {
    id: 'caz-demoiselle-22',
    name: 'Demoiselle 2022',
    winery: 'Domaine de Cazaban',
    region: 'Cabardès AOP',
    vintage: 2022,
    grapes: 'Grenache Noir 70% · Syrah 30%',
    alcohol: '14.0%',
    bottleMl: 750,
    price: 9.4,
    total: 6000,
    minted: 6000,
    redeemed: 120,
    available: 0,
    reserved: 6000,
    status: 'Verified',
    production: 'Bottled',
    royaltyBps: 250,
    exportTo: ['EU', 'UK', 'CH'],
    img: img.cazabanDemoiselle,
    soldOut: true,
  },
];

/** Winery-side persona: Domaine de Cazaban. */
export const wineryLots: Lot[] = [
  marketplaceLots[0], // A1353 Limousis 2022
  marketplaceLots[5], // Demoiselle 2022
  {
    id: 'caz-domaine-20',
    name: 'Domaine de Cazaban 2020',
    winery: 'Domaine de Cazaban',
    region: 'Cabardès AOP',
    vintage: 2020,
    grapes: 'Grenache Noir · Syrah',
    alcohol: '14.0%',
    bottleMl: 750,
    price: 13.8,
    total: 3000,
    minted: 2800,
    redeemed: 1200,
    available: 200,
    reserved: 2800,
    status: 'Verified',
    production: 'Ready for delivery',
    royaltyBps: 250,
    exportTo: ['EU', 'UK', 'CH'],
    img: img.cazabanDomaine,
  },
  {
    id: 'caz-naissance-23',
    name: 'Naissance d’un Grand Blanc 2023',
    winery: 'Domaine de Cazaban',
    region: 'Cabardès AOP',
    vintage: 2023,
    grapes: 'Grenache Blanc',
    alcohol: '13.0%',
    bottleMl: 750,
    price: 12.0,
    total: 1500,
    minted: 0,
    redeemed: 0,
    available: 1500,
    reserved: 0,
    status: 'Draft',
    production: 'Announced',
    royaltyBps: 250,
    exportTo: ['EU'],
    img: img.cazabanNaissance,
  },
];

export const PRODUCTION_STEPS: Production[] = [
  'Announced',
  'Growing',
  'Harvested',
  'Vinification',
  'Aging',
  'Bottled',
  'Ready for delivery',
];

export interface Allocation {
  lot: string;
  winery: string;
  qty: number;
  paid: number;
  total: number;
  deadline: string | null;
  state: 'Paid' | 'Reserved' | 'Defaulted' | 'Cancelled';
  action: string | null;
}

export const allocations: Allocation[] = [
  {
    lot: 'Tour de Rissac 2021',
    winery: 'Domaines Botica Galy',
    qty: 2400,
    paid: 17798.4,
    total: 17798.4,
    deadline: null,
    state: 'Paid',
    action: 'Request delivery',
  },
  {
    lot: 'Villemartin Limoux 2026',
    winery: 'Domaines Botica Galy',
    qty: 2400,
    paid: 5339.52,
    total: 17798.4,
    deadline: '15.09.2026',
    state: 'Reserved',
    action: 'Pay remainder',
  },
  {
    lot: 'A1353 Limousis 2022',
    winery: 'Domaine de Cazaban',
    qty: 300,
    paid: 3450.0,
    total: 3450.0,
    deadline: null,
    state: 'Paid',
    action: 'List for sale',
  },
  {
    lot: 'Ni Ange Ni Démon 2022',
    winery: 'Domaine Parazols Bertrou',
    qty: 120,
    paid: 535.68,
    total: 1785.6,
    deadline: '01.06.2026',
    state: 'Defaulted',
    action: null,
  },
];

export interface Participant {
  name: string;
  wallet: string;
  country: string;
  type: 'Winery' | 'B2B buyer' | 'Verifier';
  claims: { label: string; tone: 'success' | 'warning' }[];
  registered: string;
}

export const participants: Participant[] = [
  {
    name: 'Cave Lumière',
    wallet: '0x3Fa4…9C21',
    country: 'FR',
    type: 'B2B buyer',
    claims: [
      { label: 'KYC ✓', tone: 'success' },
      { label: 'KYB ✓', tone: 'success' },
    ],
    registered: '02.05.2026',
  },
  {
    name: 'Domaine de Cazaban',
    wallet: '0x81cD…77f0',
    country: 'FR',
    type: 'Winery',
    claims: [
      { label: 'KYC ✓', tone: 'success' },
      { label: 'KYB ✓', tone: 'success' },
    ],
    registered: '14.04.2026',
  },
  {
    name: 'Domaines Botica Galy',
    wallet: '0x55Ab…120e',
    country: 'FR',
    type: 'Winery',
    claims: [
      { label: 'KYC ✓', tone: 'success' },
      { label: 'KYB ✓', tone: 'success' },
    ],
    registered: '21.04.2026',
  },
  {
    name: 'Domaine La Mijane',
    wallet: '0x4dE2…b8a1',
    country: 'FR',
    type: 'Winery',
    claims: [
      { label: 'KYC ✓', tone: 'success' },
      { label: 'KYB ✓', tone: 'success' },
    ],
    registered: '28.04.2026',
  },
  {
    name: 'Helsinki Wine Co',
    wallet: '0x9921…aa01',
    country: 'FI',
    type: 'B2B buyer',
    claims: [
      { label: 'KYC ✓', tone: 'success' },
      { label: 'KYB review', tone: 'warning' },
    ],
    registered: '08.06.2026',
  },
];

export interface Achievement {
  name: string;
  group: string;
  state: 'unlocked' | 'inProgress' | 'locked';
  sub: string;
}

export const achievements: Achievement[] = [
  { name: 'First Scan', group: 'Explorer', state: 'unlocked', sub: 'Unlocked · 02.06.2026' },
  { name: '5 Wines', group: 'Explorer', state: 'unlocked', sub: 'Unlocked · 28.05.2026' },
  { name: '25 Wines', group: 'Explorer', state: 'inProgress', sub: '12 / 25' },
  { name: '3 Countries', group: 'Explorer', state: 'unlocked', sub: 'Unlocked · 11.05.2026' },
  { name: 'New Region', group: 'Explorer', state: 'locked', sub: 'Locked' },
  { name: '3 Vintages', group: 'Collector', state: 'inProgress', sub: '1 / 3' },
  { name: 'Full Vertical', group: 'Collector', state: 'locked', sub: 'Locked' },
  { name: 'En Primeur Believer', group: 'Collector', state: 'unlocked', sub: 'Unlocked · 30.04.2026' },
  { name: 'Club Member', group: 'Community', state: 'unlocked', sub: 'Unlocked · 15.04.2026' },
  { name: 'Drop Hunter', group: 'Community', state: 'locked', sub: 'Locked' },
  { name: 'Event Guest', group: 'Community', state: 'locked', sub: 'Locked' },
  { name: '10th Bottle Hero', group: 'Loyalty', state: 'inProgress', sub: '7 / 10' },
  { name: 'Returning Customer', group: 'Loyalty', state: 'unlocked', sub: 'Unlocked · 20.05.2026' },
  { name: 'Winery Friend', group: 'Loyalty', state: 'locked', sub: 'Locked' },
];

export interface Quest {
  title: string;
  reward: string;
  desc: string;
  progress: number; // 0..1
  label: string;
  state: 'active' | 'completed' | 'claimed';
}

export const quests: Quest[] = [
  {
    title: 'Buy 10, get 1 free',
    reward: 'Free bottle',
    desc: 'Buy bottles of the same wine — the 10th is free',
    progress: 0.7,
    label: '7 / 10',
    state: 'active',
  },
  {
    title: 'Scan 5 different wines',
    reward: '−10% next order',
    desc: 'Discover the Cabardès cluster, one bottle at a time',
    progress: 1,
    label: '5 / 5 — completed!',
    state: 'completed',
  },
  {
    title: 'Collect 3 vintages of one winery',
    reward: 'Early access',
    desc: 'Get early access to new releases',
    progress: 0.33,
    label: '1 / 3',
    state: 'active',
  },
];

export interface Scan {
  name: string;
  winery: string;
  date: string;
  img: string;
  reward?: boolean;
}

export const scans: Scan[] = [
  { name: 'Cabardès Rouge 2021', winery: 'Château Tour de Rissac', date: 'Scanned 02.06.2026', img: img.boticaRissac, reward: true },
  { name: 'A1353 Limousis 2022', winery: 'Domaine de Cazaban', date: 'Scanned 28.05.2026', img: img.cazabanA1353 },
  { name: 'Galéa Rouge 2025', winery: 'Domaine La Mijane', date: 'Scanned 11.05.2026', img: img.mijaneGaleaRouge },
];

export const activity = [
  { icon: 'shield-check', text: 'Lot “Demoiselle 2022” verified', time: '2h ago' },
  { icon: 'user', text: 'Cave Lumière reserved 2 400 bottles', time: '5h ago' },
  { icon: 'landmark', text: 'Milestone “Harvest” released €9 645.00', time: '1d ago' },
  { icon: 'truck', text: 'Redemption #R-118 marked shipped', time: '2d ago' },
] as const;

export function eur(n: number): string {
  return (
    '€' +
    n
      .toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      .replace(/ /g, ' ')
      .replace(/,/g, ' ')
      .replace(/\.(\d{2})$/, '.$1')
  );
}

export function qty(n: number): string {
  return n.toLocaleString('en-US').replace(/ /g, ' ').replace(/,/g, ' ');
}
