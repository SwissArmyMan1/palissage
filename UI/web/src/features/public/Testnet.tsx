import { useI18n } from '@/app/i18n-context';
import { useEnvironment, useFocusHeading } from '@/app/environment-context';
import { ButtonLink } from '@/components/ui/Button';
import { Notice, SectionHeader } from '@/components/ui/Feedback';
import { StatusBadge, type BadgeTone } from '@/components/ui/StatusBadge';

const CHECK_LABELS = {
  chain: 'checkChain',
  rpc: 'checkRpc',
  addresses: 'checkAddresses',
  bytecode: 'checkBytecode',
  token: 'checkToken',
  account: 'checkAccount',
  qualification: 'checkQualification',
} as const;

const STATE_TONE: Record<string, BadgeTone> = {
  observed: 'success',
  missing: 'warning',
  failed: 'danger',
  unavailable: 'neutral',
};

/**
 * PUB-06. A deliberate crossing from the self-contained demo to a configured
 * test network. No check is skipped and none is marked ready by default: the
 * bundled build carries no validated manifest, so writes stay closed and the
 * page says exactly why.
 */
export default function Testnet() {
  const { d } = useI18n();
  const { testnet } = useEnvironment();
  useFocusHeading(d.testnet.title);

  return (
    <div className="container-public max-w-prose py-10 md:py-16">
      <h1 className="h1">{d.testnet.title}</h1>
      <p className="lead mt-4">{d.testnet.lead}</p>

      <div className="mt-6 flex flex-wrap gap-2">
        <StatusBadge tone="info">{d.mode.testnetLong}</StatusBadge>
        <StatusBadge tone="neutral">{d.mode.mainnetDisabled}</StatusBadge>
      </div>

      <section className="mt-10">
        <SectionHeader as="h3" title={d.testnet.checks} />
        <ul className="mt-4 flex flex-col gap-3">
          {testnet.checks.map((check) => (
            <li key={check.id} className="panel-flush flex flex-wrap items-start justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="font-medium">{d.testnet[CHECK_LABELS[check.id as keyof typeof CHECK_LABELS]]}</p>
                {check.detail ? <p className="caption mt-0.5">{check.detail}</p> : null}
              </div>
              <StatusBadge tone={STATE_TONE[check.state]}>
                {check.state === 'observed'
                  ? d.testnet.observed
                  : check.state === 'missing'
                    ? d.testnet.missing
                    : check.state === 'failed'
                      ? d.testnet.failed
                      : d.testnet.unavailable}
              </StatusBadge>
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-8">
        <Notice tone="warning" title={d.testnet.blocked}>
          {d.testnet.blockedBody}
        </Notice>
      </div>

      <section className="mt-10">
        <SectionHeader as="h3" title={d.testnet.supported} />
        <p className="mt-3 text-sm text-fg-secondary">{d.testnet.readOnly}</p>
        <p className="mt-4 text-sm">{d.testnet.noKeys}</p>
      </section>

      <div className="mt-10 flex flex-wrap gap-3">
        <ButtonLink to="/demo" variant="secondary">
          {d.testnet.demoLink}
        </ButtonLink>
      </div>
    </div>
  );
}
