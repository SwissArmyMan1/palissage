import { AlertTriangle } from 'lucide-react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useSession } from '@/lib/session';
import { useEure } from '@/lib/eure';
import { ROLE_META } from '@/lib/roles';
import { shortAddress, EURE } from '@/contracts';

/**
 * Header wallet chip — identicon + connected address + role badge, plus the
 * connected wallet's live EURe balance when a deployment is configured.
 * Falls back to the demo role's placeholder address when no wallet is connected
 * (offline demo mode).
 */
export function WalletChip() {
  const { account, role } = useSession();
  const eure = useEure();
  const display = account
    ? shortAddress(account)
    : role
      ? ROLE_META[role].address
      : '0x0000…0000';

  const showBalance = eure.configured && !!account;
  const balance = Number(eure.balanceFormatted).toLocaleString('en-US', {
    maximumFractionDigits: 2,
  });

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5">
        <span className="h-6 w-6 overflow-hidden rounded-full">
          <span className="block h-full w-full bg-gradient-to-br from-accent to-accent-subtle" />
        </span>
        <span className="t-mono text-fg">{display}</span>
        {role && <StatusBadge tone="success">{ROLE_META[role].label}</StatusBadge>}
      </div>
      {showBalance && (
        <span className="t-mono flex items-center gap-1.5 px-3 text-fg-secondary">
          {eure.decimalsMismatch ? (
            <AlertTriangle size={13} className="text-danger" aria-label="EURe decimals mismatch" />
          ) : null}
          {balance} {EURE.symbol}
        </span>
      )}
    </div>
  );
}
