import { motion } from 'framer-motion';
import {
  Wine,
  Store,
  Users,
  Wallet,
  Landmark,
  ShieldCheck,
  FileText,
  ChevronDown,
} from 'lucide-react';
import { Logo } from '@/components/layout/Logo';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { Button } from '@/components/ui/Button';
import { StatCard } from '@/components/ui/primitives';
import { LotCard } from '@/components/ui/LotCard';
import { Stepper } from '@/components/ui/Stepper';
import { Stagger, StaggerItem } from '@/components/layout/Page';
import { marketplaceLots } from '@/lib/mock';
import { CHAIN_LABEL } from '@/contracts/config';
import { zoneLink } from '@/lib/zone';

const ease = [0.2, 0, 0, 1] as const;

/** In-page anchors. Each href points at a section `id` further down the page. */
const navLinks = [
  { label: 'For wineries', href: '#for-wineries' },
  { label: 'For shops', href: '#for-shops' },
  { label: 'How it works', href: '#how-it-works' },
  { label: 'FAQ', href: '#faq' },
];
const footerLinks = [...navLinks, { label: 'Contact', href: '#contact' }];

const triplet = [
  {
    icon: <Wine size={24} />,
    title: 'Wineries',
    text: 'Sell direct at a better price, fund harvests early with En Primeur, keep your customer.',
  },
  {
    icon: <Store size={24} />,
    title: 'Shops & importers',
    text: 'Buy verified lots below distributor prices, resell allocations on a whitelisted market.',
  },
  {
    icon: <Users size={24} />,
    title: 'Communities',
    text: 'Drops, loyalty passports and exclusive releases — physical wine with onchain provenance.',
  },
];

const steps = ['Create lot', 'Verify', 'Reserve & escrow', 'Milestone release', 'Redeem'].map(
  (label) => ({ label, state: 'done' as const }),
);

const faq = [
  'Do I need crypto to start buying?',
  'How is a lot verified?',
  'What happens to my money before delivery?',
  'Can I resell an allocation I no longer need?',
  'What is En Primeur and why is it cheaper?',
  'Which countries can order delivery?',
];

const trust = [
  { icon: <Wallet size={20} />, text: 'Onchain ownership of every allocation' },
  { icon: <Landmark size={20} />, text: 'Programmable escrow with milestone release' },
  { icon: <ShieldCheck size={20} />, text: 'Lots verified by independent partners' },
  { icon: <FileText size={20} />, text: 'Full audit trail: documents, payments, redemptions' },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-page">
      {/* top bar */}
      <header className="sticky top-0 z-30 border-b border-line bg-surface/85 backdrop-blur">
        <div className="mx-auto flex h-[88px] max-w-content items-center gap-6 px-4 md:px-10">
          <Logo to="/" className="w-36 md:w-40" />
          <nav className="ml-auto hidden items-center gap-8 lg:flex">
            {navLinks.map((l) => (
              <a key={l.label} href={l.href} className="t-body text-fg hover:text-accent">
                {l.label}
              </a>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3 lg:ml-0">
            <ThemeToggle />
            <Button size="sm" to="/sign-in" icon={<Wallet size={16} />}>
              Connect wallet
            </Button>
          </div>
        </div>
      </header>

      {/* hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute right-6 top-16 hidden opacity-[0.06] xl:block">
          <Logo variant="mark" className="h-[320px] w-[320px]" />
        </div>
        <div className="mx-auto flex max-w-content flex-col items-center gap-6 px-4 py-20 text-center md:px-10 md:py-28">
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease }}
            className="t-display max-w-[820px] text-fg"
          >
            Direct wine trade, verified onchain
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.08, ease }}
            className="t-body max-w-[640px] text-fg-secondary"
          >
            Wineries sell verified lots straight to shops and importers. Escrow, En Primeur
            futures and bottle-level loyalty — without the distributor margin.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.16, ease }}
            className="flex flex-wrap items-center justify-center gap-3"
          >
            <Button to="/sign-in" icon={<Wallet size={16} />}>
              Connect wallet
            </Button>
            <Button kind="ghost" to={zoneLink('shop', '')}>
              Explore marketplace
            </Button>
          </motion.div>
        </div>
      </section>

      {/* value triplet */}
      <section id="for-wineries" className="mx-auto max-w-content scroll-mt-24 px-4 pb-24 md:px-10">
        <Stagger className="grid gap-6 md:grid-cols-3">
          {triplet.map((t) => (
            <StaggerItem key={t.title} className="card flex flex-col gap-3 p-6">
              <span className="text-accent">{t.icon}</span>
              <h2 className="t-h2 text-fg">{t.title}</h2>
              <p className="t-body text-fg-secondary">{t.text}</p>
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      {/* how it works */}
      <section id="how-it-works" className="mx-auto max-w-content scroll-mt-24 px-4 pb-24 md:px-10">
        <h2 className="t-h1 mb-10 text-center text-fg">How it works</h2>
        <div className="mx-auto hidden max-w-3xl md:block">
          <Stepper steps={steps} />
        </div>
        <div className="mx-auto max-w-xs md:hidden">
          <Stepper steps={steps} direction="vertical" />
        </div>
      </section>

      {/* trust + example lot */}
      <section id="for-shops" className="scroll-mt-24 bg-page-subtle py-16">
        <div className="mx-auto grid max-w-content items-center gap-12 px-4 md:grid-cols-2 md:px-10">
          <div className="flex flex-col gap-4">
            <h2 className="t-h1 text-fg">Trust is the product</h2>
            {trust.map((t) => (
              <div key={t.text} className="flex items-center gap-3">
                <span className="text-accent">{t.icon}</span>
                <span className="t-body text-fg">{t.text}</span>
              </div>
            ))}
          </div>
          <div className="mx-auto w-full max-w-[280px]">
            <LotCard lot={marketplaceLots[2]} to={zoneLink('shop', `/lot/${marketplaceLots[2].id}`)} />
          </div>
        </div>
      </section>

      {/* numbers */}
      <section className="mx-auto max-w-content px-4 py-24 md:px-10">
        <h2 className="t-h1 text-center text-fg">The same margin, shared differently</h2>
        <p className="t-body mb-10 mt-2 text-center text-fg-secondary">
          On a 10 000-bottle lot sold direct at €7.20 instead of via a distributor:
        </p>
        <div className="grid gap-6 md:grid-cols-3">
          <StatCard label="Shop saves" value="€13 700" delta="vs distributor price" deltaTone="muted" />
          <StatCard label="Winery earns more" value="€9 840" delta="vs selling to distributor" deltaTone="muted" />
          <StatCard label="Protocol fee" value="€2 160" delta="3% on direct trade" deltaTone="muted" />
        </div>
      </section>

      {/* faq */}
      <section id="faq" className="mx-auto max-w-3xl scroll-mt-24 px-4 pb-24 md:px-10">
        <h2 className="t-h1 mb-6 text-fg">FAQ</h2>
        <div className="flex flex-col">
          {faq.map((q) => (
            <details key={q} className="group border-b border-line py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
                <span className="t-h3 text-fg">{q}</span>
                <ChevronDown size={20} className="text-fg-secondary transition-transform group-open:rotate-180" />
              </summary>
              <p className="t-body mt-3 text-fg-secondary">
                Palissage keeps business meaning on the surface and chain details one level
                down. Verification, escrow and redemption are explained in plain euros and
                delivery dates inside the app.
              </p>
            </details>
          ))}
        </div>
      </section>

      {/* footer */}
      <footer id="contact" className="scroll-mt-24 border-t border-line bg-surface">
        <div className="mx-auto flex max-w-content flex-col gap-8 px-4 py-12 md:flex-row md:px-10">
          <Logo to="/" className="w-36" />
          <nav className="flex flex-1 flex-col gap-2">
            {footerLinks.map((l) => (
              <a key={l.label} href={l.href} className="t-small text-fg-secondary hover:text-fg">
                {l.label}
              </a>
            ))}
          </nav>
          <div className="max-w-md">
            <p className="t-small-strong text-fg">Built on {CHAIN_LABEL}</p>
            <p className="t-caption mt-2 normal-case tracking-normal text-fg-tertiary">
              Palissage provides infrastructure for direct B2B wine trade. Nothing here is
              financial advice or an offer of securities. Allocations are claims on physical
              wine subject to verification and export rules.
            </p>
          </div>
        </div>
      </footer>

      {/* mobile sticky CTA */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface p-4 lg:hidden">
        <Button full to="/sign-in" icon={<Wallet size={16} />}>
          Connect wallet
        </Button>
      </div>
    </div>
  );
}
