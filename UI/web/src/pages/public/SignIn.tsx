import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import {
  Wallet,
  Wine,
  Store,
  Users,
  Award,
  ShieldCheck,
  FlaskConical,
  ShieldAlert,
  Loader2,
} from 'lucide-react';
import { Logo } from '@/components/layout/Logo';
import { Button } from '@/components/ui/Button';
import { zoneLink } from '@/lib/zone';
import { useSession } from '@/lib/session';
import { useChainTx } from '@/lib/tx';
import { ROLE_ORDER, ROLE_META, ROLE_ENUM, type Role } from '@/lib/roles';
import { contracts, shortAddress } from '@/contracts';

const bullets = [
  { icon: <Wine size={24} />, text: 'Wineries — sell direct, fund harvests early with En Primeur' },
  { icon: <Store size={24} />, text: 'Shops & importers — verified lots below distributor prices' },
  { icon: <Users size={24} />, text: 'Communities — drops, passports and loyalty rewards' },
];

const roleIcon: Record<Role, ReactNode> = {
  admin: <ShieldCheck size={20} />,
  shop: <Store size={20} />,
  winery: <Wine size={20} />,
  consumer: <Award size={20} />,
};

function TestModeBanner({ short }: { short?: boolean }) {
  return (
    <div className="flex items-start gap-2 rounded-md bg-info-subtle px-3 py-2.5">
      <FlaskConical size={16} className="mt-0.5 shrink-0 text-info" />
      <span className="t-small text-fg">
        <span className="t-small-strong text-info">Test mode.</span>{' '}
        {short
          ? 'Pick any role below to explore the app — switch any time.'
          : 'Sign in and try any role — admin, shop, winery or collector.'}
      </span>
    </div>
  );
}

function RoleChooser({
  busyRole,
  disabled,
  onPick,
}: {
  busyRole: Role | null;
  disabled?: boolean;
  onPick: (role: Role) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      {ROLE_ORDER.map((role) => {
        const meta = ROLE_META[role];
        const busy = busyRole === role;
        return (
          <button
            key={role}
            type="button"
            disabled={disabled}
            onClick={() => onPick(role)}
            className="flex items-start gap-3 rounded-md border border-line p-3 text-left transition-colors hover:border-accent hover:bg-page-subtle disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent-subtle text-accent">
              {busy ? <Loader2 size={18} className="animate-spin" /> : roleIcon[role]}
            </span>
            <span className="flex flex-col">
              <span className="t-body-strong text-fg">{meta.label}</span>
              <span className="t-caption normal-case tracking-normal text-fg-secondary">
                {meta.tagline}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default function SignIn() {
  const navigate = useNavigate();
  const session = useSession();
  const { openConnectModal } = useConnectModal();
  const { send, pending, error } = useChainTx();
  const [busyRole, setBusyRole] = useState<Role | null>(null);

  const live = session.gatewayConfigured;

  // Live + not in test mode: a verified wallet is routed straight to its zone.
  useEffect(() => {
    if (live && session.isConnected && !session.testMode && session.role) {
      navigate(zoneLink(session.role, ''));
    }
  }, [live, session.isConnected, session.testMode, session.role, navigate]);

  const pickRoleLive = async (role: Role) => {
    setBusyRole(role);
    const ok = await send({ ...contracts.roleGateway, functionName: 'assumeRole', args: [ROLE_ENUM[role]] });
    setBusyRole(null);
    if (ok) {
      session.refresh();
      navigate(zoneLink(role, ''));
    }
  };

  const pickRoleDemo = (role: Role) => {
    session.connectLocal(role);
    navigate(zoneLink(role, ''));
  };

  return (
    <div className="grid min-h-screen md:grid-cols-2">
      {/* value prop */}
      <div className="flex flex-col gap-8 bg-page px-6 py-16 md:px-20 md:py-20">
        <Logo to="/" className="w-44" />
        <h1 className="t-display text-fg">Direct wine trade, verified onchain</h1>
        <div className="flex flex-col gap-4">
          {bullets.map((b) => (
            <div key={b.text} className="flex items-center gap-3">
              <span className="text-accent">{b.icon}</span>
              <span className="t-body text-fg">{b.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* card */}
      <div className="flex items-center justify-center bg-surface px-6 py-16">
        <div className="card flex w-full max-w-[400px] flex-col gap-4 bg-page p-8 shadow-e2">
          {renderCard()}
        </div>
      </div>
    </div>
  );

  function renderCard() {
    // 1) Offline demo (no gateway deployed) — local role picking, always test mode.
    if (!live) {
      return (
        <>
          <h2 className="t-h2 text-fg">Choose a role</h2>
          <TestModeBanner short />
          <RoleChooser busyRole={null} onPick={pickRoleDemo} />
        </>
      );
    }

    // 2) Live, wallet not connected yet.
    if (!session.isConnected) {
      return (
        <>
          <h2 className="t-h2 text-fg">Sign in</h2>
          <p className="t-small text-fg-secondary">
            Access is wallet-based. No email needed — you can add one later in account settings.
          </p>
          <Button full onClick={openConnectModal} icon={<Wallet size={16} />}>
            Connect wallet
          </Button>
          <p className="t-caption normal-case tracking-normal text-fg-tertiary">
            By connecting you agree to the Terms of Service and acknowledge the compliance policy.
          </p>
          {session.testMode && <TestModeBanner />}
        </>
      );
    }

    // 3) Live + connected + test mode on → pick any role (on-chain).
    if (session.testMode) {
      return (
        <>
          <TestModeBanner short />
          <h2 className="t-h2 text-fg">Choose a role</h2>
          <p className="t-caption normal-case tracking-normal text-fg-tertiary">
            Connected as {session.account ? shortAddress(session.account) : ''}
          </p>
          <RoleChooser busyRole={busyRole} disabled={pending} onPick={pickRoleLive} />
          {error && <p className="t-small text-danger">{error}</p>}
          <button
            type="button"
            onClick={session.disconnect}
            className="self-start t-small text-fg-secondary transition-colors hover:text-fg"
          >
            Disconnect
          </button>
        </>
      );
    }

    // 4) Live + connected + test mode off + role resolved → redirecting (handled by effect).
    if (session.role) {
      return (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <Loader2 size={24} className="animate-spin text-accent" />
          <p className="t-body text-fg">Signing you in…</p>
        </div>
      );
    }

    // 5) Live + connected + test mode off + no role → not verified.
    return (
      <>
        <span className="grid h-12 w-12 place-items-center rounded-full bg-warning-subtle">
          <ShieldAlert size={24} className="text-warning" />
        </span>
        <h2 className="t-h2 text-fg">Wallet not verified</h2>
        <p className="t-small text-fg-secondary">
          This wallet ({session.account ? shortAddress(session.account) : ''}) hasn't been granted a
          role yet. Ask a Palissage admin to verify you as a winery or shop.
        </p>
        <button
          type="button"
          onClick={session.disconnect}
          className="self-start t-small text-fg-secondary transition-colors hover:text-fg"
        >
          Disconnect
        </button>
      </>
    );
  }
}
