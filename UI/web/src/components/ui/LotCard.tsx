import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Wine } from 'lucide-react';
import type { ReactNode } from 'react';
import { StatusBadge } from './StatusBadge';
import type { Lot } from '@/lib/mock';
import { eur, qty } from '@/lib/mock';
import { cn } from '@/lib/cn';

/** Lot photo: contain on a constant white tile so portrait bottle shots
 *  are never cropped and read consistently in light & dark (Figma photo/tile). */
export function LotPhoto({
  src,
  alt,
  className,
  dim,
  fit = 'contain',
  children,
}: {
  src: string | null;
  alt: string;
  className?: string;
  dim?: boolean;
  fit?: 'contain' | 'cover';
  children?: ReactNode;
}) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-md',
        fit === 'cover' ? 'bg-page-subtle' : 'bg-tile',
        className,
      )}
    >
      {src ? (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          className={cn(
            'h-full w-full',
            fit === 'cover' ? 'object-cover' : 'object-contain',
            dim && 'opacity-55',
          )}
        />
      ) : (
        <div className="grid h-full w-full place-items-center bg-page-subtle">
          <Wine size={32} className="text-fg-tertiary" />
        </div>
      )}
      {children}
    </div>
  );
}

export function LotCard({ lot, to }: { lot: Lot; to: string }) {
  const left = lot.soldOut
    ? `0 of ${qty(lot.total)} left`
    : `${qty(lot.available)} of ${qty(lot.total)} left`;
  const savings =
    lot.enPrimeur && lot.releasePrice
      ? Math.round((1 - lot.price / lot.releasePrice) * 100)
      : 0;
  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}
      className="h-full"
    >
      <Link
        to={to}
        className="flex h-full flex-col gap-3 rounded-lg border border-line bg-surface p-3 transition-shadow duration-200 hover:shadow-e2"
      >
        <LotPhoto src={lot.img} alt={lot.name} dim={lot.soldOut} className="aspect-[4/3]">
          <div className="absolute left-3 top-3">
            {lot.soldOut ? (
              <StatusBadge tone="neutral">Sold out</StatusBadge>
            ) : lot.enPrimeur ? (
              <StatusBadge tone="info">En Primeur</StatusBadge>
            ) : (
              <StatusBadge tone="success">Verified ✓</StatusBadge>
            )}
          </div>
        </LotPhoto>
        <div className="flex flex-1 flex-col gap-1">
          <h3 className="t-h2 line-clamp-2 text-fg">{lot.name}</h3>
          <p className="t-small text-fg-secondary">{lot.winery}</p>
          {savings > 0 && (
            <p className="t-small text-success">
              −{savings}% vs release · est. {eur(lot.releasePrice!)} after bottling
            </p>
          )}
        </div>
        <div className="flex items-baseline justify-between gap-2">
          <span className="t-mono text-fg">{eur(lot.price)} / bottle</span>
          <span className={cn('t-small', lot.soldOut ? 'text-fg-tertiary' : 'text-fg-secondary')}>
            {left}
          </span>
        </div>
      </Link>
    </motion.div>
  );
}

export function LotCardSkeleton() {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-3">
      <div className="skeleton aspect-[4/3] w-full" />
      <div className="skeleton h-5 w-3/4" />
      <div className="skeleton h-3 w-1/2" />
      <div className="skeleton h-4 w-full" />
    </div>
  );
}
