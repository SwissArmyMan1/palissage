import { Link } from 'react-router-dom';
import { useI18n } from '@/app/i18n-context';
import { useEnvironment, useFocusHeading } from '@/app/environment-context';
import { catalogue } from '@/app/selectors';
import { MAIN_LOT_ID } from '@/adapters/demo/fixtures';
import { formatMoney } from '@/domain/money';
import { assetUrl } from '@/content/assets';
import { ButtonLink } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Trellis } from '@/components/layout/Logo';
import { Reveal } from '@/components/ui/Reveal';

export default function Landing() {
  const { d, locale, fmt, formatDate, formatNumber } = useI18n();
  const { ledger } = useEnvironment();
  useFocusHeading(d.home.title);

  const entries = catalogue(ledger);
  const featured = entries.find((entry) => entry.lot.id === MAIN_LOT_ID) ?? entries[0];

  return (
    <>
      {/* Hero: 7/5 editorial split. Heading, price and CTA are readable in the
          first frame — nothing essential waits for an animation. */}
      <section className="container-public grid items-center gap-10 py-12 md:py-16 xl:grid-cols-12 xl:gap-16 xl:py-20">
        <div className="xl:col-span-7">
          <p className="caption tracking-[0.18em] text-accent">{d.home.eyebrow}</p>
          <h1 className="display mt-4 max-w-[17ch]">{d.home.title}</h1>
          <p className="lead mt-6">{d.home.lead}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink to="/demo" size="hero">
              {d.home.primary}
            </ButtonLink>
            <ButtonLink to="/marketplace" size="hero" variant="secondary">
              {d.home.secondary}
            </ButtonLink>
          </div>
          <p className="caption mt-4">{d.home.demoNote}</p>
        </div>

        <div className="xl:col-span-5">
          <figure className="relative overflow-hidden rounded-hero bg-page-subtle">
            <img
              src={assetUrl('HERO-01', 'portrait')}
              alt={d.a11y.heroImage}
              width={1000}
              height={1250}
              fetchPriority="high"
              className="aspect-[4/3] w-full object-cover xl:aspect-[4/5]"
            />
            {featured ? (
              <figcaption className="absolute inset-x-3 bottom-3 rounded-[12px] bg-surface p-4">
                <p className="caption">{d.home.heroLotEyebrow}</p>
                <p className="mt-1 font-medium">{featured.lot.name}</p>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <span className="tabular font-semibold">
                    {featured.offer ? formatMoney(featured.offer.pricePerBottle, locale) : ''}
                  </span>
                  <div className="flex items-center gap-2">
                    <StatusBadge tone="accent">{d.lot.enPrimeur}</StatusBadge>
                    <StatusBadge tone="warning">{d.marketplace.sampleBadge}</StatusBadge>
                  </div>
                </div>
                <Link to={`/lots/${featured.lot.id}`} className="link mt-2 inline-block text-sm">
                  {d.home.sampleCta}
                </Link>
              </figcaption>
            ) : null}
          </figure>
          <p className="caption mt-2">
            {d.home.imageCaption} · {d.common.illustrativeImage}
          </p>
        </div>
      </section>

      {/* Context: one quiet editorial band, not a grid of identical cards. */}
      <section className="border-y border-line bg-page-subtle">
        <div className="container-public grid gap-6 py-14 md:grid-cols-[1fr_1.4fr] md:py-20">
          <h2 className="h2">{d.home.contextHeading}</h2>
          <p className="prose-body text-lg leading-8 text-fg-secondary">{d.home.contextBody}</p>
        </div>
      </section>

      <section id="for-wineries" className="container-public section-gap">
        <Reveal className="grid items-center gap-10 md:grid-cols-2 md:gap-16">
          <div>
            <h2 className="h2">{d.home.wineriesHeading}</h2>
            <p className="prose-body mt-4 text-fg-secondary">{d.home.wineriesBody}</p>
            <ul className="mt-6 flex flex-col gap-3">
              {d.home.wineriesPoints.map((point) => (
                <li key={point} className="flex items-start gap-3 text-sm">
                  <Trellis className="mt-0.5 h-5 w-5 shrink-0 text-vine" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
            <div className="mt-8">
              <ButtonLink to="/demo?role=winery&scenario=producer-start" variant="secondary">
                {d.home.wineriesCta}
              </ButtonLink>
            </div>
          </div>
          <figure className="overflow-hidden rounded-hero bg-page-subtle">
            <img
              src={assetUrl('PROCESS-01')}
              alt={d.a11y.estateImage}
              width={1200}
              height={900}
              loading="lazy"
              className="aspect-[4/3] w-full object-cover"
            />
          </figure>
        </Reveal>
      </section>

      {/* Featured lot for buyers, with the terms visible rather than teased. */}
      <section id="for-buyers" className="border-y border-line bg-page-subtle">
        <div className="container-public section-gap">
          <Reveal className="grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:gap-16">
            <div>
              <h2 className="h2">{d.home.buyersHeading}</h2>
              <p className="prose-body mt-4 text-fg-secondary">{d.home.buyersBody}</p>
              <div className="mt-8">
                <ButtonLink to="/demo?role=buyer&scenario=buyer-ready">{d.home.buyersCta}</ButtonLink>
              </div>
            </div>
            {featured?.offer ? (
              <div className="panel">
                <div className="flex items-start gap-4">
                  <img
                    src={assetUrl(featured.presentation?.imageAssetIds[0])}
                    alt={fmt(d.a11y.lotImage, { name: featured.lot.name })}
                    width={480}
                    height={640}
                    loading="lazy"
                    className="h-32 w-24 shrink-0 object-contain"
                  />
                  <div className="min-w-0">
                    <p className="caption">
                      {featured.producerName} · {featured.lot.region}
                    </p>
                    <h3 className="h3 mt-1">{featured.lot.name}</h3>
                    <p className="caption mt-1">
                      {featured.lot.vintage} · {d.status.production[featured.lot.production]}
                    </p>
                  </div>
                </div>
                <dl className="mt-5 flex flex-col gap-2 border-t border-line pt-4 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-fg-secondary">{d.price.unit}</dt>
                    <dd className="tabular font-semibold">{formatMoney(featured.offer.pricePerBottle, locale)}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-fg-secondary">{d.lot.availability}</dt>
                    <dd className="tabular">{fmt(d.lot.availableBottles, { count: formatNumber(featured.available) })}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-fg-secondary">{d.lot.expectedReadiness}</dt>
                    <dd>{formatDate(featured.presentation?.expectedAvailability?.value)}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-fg-secondary">{d.lot.offerCloses}</dt>
                    <dd>{formatDate(featured.offer.endTime, { withTime: true })}</dd>
                  </div>
                </dl>
                <p className="caption mt-3">{d.price.exclusions}</p>
                <div className="mt-4">
                  <ButtonLink to={`/lots/${featured.lot.id}`} variant="secondary" fullWidth>
                    {d.home.sampleCta}
                  </ButtonLink>
                </div>
              </div>
            ) : null}
          </Reveal>
        </div>
      </section>

      {/* The trellis line: five stages, described rather than marked complete. */}
      <section id="how-it-works" className="container-public section-gap">
        <h2 className="h2 max-w-[18ch]">{d.home.stepsHeading}</h2>
        <ol className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-5 xl:gap-4">
          {d.home.steps.map((step, index) => (
            <li key={step.title} className="relative flex flex-col gap-2 border-t-2 border-line pt-4">
              <span className="caption tabular text-accent">{String(index + 1).padStart(2, '0')}</span>
              <h3 className="text-base font-semibold">{step.title}</h3>
              <p className="text-sm text-fg-secondary">{step.body}</p>
              {index === 3 ? (
                <p className="mt-1 text-sm font-medium text-vine">↳ {d.home.stepsBranch}</p>
              ) : null}
            </li>
          ))}
        </ol>
      </section>

      <section className="border-y border-line bg-page-subtle">
        <div className="container-public section-gap">
          <Reveal className="grid gap-10 md:grid-cols-[1fr_1.2fr] md:gap-16">
            <div>
              <h2 className="h2">{d.home.recordHeading}</h2>
              <ul className="mt-6 flex flex-col gap-2">
                {d.home.recordPoints.map((point) => (
                  <li key={point} className="flex items-center gap-3 text-sm font-medium">
                    <span className="h-px w-6 bg-accent" aria-hidden="true" />
                    {point}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="prose-body text-fg-secondary">{d.home.recordBody}</p>
              <Link to="/pilot#technology" className="link mt-4 inline-block text-sm">
                {d.home.recordLink}
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="container-public section-gap">
        <Reveal className="grid gap-10 md:grid-cols-2 md:items-center md:gap-16">
          <figure className="overflow-hidden rounded-hero">
            <img
              src={assetUrl('ESTATE-01')}
              alt={d.a11y.estateImage}
              width={1440}
              height={960}
              loading="lazy"
              className="aspect-[3/2] w-full object-cover"
            />
          </figure>
          <div>
            <h2 className="h2">{d.home.pilotHeading}</h2>
            <p className="prose-body mt-4 text-fg-secondary">{d.home.pilotBody}</p>
            <div className="mt-8">
              <ButtonLink to="/pilot">{d.home.pilotCta}</ButtonLink>
            </div>
          </div>
        </Reveal>
      </section>

      <section className="border-t border-line bg-page-subtle">
        <div className="container-public section-gap">
          <h2 className="h2">{d.home.faqHeading}</h2>
          <div className="mt-8 max-w-prose">
            {Object.entries(d.faq).map(([key, entry]) => (
              <details key={key} className="group border-b border-line py-4">
                <summary className="flex cursor-pointer items-center justify-between gap-4 text-base font-medium">
                  {entry.q}
                  <span
                    aria-hidden="true"
                    className="transition-transform duration-[var(--motion-base)] ease-standard group-open:rotate-180 motion-reduce:transition-none"
                  >
                    <svg width="12" height="8" viewBox="0 0 12 8">
                      <path d="M1 1.5 6 6.5 11 1.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                    </svg>
                  </span>
                </summary>
                <p className="mt-3 text-sm leading-6 text-fg-secondary">{entry.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
