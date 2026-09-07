import { Link } from 'react-router-dom';
import type { CatalogueEntry } from '@/app/selectors';
import { useI18n } from '@/app/i18n-context';
import { formatMoney } from '@/domain/money';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { assetUrl } from '@/content/assets';

/**
 * One routing link on the title. The producer link sits outside the card
 * anchor so there is never an interactive element inside an interactive one.
 */
export function LotCard({ entry, basePath = '/lots' }: { entry: CatalogueEntry; basePath?: string }) {
  const { d, locale, fmt, formatNumber, formatDate } = useI18n();
  const { lot, offer, presentation, producerName, available, state } = entry;
  const image = presentation ? assetUrl(presentation.imageAssetIds[0]) : undefined;

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-panel border border-line bg-surface transition-shadow duration-[var(--motion-base)] ease-standard hover:shadow-hover">
      <div className="relative aspect-[4/3] overflow-hidden bg-page-subtle">
        {image ? (
          <img
            src={image}
            alt={fmt(d.a11y.lotImage, { name: lot.name })}
            width={480}
            height={360}
            loading="lazy"
            className="h-full w-full object-contain p-4 transition-transform duration-[var(--motion-panel)] ease-standard motion-reduce:transform-none md:group-hover:scale-[1.025]"
          />
        ) : null}
        <span className="absolute left-3 top-3">
          <StatusBadge tone="warning">{d.marketplace.sampleBadge}</StatusBadge>
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="min-w-0">
          <p className="caption truncate">
            {producerName} · {lot.region}
          </p>
          <h3 className="h3 mt-1">
            <Link
              to={`${basePath}/${lot.id}`}
              className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none"
            >
              {lot.name}
            </Link>
          </h3>
          <p className="caption mt-1">
            {lot.vintage} · {d.status.production[lot.production]}
          </p>
        </div>

        <div className="mt-auto flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="tabular text-xl font-semibold">
              {offer ? formatMoney(offer.pricePerBottle, locale) : d.common.notProvided}
            </p>
            <p className="caption">{d.price.unit}</p>
          </div>
          <div className="text-right">
            <StatusBadge tone={offer?.kind === 'EnPrimeur' ? 'accent' : 'neutral'}>
              {offer?.kind === 'EnPrimeur' ? d.lot.enPrimeur : d.lot.standard}
            </StatusBadge>
            <p className="caption mt-1.5">
              {state === 'sold_out' || available === 0
                ? d.lot.soldOut
                : fmt(d.lot.availableBottles, { count: formatNumber(available) })}
            </p>
          </div>
        </div>

        {presentation?.expectedAvailability ? (
          <p className="caption border-t border-line pt-3">
            {d.lot.expectedReadiness}: {formatDate(presentation.expectedAvailability.value)} · {d.lot.estimated}
          </p>
        ) : null}
      </div>
    </article>
  );
}
