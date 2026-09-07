/**
 * Public-safe asset registry.
 *
 * Paths point at files produced by scripts/prepare-media.mjs. Every entry is
 * original artwork generated for this prototype, so nothing here carries a
 * third-party licence. Swapping an entry for a licensed photograph is a change
 * of path plus a credit line, not a code change.
 */

export type AssetId =
  | 'HERO-01'
  | 'ESTATE-01'
  | 'PROCESS-01'
  | 'SOCIAL-01'
  | 'BOTTLE-01'
  | 'BOTTLE-02'
  | 'BOTTLE-03'
  | 'BOTTLE-04'
  | 'BOTTLE-05'
  | 'BOTTLE-06';

const ASSETS: Record<string, { src: string; portrait?: string; width: number; height: number }> = {
  'HERO-01': {
    src: '/media/editorial/vineyard-hero-landscape.svg',
    portrait: '/media/editorial/vineyard-hero-portrait.svg',
    width: 1440,
    height: 1080,
  },
  'ESTATE-01': { src: '/media/editorial/cellar-story.svg', width: 1440, height: 960 },
  'PROCESS-01': { src: '/media/editorial/harvest-detail.svg', width: 1200, height: 900 },
  'SOCIAL-01': { src: '/media/social/palissage-og.svg', width: 1200, height: 630 },
  'BOTTLE-01': { src: '/media/bottles/demo-lot-001.svg', width: 480, height: 640 },
  'BOTTLE-02': { src: '/media/bottles/demo-lot-002.svg', width: 480, height: 640 },
  'BOTTLE-03': { src: '/media/bottles/demo-lot-003.svg', width: 480, height: 640 },
  'BOTTLE-04': { src: '/media/bottles/demo-lot-004.svg', width: 480, height: 640 },
  'BOTTLE-05': { src: '/media/bottles/demo-lot-005.svg', width: 480, height: 640 },
  'BOTTLE-06': { src: '/media/bottles/demo-lot-006.svg', width: 480, height: 640 },
};

export function assetUrl(id: string | undefined, variant: 'default' | 'portrait' = 'default'): string | undefined {
  if (!id) return undefined;
  const asset = ASSETS[id];
  if (!asset) return undefined;
  return variant === 'portrait' ? (asset.portrait ?? asset.src) : asset.src;
}

export function assetSize(id: string | undefined): { width: number; height: number } {
  const asset = id ? ASSETS[id] : undefined;
  return { width: asset?.width ?? 480, height: asset?.height ?? 640 };
}
