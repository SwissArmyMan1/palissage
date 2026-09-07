/**
 * The guided-tour script.
 *
 * Each step says where to go and what to look at. The tour never performs a
 * business action: the presenter still clicks it.
 */

import type { Role } from '@/domain/types';

export type TourStep = {
  id: string;
  /** Screen to open for this step. */
  path: string;
  role: Role;
  titleEn: string;
  titleFr: string;
  bodyEn: string;
  bodyFr: string;
};

export const TOUR_STEPS: TourStep[] = [
  {
    id: 'lot',
    path: '/lots/demo-lot-001',
    role: 'buyer',
    titleEn: 'Read the lot and its terms',
    titleFr: 'Lire le lot et ses conditions',
    bodyEn: 'Les Terrasses — Récolte 2026 is a future release at €8.40 per bottle. Open the documents and the production timeline before reserving.',
    bodyFr: 'Les Terrasses — Récolte 2026 est une cuvée à venir à 8,40 € la bouteille. Consultez les justificatifs et les étapes de production avant de réserver.',
  },
  {
    id: 'reserve',
    path: '/app/buyer/reserve/demo-offer-001',
    role: 'buyer',
    titleEn: 'Reserve 120 bottles with a deposit',
    titleFr: 'Réserver 120 bouteilles avec un acompte',
    bodyEn: '120 × €8.40 is €1,008.00. The 30% deposit is €302.40 now and €705.60 later. No bottle tokens exist yet.',
    bodyFr: '120 × 8,40 € font 1 008,00 €. L’acompte de 30 % représente 302,40 € maintenant et 705,60 € plus tard. Aucun jeton n’existe encore.',
  },
  {
    id: 'roles',
    path: '/app/winery/finance',
    role: 'winery',
    titleEn: 'See the same money from the winery side',
    titleFr: 'Voir les mêmes montants côté domaine',
    bodyEn: 'The deposit is recorded against the offer, and nothing is withdrawable until an operator confirms the release milestone.',
    bodyFr: 'L’acompte est enregistré sur l’offre, et rien n’est retirable tant qu’un opérateur n’a pas confirmé le jalon.',
  },
  {
    id: 'balance',
    path: '/app/buyer/allocations',
    role: 'buyer',
    titleEn: 'Advance the date and pay the balance',
    titleFr: 'Avancer la date et régler le solde',
    bodyEn: 'Use “Advance simulated date” to reach 15 February 2027, then pay €705.60. Full payment issues the 120 bottle balance.',
    bodyFr: 'Utilisez « Avancer la date simulée » pour atteindre le 15 février 2027, puis réglez 705,60 €. Le paiement intégral crée le solde de 120 bouteilles.',
  },
  {
    id: 'resale',
    path: '/app/buyer/secondary',
    role: 'buyer',
    titleEn: 'Resell 24 bottles at €9.20',
    titleFr: 'Revendre 24 bouteilles à 9,20 €',
    bodyEn: 'The buyer gross is €220.80: €6.624 platform fee, €5.52 producer royalty, €208.656 to the seller. Balances become 96 and 24.',
    bodyFr: 'Le montant brut est de 220,80 € : 6,624 € de frais, 5,52 € de redevance, 208,656 € pour le vendeur. Les soldes deviennent 96 et 24.',
  },
  {
    id: 'milestone',
    path: '/app/operations/verification',
    role: 'operations',
    titleEn: 'Confirm the release milestone',
    titleFr: 'Confirmer le jalon de versement',
    bodyEn: 'Once the winery marks the lot ready and submits readiness evidence, operations confirms the milestone. Only then can funds be withdrawn.',
    bodyFr: 'Lorsque le domaine indique le lot prêt et soumet les justificatifs, les opérations confirment le jalon. Les fonds ne sont retirables qu’ensuite.',
  },
  {
    id: 'delivery',
    path: '/app/buyer/deliveries',
    role: 'buyer',
    titleEn: 'Request delivery of 60 bottles',
    titleFr: 'Demander la livraison de 60 bouteilles',
    bodyEn: 'Requested bottles move into delivery escrow: 36 stay spendable, 60 are held. The winery records the shipment and the buyer confirms receipt.',
    bodyFr: 'Les bouteilles demandées passent en séquestre : 36 restent disponibles, 60 sont bloquées. Le domaine enregistre l’expédition et l’acheteur confirme la réception.',
  },
  {
    id: 'passport',
    path: '/passport/demo-passport-001',
    role: 'visitor',
    titleEn: 'End on the public lot passport',
    titleFr: 'Terminer par le passeport public du lot',
    bodyEn: 'The passport closes the story with public provenance only — no buyer, no address, no wallet history.',
    bodyFr: 'Le passeport clôt le parcours avec la seule provenance publique — sans acheteur, adresse ni historique de portefeuille.',
  },
];

