import { useParams } from 'react-router-dom';
import { useI18n } from '@/app/i18n-context';
import { useEnvironment, useFocusHeading } from '@/app/environment-context';
import { catalogue } from '@/app/selectors';
import { assetUrl } from '@/content/assets';
import { LotCard } from '@/components/trade/LotCard';
import { ButtonLink } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState, SectionHeader } from '@/components/ui/Feedback';
import { EvidencePanel } from '@/components/trade/EvidencePanel';
import { NotFound } from '@/features/system/EnvironmentGate';

/** PUB-04. A fictional producer, labelled as one everywhere it is named. */
export default function Producer() {
  const { producerId } = useParams();
  const { d, locale } = useI18n();
  const { ledger } = useEnvironment();
  const producer = producerId ? ledger.producers[producerId] : undefined;
  useFocusHeading(producer?.displayName ?? d.errors.notFound.title);

  if (!producer) return <NotFound entity={d.producer.eyebrow} />;

  const lots = catalogue(ledger).filter((entry) => entry.lot.producerId === producer.id);
  const documents = ledger.documents['demo-doc-producer-001'] && producer.id === 'demo-producer-001'
    ? [ledger.documents['demo-doc-producer-001']]
    : [];

  return (
    <div className="container-public py-10 md:py-14">
      <div className="grid gap-10 md:grid-cols-[1.1fr_1fr] md:items-start md:gap-14">
        <div>
          <p className="caption tracking-[0.18em] text-accent">{d.producer.eyebrow}</p>
          <h1 className="h1 mt-3">{producer.displayName}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <StatusBadge tone="warning">{d.producer.fictional}</StatusBadge>
            <span className="caption">{d.producer.location}</span>
          </div>
          <div className="prose-body mt-6 flex flex-col gap-4 text-fg-secondary">
            {producer.story[locale].map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>
        </div>
        <figure className="overflow-hidden rounded-hero bg-page-subtle">
          <img
            src={assetUrl(producer.assetIds[0])}
            alt={d.a11y.estateImage}
            width={1440}
            height={960}
            className="aspect-[3/2] w-full object-cover"
          />
          <figcaption className="caption p-3">{d.common.illustrativeImage}</figcaption>
        </figure>
      </div>

      <section className="mt-14">
        <SectionHeader title={d.producer.offers} />
        <div className="mt-6">
          {lots.length === 0 ? (
            <EmptyState
              title={d.producer.noOffers}
              body={d.empty.noResults.body}
              action={<ButtonLink to="/marketplace" variant="secondary">{d.marketplace.title}</ButtonLink>}
            />
          ) : (
            <ul className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {lots.map((entry) => (
                <li key={entry.lot.id} className="relative">
                  <LotCard entry={entry} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="mt-14">
        <SectionHeader title={d.producer.records} />
        <div className="mt-6 max-w-2xl">
          <EvidencePanel documents={documents} emptyLabel={d.common.notProvidedSample} />
        </div>
      </section>

      <section className="mt-14 max-w-prose">
        <SectionHeader title={d.producer.about} />
        <p className="mt-4 text-fg-secondary">{producer.approach[locale]}</p>
        <div className="mt-6">
          <ButtonLink to="/pilot?role=buyer" variant="secondary">
            {d.producer.tradeCta}
          </ButtonLink>
        </div>
      </section>
    </div>
  );
}
