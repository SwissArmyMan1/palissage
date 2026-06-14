import { useState } from 'react';
import { ShieldCheck, FileText, Check } from 'lucide-react';
import { keccak256, toHex } from 'viem';
import { PageHeader } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { LotPhoto } from '@/components/ui/LotCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { SectionTitle } from '@/components/ui/primitives';
import { Modal } from '@/components/ui/Modal';
import { Stagger, StaggerItem } from '@/components/layout/Page';
import { img } from '@/lib/mock';
import { useSession } from '@/lib/session';
import { useChainTx } from '@/lib/tx';
import { useOnchainLots } from '@/lib/lots';
import { contracts } from '@/contracts';

/** Live Draft lots awaiting on-chain verification by an admin (VERIFIER_ROLE). */
function LiveVerification() {
  const { gatewayConfigured, role } = useSession();
  const { lots, refetch } = useOnchainLots();
  const { send, pending, error } = useChainTx();
  const [busyId, setBusyId] = useState<number | null>(null);

  if (!gatewayConfigured || role !== 'admin') return null;

  const drafts = lots.filter((l) => l.status === 0);

  const verify = async (id: number, name: string) => {
    setBusyId(id);
    const docsHash = keccak256(toHex(`docs:${id}:${name}`));
    const ok = await send({ ...contracts.wineLotToken, functionName: 'verifyLot', args: [BigInt(id), docsHash] });
    setBusyId(null);
    if (ok) refetch();
  };

  return (
    <div className="card mb-8 flex flex-col gap-3 p-5">
      <SectionTitle>Draft lots awaiting verification ({drafts.length})</SectionTitle>
      {drafts.length === 0 ? (
        <p className="t-small text-fg-secondary">No on-chain Draft lots right now.</p>
      ) : (
        drafts.map((l) => (
          <div
            key={l.id}
            className="flex flex-wrap items-center gap-3 rounded-md border border-line bg-surface px-4 py-3"
          >
            <span className="t-mono text-fg-secondary">#{l.id}</span>
            <span className="t-body-strong flex-1 text-fg">{l.name || 'Unnamed lot'}</span>
            <span className="t-small text-fg-secondary">{l.region}</span>
            <StatusBadge tone="neutral">Draft</StatusBadge>
            <Button size="sm" loading={busyId === l.id} disabled={pending} onClick={() => verify(l.id, l.name)}>
              Verify lot
            </Button>
          </div>
        ))
      )}
      {error && <span className="t-small text-danger">{error}</span>}
    </div>
  );
}

const checklist = [
  { ok: true, label: 'Producer invoice — Deumié 2022.pdf' },
  { ok: true, label: 'Warehouse attestation — Aude Stock SARL.pdf' },
  { ok: false, label: 'AOP declaration 2022.pdf — awaiting review' },
];

const milestones = [
  { desc: 'Bottling — Villemartin 2026 EP', amount: '€12 860.00' },
  { desc: 'Delivery — A1353 Limousis 2026', amount: '€8 820.00' },
];

export default function Verification() {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <PageHeader title="Lot verification" />
      <LiveVerification />
      <Stagger className="flex flex-col gap-8">
        <StaggerItem className="card flex flex-col gap-4 p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <LotPhoto src={img.boticaDeumie} alt="Deumié" className="h-20 w-28 shrink-0" />
            <div className="flex-1">
              <h2 className="t-h2 text-fg">Château Deumié — Cabardès 2022</h2>
              <p className="t-small text-fg-secondary">
                Domaines Botica Galy · Cabardès AOP · submitted 12.06.2026 · 6 000 bottles · Cabernet Franc · Merlot · Syrah · Grenache
              </p>
            </div>
            <StatusBadge tone="neutral">Draft</StatusBadge>
          </div>

          <SectionTitle>Verification checklist</SectionTitle>
          <div className="flex flex-col gap-2">
            {checklist.map((c) => (
              <div key={c.label} className="flex items-center gap-3 rounded-md border border-line bg-surface px-4 py-3">
                {c.ok ? <ShieldCheck size={20} className="text-success" /> : <FileText size={20} className="text-fg-secondary" />}
                <span className="t-body flex-1 text-fg">{c.label}</span>
                <Button kind="ghost" size="sm">View</Button>
              </div>
            ))}
          </div>
          <p className="t-mono text-fg-secondary">docsHash (auto): keccak256 = 0x5e1f…aa3d — fixed onchain on verification</p>

          <div className="flex justify-end gap-3">
            <Button kind="ghost" className="text-danger">Reject (reason required)</Button>
            <Button onClick={() => setOpen(true)}>Verify lot</Button>
          </div>
        </StaggerItem>

        <StaggerItem className="flex flex-col gap-3">
          <SectionTitle>Milestones awaiting confirmation</SectionTitle>
          {milestones.map((m) => (
            <div key={m.desc} className="flex flex-wrap items-center gap-3 rounded-md border border-line bg-surface px-4 py-3">
              <span className="t-body flex-1 text-fg">{m.desc}</span>
              <span className="t-mono text-fg">{m.amount}</span>
              <StatusBadge tone="warning">Awaiting verifier</StatusBadge>
              <Button kind="secondary" size="sm">Confirm</Button>
            </div>
          ))}
        </StaggerItem>
      </Stagger>

      <Modal open={open} onClose={() => setOpen(false)} title="Verify lot">
        <div className="flex flex-col items-center gap-4 py-2 text-center">
          <span className="grid h-16 w-16 place-items-center rounded-full bg-success-subtle">
            <Check size={32} className="text-success" />
          </span>
          <p className="t-body text-fg">
            Verifying fixes the docsHash onchain and makes the lot mintable. This action is logged.
          </p>
          <Button full onClick={() => setOpen(false)}>Confirm in wallet</Button>
        </div>
      </Modal>
    </div>
  );
}
