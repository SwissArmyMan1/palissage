/**
 * The canonical demonstration dataset.
 *
 * Every value here comes from specifications/ui-mvp/05-content-and-demo-data.md
 * §6. All organisations, wines, prices and documents are fictional. IDs are
 * fixed strings — never generated randomly — so a reset reproduces the exact
 * same ledger, balances and history.
 */

import type {
  Allocation,
  ClaimSummary,
  DataOrigin,
  DeliveryDestination,
  DocumentRef,
  EntityId,
  LotPresentation,
  LotRecord,
  Money,
  OfferSettlement,
  ParticipantSummary,
  Position,
  PrimaryOffer,
  ProducerProfile,
  WineColor,
} from '@/domain/types';
import { DEMO_TOKEN, money, totalDue, zero } from '@/domain/money';
import { GRANT } from '@/domain/capabilities';
import { GENERATED_DOCUMENT_META } from '@/content/documents.generated';
import type { Ledger, ScenarioPreset } from '../types';

export const SCENARIO_ID = 'palissage-demo-v1';
export const SCENARIO_VERSION = 1;
export const SCENARIO_START = '2026-09-07T08:00:00Z';
export const DEMO_TIMEZONE = 'Europe/Paris';

export const DEMO_PRIMARY_FEE_BPS = 300;
/** Deliberately different from the contract default of 200 bps; testnet reads the real value. */
export const DEMO_SECONDARY_FEE_BPS = 300;
export const DEMO_ROYALTY_BPS = 250;

export const MAIN_LOT_ID = 'demo-lot-001';
export const MAIN_OFFER_ID = 'demo-offer-001';
export const MAIN_BUYER_ID = 'demo-buyer-001';
export const RESALE_BUYER_ID = 'demo-buyer-002';
export const MAIN_PRODUCER_ID = 'demo-producer-001';
export const OPERATOR_ID = 'demo-operator-001';
export const MAIN_PASSPORT_ID = 'demo-passport-001';

/** Explicit narrative dates the presenter advances by hand. */
export const CLOCK_STAGES = [
  { id: 'balance-due', toIso: '2027-02-15T09:00:00Z', labelKey: 'demo.stage.balanceDue' },
  { id: 'ready', toIso: '2027-06-15T09:00:00Z', labelKey: 'demo.stage.ready' },
] as const;

const fixtureOrigin: DataOrigin = { kind: 'fixture', scenarioId: SCENARIO_ID, version: SCENARIO_VERSION };
const editorialOrigin: DataOrigin = { kind: 'editorial', revision: 'ui-mvp-1.0' };

function eur(amount: string): Money {
  // `amount` is written as plain euros with two decimals for readability.
  const [whole, fraction = ''] = amount.split('.');
  return money(BigInt(whole + fraction.padEnd(DEMO_TOKEN.decimals, '0')), DEMO_TOKEN);
}

export const PRICE_PER_BOTTLE: Record<EntityId, Money> = {
  'demo-lot-001': eur('8.40'),
  'demo-lot-002': eur('11.20'),
  'demo-lot-003': eur('9.60'),
  'demo-lot-004': eur('7.80'),
  'demo-lot-005': eur('10.00'),
  'demo-lot-006': eur('12.40'),
};

/* ------------------------------------------------------------------ */
/* Producers and participants                                          */
/* ------------------------------------------------------------------ */

const producerStories: Record<EntityId, { en: string[]; fr: string[]; approachEn: string; approachFr: string }> = {
  'demo-producer-001': {
    en: [
      'A fictional independent winery used to demonstrate how a producer offers current and future wine lots through Palissage. The wines, quantities, documents, and commercial terms on this page are sample data.',
      'Three terraced parcels are described in this sample as the origin of the estate name. The parcels, their size, and their history are invented for the demonstration.',
    ],
    fr: [
      'Un domaine indépendant fictif illustrant la manière dont un producteur propose des lots disponibles et futurs sur Palissage. Les vins, quantités, documents et conditions commerciales de cette page sont des données de démonstration.',
      'Trois parcelles en terrasses sont décrites dans cet exemple comme l’origine du nom du domaine. Les parcelles, leur superficie et leur histoire sont inventées pour la démonstration.',
    ],
    approachEn:
      'The sample producer records each lot with its quantity, production stage, and supporting documents before an offer is published.',
    approachFr:
      'Le producteur fictif enregistre chaque lot avec sa quantité, son étape de production et ses justificatifs avant la publication d’une offre.',
  },
  'demo-producer-002': {
    en: [
      'A fictional independent winery created for this demonstration. It is used to show a catalogue with more than one producer and to compare offers side by side.',
      'Its wines, volumes, and records are sample data. No real estate, appellation, or certification is represented.',
    ],
    fr: [
      'Un domaine indépendant fictif créé pour cette démonstration. Il permet de présenter un catalogue comportant plusieurs producteurs et de comparer les offres.',
      'Ses vins, volumes et justificatifs sont des données de démonstration. Aucun domaine, appellation ou certification réels ne sont représentés.',
    ],
    approachEn: 'The sample producer publishes ready-to-deliver lots and lots still in the bottling stage.',
    approachFr: 'Le producteur fictif publie des lots prêts à livrer et des lots encore en cours de mise en bouteille.',
  },
  'demo-producer-003': {
    en: [
      'A fictional independent winery created for this demonstration. It illustrates a future release alongside a fully allocated lot.',
      'Its wines, volumes, and records are sample data. No real estate, appellation, or certification is represented.',
    ],
    fr: [
      'Un domaine indépendant fictif créé pour cette démonstration. Il illustre une future cuvée aux côtés d’un lot entièrement attribué.',
      'Ses vins, volumes et justificatifs sont des données de démonstration. Aucun domaine, appellation ou certification réels ne sont représentés.',
    ],
    approachEn: 'The sample producer keeps one future release open while an earlier lot is fully allocated.',
    approachFr: 'Le producteur fictif garde une future cuvée ouverte tandis qu’un lot antérieur est entièrement attribué.',
  },
};

export const PRODUCERS: Record<EntityId, ProducerProfile> = {
  'demo-producer-001': {
    id: 'demo-producer-001',
    slug: 'domaine-des-trois-terrasses',
    displayName: 'Domaine des Trois Terrasses',
    country: 'FR',
    region: 'Occitanie',
    story: { en: producerStories['demo-producer-001'].en, fr: producerStories['demo-producer-001'].fr },
    approach: {
      en: producerStories['demo-producer-001'].approachEn,
      fr: producerStories['demo-producer-001'].approachFr,
    },
    assetIds: ['ESTATE-01'],
    evidence: 'illustrative',
    origin: editorialOrigin,
  },
  'demo-producer-002': {
    id: 'demo-producer-002',
    slug: 'atelier-des-vignes-claires',
    displayName: 'Atelier des Vignes Claires',
    country: 'FR',
    region: 'Occitanie',
    story: { en: producerStories['demo-producer-002'].en, fr: producerStories['demo-producer-002'].fr },
    approach: {
      en: producerStories['demo-producer-002'].approachEn,
      fr: producerStories['demo-producer-002'].approachFr,
    },
    assetIds: ['ESTATE-01'],
    evidence: 'illustrative',
    origin: editorialOrigin,
  },
  'demo-producer-003': {
    id: 'demo-producer-003',
    slug: 'domaine-du-vent-calme',
    displayName: 'Domaine du Vent Calme',
    country: 'FR',
    region: 'Occitanie',
    story: { en: producerStories['demo-producer-003'].en, fr: producerStories['demo-producer-003'].fr },
    approach: {
      en: producerStories['demo-producer-003'].approachEn,
      fr: producerStories['demo-producer-003'].approachFr,
    },
    assetIds: ['ESTATE-01'],
    evidence: 'illustrative',
    origin: editorialOrigin,
  },
};

function claim(topic: string, expiresAt?: string): ClaimSummary {
  return {
    topic,
    issuerLabel: 'Palissage review desk — demo',
    issuedAt: '2026-06-01T09:00:00Z',
    expiresAt,
    valid: true,
    origin: fixtureOrigin,
  };
}

function grants(entries: Record<string, boolean>): Record<string, import('@/domain/types').Capability> {
  const checkedAt = SCENARIO_START;
  const out: Record<string, import('@/domain/types').Capability> = {};
  for (const [key, allowed] of Object.entries(entries)) {
    out[key] = allowed ? { allowed: true, checkedAt } : { allowed: false, reasonCode: 'MISSING_CONTRACT_ROLE', checkedAt };
  }
  return out;
}

export const PARTICIPANTS: Record<EntityId, ParticipantSummary> = {
  'demo-producer-001': {
    id: 'demo-producer-001',
    role: 'winery',
    type: 'winery',
    displayLabel: 'Domaine des Trois Terrasses',
    country: 'FR',
    wallet: 'demo-wallet-winery-001',
    registryVerified: true,
    claims: [claim('WINERY_QUALIFICATION', '2027-12-31T22:59:59Z')],
    contractGrants: grants({ [GRANT.tokenVerifier]: false, [GRANT.primaryVerifier]: false }),
    reviewState: 'accepted',
    lastUpdatedAt: '2026-06-01T09:00:00Z',
    origin: fixtureOrigin,
  },
  'demo-producer-002': {
    id: 'demo-producer-002',
    role: 'winery',
    type: 'winery',
    displayLabel: 'Atelier des Vignes Claires',
    country: 'FR',
    wallet: 'demo-wallet-winery-002',
    registryVerified: true,
    claims: [claim('WINERY_QUALIFICATION', '2027-12-31T22:59:59Z')],
    contractGrants: grants({ [GRANT.tokenVerifier]: false }),
    reviewState: 'accepted',
    lastUpdatedAt: '2026-06-01T09:00:00Z',
    origin: fixtureOrigin,
  },
  'demo-producer-003': {
    id: 'demo-producer-003',
    role: 'winery',
    type: 'winery',
    displayLabel: 'Domaine du Vent Calme',
    country: 'FR',
    wallet: 'demo-wallet-winery-003',
    registryVerified: true,
    claims: [claim('WINERY_QUALIFICATION', '2027-12-31T22:59:59Z')],
    contractGrants: grants({ [GRANT.tokenVerifier]: false }),
    reviewState: 'accepted',
    lastUpdatedAt: '2026-06-01T09:00:00Z',
    origin: fixtureOrigin,
  },
  'demo-buyer-001': {
    id: 'demo-buyer-001',
    role: 'buyer',
    type: 'restaurant',
    displayLabel: 'Maison Rivage — demo',
    country: 'FR',
    wallet: 'demo-wallet-buyer-001',
    registryVerified: true,
    claims: [claim('B2B_BUYER', '2027-12-31T22:59:59Z')],
    contractGrants: grants({}),
    reviewState: 'accepted',
    lastUpdatedAt: '2026-06-14T09:00:00Z',
    origin: fixtureOrigin,
  },
  'demo-buyer-002': {
    id: 'demo-buyer-002',
    role: 'buyer',
    type: 'wine_shop',
    displayLabel: 'Cave du Passage — demo',
    country: 'FR',
    wallet: 'demo-wallet-buyer-002',
    registryVerified: true,
    claims: [claim('B2B_BUYER', '2027-12-31T22:59:59Z')],
    contractGrants: grants({}),
    reviewState: 'accepted',
    lastUpdatedAt: '2026-06-14T09:00:00Z',
    origin: fixtureOrigin,
  },
  'demo-operator-001': {
    id: 'demo-operator-001',
    role: 'operations',
    type: 'operations',
    displayLabel: 'Palissage review desk — demo',
    country: 'FR',
    wallet: 'demo-wallet-operations-001',
    registryVerified: true,
    claims: [claim('OPERATIONS_DESK')],
    contractGrants: grants({
      [GRANT.gatewayAdmin]: true,
      [GRANT.tokenVerifier]: true,
      [GRANT.primaryVerifier]: true,
      [GRANT.redemptionVerifier]: true,
      // Enforcement stays out of the ordinary review workflow.
      [GRANT.tokenEnforcer]: false,
      [GRANT.primaryAdmin]: false,
    }),
    reviewState: 'accepted',
    lastUpdatedAt: '2026-06-01T09:00:00Z',
    origin: fixtureOrigin,
  },
  // Awaiting review, so the operations queue is not empty on a fresh reset.
  'demo-buyer-003': {
    id: 'demo-buyer-003',
    role: 'buyer',
    type: 'importer',
    displayLabel: 'Comptoir Meridien — demo',
    country: 'BE',
    wallet: 'demo-wallet-buyer-003',
    registryVerified: false,
    claims: [{ ...claim('B2B_BUYER'), valid: false, issuedAt: undefined }],
    contractGrants: grants({}),
    reviewState: 'submitted',
    lastUpdatedAt: '2026-09-02T10:20:00Z',
    origin: fixtureOrigin,
  },
};

/* ------------------------------------------------------------------ */
/* Documents                                                           */
/* ------------------------------------------------------------------ */

function doc(
  id: EntityId,
  label: string,
  kind: string,
  file: string,
  visibility: DocumentRef['visibility'] = 'public',
  evidence: DocumentRef['evidence'] = 'document_available',
): DocumentRef {
  // Size and digest come from the file the media script actually produced.
  const meta = GENERATED_DOCUMENT_META[file];
  return {
    id,
    label,
    kind,
    visibility,
    mediaType: 'application/pdf',
    byteSize: meta?.byteSize ?? 0,
    digest: meta?.digest,
    digestAlgorithm: 'sha256',
    evidence,
    uri: `/demo-documents/${file}`,
    origin: fixtureOrigin,
  };
}

export const DOCUMENTS: Record<EntityId, DocumentRef> = Object.fromEntries(
  [
    doc('demo-doc-producer-001', 'Producer declaration', 'producer_declaration', 'producer-001-declaration.pdf'),
    doc('demo-doc-lot-001', 'Lot specification', 'lot_record', 'lot-001-record.pdf'),
    doc('demo-doc-lot-001-review', 'Lot review record', 'lot_review', 'lot-001-review.pdf', 'public', 'reviewed'),
    doc('demo-doc-lot-001-production', 'Production record', 'production_record', 'lot-001-production.pdf'),
    doc('demo-doc-lot-001-readiness', 'Readiness record', 'readiness_record', 'lot-001-readiness.pdf'),
    doc('demo-doc-lot-002', 'Lot specification', 'lot_record', 'lot-002-record.pdf'),
    doc('demo-doc-lot-003', 'Lot specification', 'lot_record', 'lot-003-record.pdf'),
    doc('demo-doc-lot-004', 'Lot specification', 'lot_record', 'lot-004-record.pdf'),
    doc('demo-doc-lot-005', 'Lot specification', 'lot_record', 'lot-005-record.pdf'),
    doc('demo-doc-lot-006', 'Lot specification', 'lot_record', 'lot-006-record.pdf'),
    doc('demo-doc-shipment-001', 'Shipment record', 'shipment_record', 'redemption-001-shipment.pdf', 'participants'),
  ].map((entry) => [entry.id, entry]),
);

/* ------------------------------------------------------------------ */
/* Lots, presentations and offers                                      */
/* ------------------------------------------------------------------ */

type LotSeed = {
  id: EntityId;
  producerId: EntityId;
  name: string;
  color: WineColor;
  vintage: number;
  totalBottles: number;
  production: LotRecord['production'];
  offerKind: PrimaryOffer['kind'];
  depositBps: number;
  endTime: string;
  fullPaymentDeadline: string;
  expectedReadyAt: string;
  descriptionEn: string;
  descriptionFr: string;
  documentIds: EntityId[];
};

const LOT_SEEDS: LotSeed[] = [
  {
    id: 'demo-lot-001',
    producerId: 'demo-producer-001',
    name: 'Les Terrasses — Récolte 2026',
    color: 'red',
    vintage: 2026,
    totalBottles: 2400,
    production: 'Growing',
    offerKind: 'EnPrimeur',
    depositBps: 3000,
    endTime: '2026-10-31T22:59:59Z',
    fullPaymentDeadline: '2027-02-28T22:59:59Z',
    expectedReadyAt: '2027-06-15T08:00:00Z',
    descriptionEn:
      'A future red release illustrating deposit-based reservations, staged production, and a later request for delivery.',
    descriptionFr:
      'Une future cuvée rouge illustrant la réservation avec acompte, les étapes de production et la demande de livraison ultérieure.',
    documentIds: ['demo-doc-lot-001', 'demo-doc-lot-001-review'],
  },
  {
    id: 'demo-lot-002',
    producerId: 'demo-producer-001',
    name: 'Les Pierres Claires',
    color: 'red',
    vintage: 2024,
    totalBottles: 1200,
    production: 'ReadyForDelivery',
    offerKind: 'Standard',
    depositBps: 0,
    endTime: '2027-12-31T22:59:59Z',
    fullPaymentDeadline: '2027-12-31T22:59:59Z',
    expectedReadyAt: '2026-09-01T08:00:00Z',
    descriptionEn: 'A ready-for-delivery red lot for exploring a full-payment purchase and physical fulfilment.',
    descriptionFr:
      'Un lot de vin rouge prêt à livrer pour découvrir l’achat avec paiement intégral et la livraison physique.',
    documentIds: ['demo-doc-lot-002'],
  },
  {
    id: 'demo-lot-003',
    producerId: 'demo-producer-002',
    name: 'Lumière Blanche',
    color: 'white',
    vintage: 2025,
    totalBottles: 600,
    production: 'ReadyForDelivery',
    offerKind: 'Standard',
    depositBps: 0,
    endTime: '2027-12-31T22:59:59Z',
    fullPaymentDeadline: '2027-12-31T22:59:59Z',
    expectedReadyAt: '2026-09-01T08:00:00Z',
    descriptionEn: 'A white wine sample with a smaller available quantity for catalogue and allocation workflows.',
    descriptionFr:
      'Un vin blanc de démonstration avec une quantité disponible plus limitée pour explorer le catalogue et les réservations.',
    documentIds: ['demo-doc-lot-003'],
  },
  {
    id: 'demo-lot-004',
    producerId: 'demo-producer-002',
    name: 'Rosée du Matin',
    color: 'rose',
    vintage: 2025,
    totalBottles: 1800,
    production: 'Bottled',
    offerKind: 'Standard',
    depositBps: 0,
    endTime: '2027-12-31T22:59:59Z',
    fullPaymentDeadline: '2027-12-31T22:59:59Z',
    expectedReadyAt: '2026-10-15T08:00:00Z',
    descriptionEn:
      'A rosé sample in the bottling stage. Delivery requests become available only after readiness is confirmed.',
    descriptionFr:
      'Un rosé de démonstration en cours de mise en bouteille. La livraison devient disponible après confirmation de sa disponibilité.',
    documentIds: ['demo-doc-lot-004'],
  },
  {
    id: 'demo-lot-005',
    producerId: 'demo-producer-003',
    name: 'Première Lueur — Récolte 2026',
    color: 'white',
    vintage: 2026,
    totalBottles: 1200,
    production: 'Growing',
    offerKind: 'EnPrimeur',
    depositBps: 3000,
    endTime: '2026-11-30T22:59:59Z',
    fullPaymentDeadline: '2027-03-31T21:59:59Z',
    expectedReadyAt: '2027-07-01T08:00:00Z',
    descriptionEn: 'A future white release used to compare production dates and payment terms.',
    descriptionFr: 'Une future cuvée blanche permettant de comparer les dates de production et les modalités de paiement.',
    documentIds: ['demo-doc-lot-005'],
  },
  {
    id: 'demo-lot-006',
    producerId: 'demo-producer-003',
    name: 'La Ligne des Vignes',
    color: 'red',
    vintage: 2024,
    totalBottles: 600,
    production: 'ReadyForDelivery',
    offerKind: 'Standard',
    depositBps: 0,
    endTime: '2027-12-31T22:59:59Z',
    fullPaymentDeadline: '2027-12-31T22:59:59Z',
    expectedReadyAt: '2026-09-01T08:00:00Z',
    descriptionEn:
      'A fully allocated sample lot. Primary reservations are closed; eligible holders may explore secondary offers.',
    descriptionFr:
      'Un lot de démonstration entièrement attribué. Les réservations primaires sont closes ; les détenteurs éligibles peuvent explorer les offres secondaires.',
    documentIds: ['demo-doc-lot-006'],
  },
];

export const LOT_SEED_BY_ID: Record<EntityId, LotSeed> = Object.fromEntries(LOT_SEEDS.map((s) => [s.id, s]));

function lotRecord(seed: LotSeed, minted: number): LotRecord {
  return {
    id: seed.id,
    producerId: seed.producerId,
    winery: PARTICIPANTS[seed.producerId].wallet,
    name: seed.name,
    region: 'Occitanie',
    grapes: '',
    vintage: seed.vintage,
    totalBottles: seed.totalBottles,
    mintedBottles: minted,
    redeemedBottles: 0,
    bottleSizeMl: 750,
    royaltyBps: DEMO_ROYALTY_BPS,
    exportAllowed: true,
    status: 'Verified',
    production: seed.production,
    verifier: PARTICIPANTS[OPERATOR_ID].wallet,
    docsHash: `0x${seed.id.replace(/\D/g, '').padStart(64, 'd')}` as `0x${string}`,
    origin: fixtureOrigin,
  };
}

function presentation(seed: LotSeed, index: number): LotPresentation {
  return {
    lotId: seed.id,
    revision: 1,
    title: { en: seed.name, fr: seed.name },
    producerSlug: PRODUCERS[seed.producerId].slug,
    color: seed.color,
    description: { en: seed.descriptionEn, fr: seed.descriptionFr },
    imageAssetIds: [`BOTTLE-0${index + 1}`],
    documents: seed.documentIds.map((id) => DOCUMENTS[id]).filter(Boolean),
    expectedAvailability: { value: seed.expectedReadyAt, origin: fixtureOrigin, evidence: 'self_reported' },
    caseSize: 6,
    minOrderBottles: 6,
    originCountry: 'FR',
    certifications: [],
    tradeTerms: {
      shipping: 'quote_required',
      taxes: 'not_calculated',
      allowedDestinations: ['FR', 'BE', 'DE', 'NL'],
    },
  };
}

function offerRecord(seed: LotSeed, index: number, reserved: number): PrimaryOffer {
  return {
    id: `demo-offer-00${index + 1}`,
    lotId: seed.id,
    winery: PARTICIPANTS[seed.producerId].wallet,
    paymentToken: DEMO_TOKEN.token,
    pricePerBottle: PRICE_PER_BOTTLE[seed.id],
    quantity: seed.totalBottles,
    reserved,
    startTime: '2026-09-01T08:00:00Z',
    endTime: seed.endTime,
    depositBps: seed.depositBps,
    fullPaymentDeadline: seed.fullPaymentDeadline,
    kind: seed.offerKind,
    active: true,
    origin: fixtureOrigin,
  };
}

function settlementRecord(offerId: EntityId, settledFunds: Money): OfferSettlement {
  return {
    offerId,
    settledFunds,
    withdrawnGross: zero(),
    releasedBps: 0,
    primaryFeeBps: DEMO_PRIMARY_FEE_BPS,
    milestones: [{ index: 0, bps: 10_000, released: false, description: 'Full release on delivery readiness' }],
    origin: fixtureOrigin,
  };
}

export const SAMPLE_DESTINATION: DeliveryDestination = {
  id: 'demo-address-001',
  recipient: 'Maison Rivage — demo',
  contact: 'Camille Dupont — demo',
  email: 'orders@maison-rivage.example',
  phone: '+33 1 23 45 67 89',
  country: 'FR',
  line1: '12 quai des Exemples',
  city: 'Sète',
  postalCode: '34200',
};

export const SAMPLE_DESTINATION_2: DeliveryDestination = {
  id: 'demo-address-002',
  recipient: 'Cave du Passage — demo',
  contact: 'Louis Martin — demo',
  email: 'achats@cave-du-passage.example',
  phone: '+33 1 98 76 54 32',
  country: 'FR',
  line1: '3 rue de la Démonstration',
  city: 'Montpellier',
  postalCode: '34000',
};

function positionKey(accountId: EntityId, lotId: EntityId): string {
  return `${accountId}:${lotId}`;
}

function position(accountId: EntityId, lotId: EntityId, wallet: number): Position {
  return {
    accountId,
    lotId,
    walletBottles: wallet,
    frozenBottles: 0,
    redemptionEscrowBottles: 0,
    origin: fixtureOrigin,
  };
}

/* ------------------------------------------------------------------ */
/* Preset construction                                                 */
/* ------------------------------------------------------------------ */

function baseLedger(): Ledger {
  const lots: Record<EntityId, LotRecord> = {};
  const presentations: Record<EntityId, LotPresentation> = {};
  const offers: Record<EntityId, PrimaryOffer> = {};
  const settlements: Record<EntityId, OfferSettlement> = {};

  LOT_SEEDS.forEach((seed, index) => {
    // lot 006 arrives fully allocated to demo-buyer-002 through a seeded sale.
    const soldOut = seed.id === 'demo-lot-006';
    lots[seed.id] = lotRecord(seed, soldOut ? seed.totalBottles : 0);
    presentations[seed.id] = presentation(seed, index);
    const offer = offerRecord(seed, index, soldOut ? seed.totalBottles : 0);
    offers[offer.id] = offer;
    settlements[offer.id] = settlementRecord(
      offer.id,
      soldOut ? totalDue(PRICE_PER_BOTTLE[seed.id], seed.totalBottles) : zero(),
    );
  });

  const seedAllocation: Allocation = {
    id: 'demo-allocation-seed-006',
    offerId: 'demo-offer-006',
    buyerId: RESALE_BUYER_ID,
    quantity: 600,
    pricePerBottle: PRICE_PER_BOTTLE['demo-lot-006'],
    totalDue: eur('7440.00'),
    paidAmount: eur('7440.00'),
    createdAt: '2026-07-15T09:30:00Z',
    state: 'Paid',
    origin: fixtureOrigin,
  };

  return {
    scenarioId: SCENARIO_ID,
    version: SCENARIO_VERSION,
    nowIso: SCENARIO_START,
    sequence: 0,
    markets: { primaryPaused: false, secondaryPaused: false },
    primaryFeeBps: DEMO_PRIMARY_FEE_BPS,
    secondaryFeeBps: DEMO_SECONDARY_FEE_BPS,
    participants: structuredClone(PARTICIPANTS),
    producers: structuredClone(PRODUCERS),
    lots,
    presentations,
    offers,
    settlements,
    allocations: { [seedAllocation.id]: seedAllocation },
    positions: { [positionKey(RESALE_BUYER_ID, 'demo-lot-006')]: position(RESALE_BUYER_ID, 'demo-lot-006', 600) },
    listings: {},
    trades: {},
    redemptions: {},
    cases: {},
    documents: structuredClone(DOCUMENTS),
    reviews: {},
    drafts: {},
    destinations: {
      [SAMPLE_DESTINATION.id]: SAMPLE_DESTINATION,
      [SAMPLE_DESTINATION_2.id]: SAMPLE_DESTINATION_2,
    },
    cash: {
      // buyer002 started with 22,440 and has already paid 7,440 for lot 006.
      [MAIN_BUYER_ID]: eur('10000.00'),
      [RESALE_BUYER_ID]: eur('15000.00'),
      'demo-buyer-003': eur('0.00'),
      'demo-producer-001': zero(),
      'demo-producer-002': zero(),
      'demo-producer-003': zero(),
    },
    activity: [
      {
        id: 'demo-activity-seed-001',
        entityType: 'allocation',
        entityId: seedAllocation.id,
        action: 'allocation.paid',
        actorId: RESALE_BUYER_ID,
        actorLabel: PARTICIPANTS[RESALE_BUYER_ID].displayLabel,
        occurredAt: seedAllocation.createdAt,
        sequence: 0,
        quantity: 600,
        amount: seedAllocation.paidAmount,
        origin: fixtureOrigin,
      },
    ],
    receipts: {},
    counters: { allocation: 0, listing: 0, redemption: 0, offer: 6, lot: 6, case: 0, review: 0, activity: 1, receipt: 0 },
  };
}

/** `buyer-ready` — the commission's default entry point. */
export function buyerReadyLedger(): Ledger {
  return baseLedger();
}

/** `producer-start` — the main lot and offer do not exist yet. */
export function producerStartLedger(): Ledger {
  const ledger = baseLedger();
  delete ledger.lots[MAIN_LOT_ID];
  delete ledger.presentations[MAIN_LOT_ID];
  delete ledger.offers[MAIN_OFFER_ID];
  delete ledger.settlements[MAIN_OFFER_ID];
  ledger.counters.lot = 6;
  return ledger;
}

/** `delivery-ready` — 120 bottles fully paid, lot ready, nothing shipped yet. */
export function deliveryReadyLedger(): Ledger {
  const ledger = baseLedger();
  const offer = ledger.offers[MAIN_OFFER_ID];
  const quantity = 120;
  const total = totalDue(offer.pricePerBottle, quantity);
  ledger.nowIso = '2027-06-15T09:00:00Z';
  offer.reserved = quantity;
  ledger.allocations['demo-allocation-001'] = {
    id: 'demo-allocation-001',
    offerId: MAIN_OFFER_ID,
    buyerId: MAIN_BUYER_ID,
    quantity,
    pricePerBottle: offer.pricePerBottle,
    totalDue: total,
    paidAmount: total,
    createdAt: '2026-09-07T09:10:00Z',
    state: 'Paid',
    origin: fixtureOrigin,
  };
  ledger.settlements[MAIN_OFFER_ID].settledFunds = total;
  ledger.lots[MAIN_LOT_ID].mintedBottles = quantity;
  ledger.lots[MAIN_LOT_ID].production = 'ReadyForDelivery';
  ledger.positions[positionKey(MAIN_BUYER_ID, MAIN_LOT_ID)] = position(MAIN_BUYER_ID, MAIN_LOT_ID, quantity);
  ledger.cash[MAIN_BUYER_ID] = eur('8992.00');
  ledger.counters.allocation = 1;
  return ledger;
}

/**
 * `issues` — an isolated copy carrying the failure branches used in acceptance:
 * a suspended lot, an expired buyer qualification and a paused secondary market.
 */
export function issuesLedger(): Ledger {
  const ledger = baseLedger();
  ledger.lots['demo-lot-004'].status = 'Suspended';
  ledger.markets.secondaryPaused = true;
  const buyer = ledger.participants['demo-buyer-002'];
  buyer.claims = buyer.claims.map((c) => ({ ...c, expiresAt: '2026-08-31T22:59:59Z' }));
  ledger.cash[MAIN_BUYER_ID] = eur('120.00');
  return ledger;
}

export function ledgerForPreset(preset: ScenarioPreset): Ledger {
  switch (preset) {
    case 'producer-start':
      return producerStartLedger();
    case 'delivery-ready':
      return deliveryReadyLedger();
    case 'issues':
      return issuesLedger();
    case 'buyer-ready':
    default:
      return buyerReadyLedger();
  }
}

export { positionKey, eur };
