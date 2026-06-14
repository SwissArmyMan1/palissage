import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus, X, UserPlus, Check, ShieldX } from 'lucide-react';
import { isAddress, type Address } from 'viem';
import { PageHeader } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Field';
import { Chips } from '@/components/ui/Tabs';
import { StatusBadge, type Tone } from '@/components/ui/StatusBadge';
import { SectionTitle } from '@/components/ui/primitives';
import { participants, type Participant } from '@/lib/mock';
import { useSession } from '@/lib/session';
import { useChainTx } from '@/lib/tx';
import { ROLE_ORDER, ROLE_META, ROLE_ENUM, type Role } from '@/lib/roles';
import { contracts } from '@/contracts';

/**
 * Grant or revoke a protocol role on-chain. The admin signs `RoleGateway.assignRole`
 * / `revokeRole`, which provisions the wallet's identity + issuer claims. Works whether
 * or not test mode is on (gated to gateway admins by the contract).
 */
function GrantRolePanel() {
  const { gatewayConfigured, role: myRole } = useSession();
  const { send, pending, error, clearError } = useChainTx();
  const [wallet, setWallet] = useState('');
  const [role, setRole] = useState<Role>('winery');
  const [done, setDone] = useState<string | null>(null);

  const valid = isAddress(wallet);
  const canAct = gatewayConfigured && myRole === 'admin';

  const run = async (kind: 'grant' | 'revoke') => {
    if (!valid) return;
    clearError();
    setDone(null);
    const ok = await send(
      kind === 'grant'
        ? { ...contracts.roleGateway, functionName: 'assignRole', args: [wallet as Address, ROLE_ENUM[role]] }
        : { ...contracts.roleGateway, functionName: 'revokeRole', args: [wallet as Address] },
    );
    if (ok) {
      setDone(kind === 'grant' ? `Granted ${ROLE_META[role].label} role` : 'Role revoked');
      setWallet('');
    }
  };

  return (
    <div className="card mb-4 flex flex-col gap-4 p-5">
      <SectionTitle>Grant a role on-chain</SectionTitle>
      {!gatewayConfigured ? (
        <p className="t-small text-fg-secondary">
          Connect to a live deployment (RoleGateway configured) to issue roles on-chain.
        </p>
      ) : !canAct ? (
        <p className="t-small text-fg-secondary">
          Sign in with an admin wallet to grant roles.
        </p>
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-[1fr_180px]">
            <Input
              label="Wallet address"
              mono
              placeholder="0x…"
              value={wallet}
              onChange={(e) => setWallet(e.target.value.trim())}
              error={wallet && !valid ? 'Not a valid address' : undefined}
            />
            <Select label="Role" value={role} onChange={(e) => setRole(e.target.value as Role)}>
              {ROLE_ORDER.map((r) => (
                <option key={r} value={r}>
                  {ROLE_META[r].label}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button icon={<UserPlus size={16} />} loading={pending} disabled={!valid} onClick={() => run('grant')}>
              Grant role
            </Button>
            <Button
              kind="ghost"
              className="text-danger"
              icon={<ShieldX size={16} />}
              disabled={!valid || pending}
              onClick={() => run('revoke')}
            >
              Revoke
            </Button>
            {done && (
              <span className="inline-flex items-center gap-1.5 t-small text-success">
                <Check size={16} /> {done}
              </span>
            )}
            {error && <span className="t-small text-danger">{error}</span>}
          </div>
        </>
      )}
    </div>
  );
}

const typeTone: Record<Participant['type'], Tone> = {
  Winery: 'success',
  'B2B buyer': 'info',
  Verifier: 'neutral',
};

const ease = [0.2, 0, 0, 1] as const;

export default function Participants() {
  const [filter, setFilter] = useState('All');
  const [selected, setSelected] = useState<Participant | null>(null);

  const rows = participants.filter((p) => {
    if (filter === 'All') return true;
    if (filter === 'Wineries') return p.type === 'Winery';
    if (filter === 'Buyers') return p.type === 'B2B buyer';
    if (filter === 'Pending claims') return p.claims.some((c) => c.tone === 'warning');
    return true;
  });

  return (
    <div>
      <PageHeader title="Participants" action={<Button icon={<Plus size={16} />}>Register identity</Button>} />
      <GrantRolePanel />
      <div className="mb-4">
        <Chips items={['All', 'Wineries', 'Buyers', 'Pending claims']} value={filter} onChange={setFilter} />
      </div>

      <div className="card overflow-hidden">
        <div className="hidden grid-cols-[1fr_140px_80px_110px_180px_100px_70px] items-center gap-4 bg-page-subtle px-4 py-2.5 md:grid">
          {['PARTICIPANT', 'WALLET', 'COUNTRY', 'TYPE', 'CLAIMS', 'REGISTERED', ''].map((h, i) => (
            <span key={i} className="t-caption text-fg-secondary">{h}</span>
          ))}
        </div>
        {rows.map((p) => (
          <button
            key={p.wallet}
            onClick={() => setSelected(p)}
            className={`grid w-full grid-cols-1 items-center gap-2 border-t border-line px-4 py-3 text-left transition-colors hover:bg-page-subtle md:grid-cols-[1fr_140px_80px_110px_180px_100px_70px] md:gap-4 ${selected?.wallet === p.wallet ? 'bg-accent-subtle' : ''}`}
          >
            <div className="flex items-center gap-2.5">
              <span className="h-6 w-6 shrink-0 rounded-full bg-gradient-to-br from-accent to-accent-subtle" />
              <span className="t-body-strong text-fg">{p.name}</span>
            </div>
            <span className="t-mono text-fg-secondary">{p.wallet}</span>
            <span className="t-small text-fg-secondary">{p.country}</span>
            <span><StatusBadge tone={typeTone[p.type]}>{p.type}</StatusBadge></span>
            <span className="flex flex-wrap gap-1.5">
              {p.claims.map((c) => <StatusBadge key={c.label} tone={c.tone}>{c.label}</StatusBadge>)}
            </span>
            <span className="t-small text-fg-secondary">{p.registered}</span>
            <span className="t-small-strong text-accent md:text-right">View</span>
          </button>
        ))}
      </div>

      {/* drawer */}
      <AnimatePresence>
        {selected && (
          <motion.div
            key="drawer"
            className="fixed inset-0 z-40 flex justify-end bg-[#231d18]/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setSelected(null)}
          >
            <motion.aside
              className="flex w-full max-w-[480px] flex-col gap-4 overflow-y-auto bg-surface-raised p-6 shadow-e3"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.28, ease }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h2 className="t-h2 text-fg">{selected.name}</h2>
                <button onClick={() => setSelected(null)} className="text-fg-secondary hover:text-fg"><X size={20} /></button>
              </div>
              <p className="t-small text-fg-secondary">{selected.type} · {selected.country} · registered {selected.registered}</p>
              <p className="t-mono text-fg-secondary">identity 0xA1f9…3D55 · wallet {selected.wallet}</p>
              <h3 className="t-h3 mt-2 text-fg">Claims</h3>
              {selected.claims.map((c, i) => (
                <div key={i} className="flex items-center gap-3 rounded-md border border-line bg-surface px-4 py-3">
                  <div className="flex-1">
                    <p className="t-body-strong text-fg">{c.label.replace(' ✓', ' verified').replace(' review', ' under review')}</p>
                    <p className="t-caption normal-case tracking-normal text-fg-tertiary">issuer Palissage KYC · {selected.registered}</p>
                  </div>
                  <Button kind="ghost" size="sm" className="text-danger">Revoke</Button>
                </div>
              ))}
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
