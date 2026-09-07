import { useI18n } from '@/app/i18n-context';
import { MarketplaceView } from '@/features/public/Marketplace';

/**
 * SYS-07. The same catalogue presentation as the public one, but sourced from
 * the selected environment's adapter, so a testnet buyer sees real offers
 * rather than the public sample set.
 */
export default function AppMarketplace() {
  const { d } = useI18n();
  return <MarketplaceView basePath="/app/lots" title={d.nav.exploreLots} />;
}
