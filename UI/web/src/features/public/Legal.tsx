import { useParams } from 'react-router-dom';
import { useI18n } from '@/app/i18n-context';
import { useFocusHeading } from '@/app/environment-context';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { NotFound } from '@/features/system/EnvironmentGate';

const SLUGS = ['privacy', 'prototype', 'credits'] as const;
type Slug = (typeof SLUGS)[number];

/** PUB-08. Only the three known slugs resolve; anything else is a 404. */
export default function Legal() {
  const { slug } = useParams();
  const { d } = useI18n();
  const valid = SLUGS.includes(slug as Slug) ? (slug as Slug) : undefined;
  useFocusHeading(valid ? d.legal[valid] : d.errors.notFound.title);

  if (!valid) return <NotFound entity="document" />;

  const body =
    valid === 'privacy' ? d.legal.privacyBody : valid === 'prototype' ? d.legal.prototypeBody : d.legal.creditsBody;

  return (
    <div className="container-public max-w-prose py-10 md:py-16">
      <h1 className="h1">{d.legal[valid]}</h1>
      <div className="mt-3">
        <StatusBadge tone="warning">{d.legal.documentStatus}</StatusBadge>
      </div>

      <div className="prose-body mt-8 flex flex-col gap-5 leading-7 text-fg-secondary">
        <p>{body}</p>
        {valid === 'privacy' ? (
          <>
            <p>{d.demo.resetBody}</p>
            <p>{d.testnet.noKeys}</p>
          </>
        ) : null}
        {valid === 'credits' ? (
          <ul className="flex list-disc flex-col gap-2 pl-5">
            <li>HERO-01, ESTATE-01, PROCESS-01 — generated vector illustrations, scripts/prepare-media.mjs</li>
            <li>BOTTLE-01 … BOTTLE-06 — generated bottle mockups for the six sample lots</li>
            <li>SOCIAL-01 — generated link preview</li>
            <li>Fraunces, Inter, JetBrains Mono — self-hosted open-source typefaces</li>
          </ul>
        ) : null}
        <p>{d.legal.publisherPending}</p>
      </div>
    </div>
  );
}
