import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useI18n } from '@/app/i18n-context';
import { useEnvironment, useFocusHeading } from '@/app/environment-context';
import { activityForEntity, passportForLot } from '@/app/selectors';
import { assetUrl } from '@/content/assets';
import { ButtonLink, Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { DefinitionList, SectionHeader } from '@/components/ui/Feedback';
import { LotTimeline } from '@/components/trade/LotTimeline';
import { productionEvents } from '@/components/trade/production-events';
import { EvidencePanel } from '@/components/trade/EvidencePanel';
import { Trellis } from '@/components/layout/Logo';
import { NotFound } from '@/features/system/EnvironmentGate';

/**
 * PAS-01. A public, read-only epilogue. It carries no buyer, no address, no
 * delivery document and no wallet history, and it never claims to prove that
 * a particular physical bottle is authentic.
 */
export default function Passport() {
  const { passportId } = useParams();
  const { d, locale, formatDate } = useI18n();
  const { ledger } = useEnvironment();
  const [copied, setCopied] = useState(false);
  const lot = passportId ? passportForLot(ledger, passportId) : undefined;
  useFocusHeading(lot ? `${lot.name} · ${d.passport.title}` : d.errors.notFound.title);

  if (!lot) return <NotFound entity="passport" />;

  const presentation = ledger.presentations[lot.id];
  const producer = ledger.producers[lot.producerId];
  const publicDocuments = (presentation?.documents ?? []).filter((document) => document.visibility === 'public');
  const events = activityForEntity(ledger, lot.id, 6).filter(
    (item) => item.action === 'lot.verified' || item.action === 'lot.production' || item.action === 'lot.created',
  );

  return (
    <div className="mx-auto w-full max-w-[560px] px-5 py-10">
      <div className="flex items-center justify-between">
        <Link to="/" className="inline-flex items-center gap-2">
          <Trellis className="h-6 w-6 text-accent" />
          <span className="font-serif text-lg">Palissage</span>
        </Link>
        <StatusBadge tone="warning">{d.passport.demoLabel}</StatusBadge>
      </div>

      <figure className="mt-6 overflow-hidden rounded-hero bg-page-subtle">
        <img
          src={assetUrl(presentation?.imageAssetIds[0])}
          alt={d.a11y.lotImage.replace('{name}', lot.name)}
          width={480}
          height={640}
          className="mx-auto max-h-[360px] w-auto object-contain p-6"
        />
      </figure>

      <h1 className="h1 mt-6">{lot.name}</h1>
      <p className="lead mt-2">
        {producer?.displayName} · {lot.region}, {lot.vintage}
      </p>

      <section className="mt-8">
        <SectionHeader as="h3" title={d.passport.wine} />
        <div className="mt-3">
          <DefinitionList
            items={[
              { term: d.lot.vintage, value: lot.vintage },
              { term: d.lot.bottleSize, value: `${lot.bottleSizeMl} ml` },
              { term: d.lot.region, value: lot.region },
              { term: d.lot.grapes, value: lot.grapes || d.common.notProvidedSample },
              { term: d.lot.alcohol, value: presentation?.abv?.value ?? d.common.notProvidedSample },
            ]}
          />
        </div>
      </section>

      <section className="mt-8">
        <SectionHeader as="h3" title={d.passport.producer} />
        <p className="mt-3 text-sm text-fg-secondary">{producer?.story[locale][0]}</p>
        <Link to={`/producers/${lot.producerId}`} className="link mt-2 inline-block text-sm">
          {d.lot.viewProducer}
        </Link>
      </section>

      <section className="mt-8">
        <SectionHeader as="h3" title={d.passport.timeline} />
        <div className="mt-3">
          <LotTimeline label={d.passport.timeline} events={productionEvents(lot.production, d.status.production)} />
        </div>
        {events.length > 0 ? (
          <ul className="mt-4 flex flex-col gap-1 text-sm text-fg-secondary">
            {events.map((event) => (
              <li key={event.id}>
                {d.activity[event.action].replace('{actor}', event.actorLabel).replace('{quantity}', '')} ·{' '}
                {formatDate(event.occurredAt)}
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="mt-8">
        <SectionHeader as="h3" title={d.passport.records} />
        <div className="mt-3">
          <EvidencePanel documents={publicDocuments} emptyLabel={d.common.notProvidedSample} />
        </div>
      </section>

      <p className="caption mt-8 rounded-[8px] bg-page-subtle p-4">{d.passport.sourceNote}</p>

      <div className="mt-6 flex flex-wrap gap-3">
        <ButtonLink to={`/lots/${lot.id}`} variant="secondary">
          {d.passport.viewLot}
        </ButtonLink>
        <Button
          variant="ghost"
          onClick={() => {
            void navigator.clipboard?.writeText(window.location.href).then(() => setCopied(true));
          }}
        >
          {copied ? d.common.copyDone : d.passport.copyLink}
        </Button>
        <ButtonLink to="/" variant="ghost">
          {d.passport.explore}
        </ButtonLink>
      </div>
      <p role="status" className="sr-only">
        {copied ? d.common.copyDone : ''}
      </p>
    </div>
  );
}
