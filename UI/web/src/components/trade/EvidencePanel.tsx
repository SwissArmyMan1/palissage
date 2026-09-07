import type { DocumentRef, EvidenceLevel } from '@/domain/types';
import { useI18n } from '@/app/i18n-context';
import { StatusBadge, type BadgeTone } from '@/components/ui/StatusBadge';

const EVIDENCE_TONE: Record<EvidenceLevel, BadgeTone> = {
  illustrative: 'neutral',
  self_reported: 'neutral',
  document_available: 'info',
  hash_anchored: 'info',
  reviewed: 'success',
  unavailable: 'warning',
  mismatch: 'danger',
};

const EVIDENCE_LABEL: Record<EvidenceLevel, { en: string; fr: string }> = {
  illustrative: { en: 'Illustrative', fr: 'Illustratif' },
  self_reported: { en: 'Provided by producer', fr: 'Déclaré par le producteur' },
  document_available: { en: 'Document available', fr: 'Document disponible' },
  hash_anchored: { en: 'Hash recorded', fr: 'Empreinte enregistrée' },
  reviewed: { en: 'Reviewed', fr: 'Examiné' },
  unavailable: { en: 'Unavailable', fr: 'Indisponible' },
  mismatch: { en: 'Does not match', fr: 'Ne correspond pas' },
};

export function EvidenceBadge({ level }: { level: EvidenceLevel }) {
  const { locale } = useI18n();
  return <StatusBadge tone={EVIDENCE_TONE[level]}>{EVIDENCE_LABEL[level][locale]}</StatusBadge>;
}

function formatBytes(bytes: number): string {
  if (bytes <= 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Type, size, source and the recorded digest — everything needed to judge a
 * document before opening it. A recorded hash is labelled as such and never
 * described as proof of the contents.
 */
export function EvidencePanel({ documents, emptyLabel }: { documents: DocumentRef[]; emptyLabel: string }) {
  const { d, fmt } = useI18n();
  if (documents.length === 0) {
    return <p className="text-sm text-fg-secondary">{emptyLabel}</p>;
  }
  return (
    <ul className="flex flex-col gap-3">
      {documents.map((document) => (
        <li key={document.id} className="panel-flush p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-medium">{document.label}</p>
              <p className="caption mt-0.5">
                {fmt(d.common.documentMeta, {
                  type: document.mediaType.replace('application/', '').toUpperCase(),
                  size: formatBytes(document.byteSize),
                })}
                {' · '}
                {d.common.sampleDocument}
              </p>
            </div>
            <EvidenceBadge level={document.evidence} />
          </div>
          {document.reviewerLabel ? (
            <p className="mt-2 text-sm text-fg-secondary">
              {document.reviewerLabel}
              {document.reviewedAt ? ` · ${document.reviewedAt}` : ''}
            </p>
          ) : null}
          <div className="mt-3 flex flex-wrap items-center gap-3">
            {document.uri ? (
              <a href={document.uri} target="_blank" rel="noreferrer noopener" className="link text-sm">
                {d.common.openDocument}
              </a>
            ) : null}
            {document.digest ? (
              <details className="w-full">
                <summary className="cursor-pointer text-sm text-fg-secondary">{d.common.technical}</summary>
                <p className="code mt-2 text-fg-secondary">
                  {document.digestAlgorithm}: {document.digest}
                </p>
              </details>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}
