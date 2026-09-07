/**
 * Generates the demonstration media and sample documents.
 *
 * Doc 06 of the specification describes acquiring licensed stock photography.
 * That needs network access, a licence review and a human crop decision, so
 * this build ships original generated vector artwork instead: it is offline,
 * deterministic, free of third-party rights, and honestly labelled as an
 * illustration everywhere it appears. Replacing an entry here with a
 * photograph only requires changing the manifest path.
 *
 * Usage: node scripts/prepare-media.mjs
 */

import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const mediaDir = resolve(root, 'public/media');
const docsDir = resolve(root, 'public/demo-documents');

const PALETTE = {
  page: '#F7F4ED',
  pageSubtle: '#EEE8DD',
  ink: '#291F24',
  accent: '#742C42',
  accentDeep: '#511B2D',
  vine: '#355B46',
  line: '#DCD5C9',
  lineStrong: '#8A8177',
  sky: '#E3DED3',
};

function sha256(buffer) {
  return `0x${createHash('sha256').update(buffer).digest('hex')}`;
}

function write(relativePath, contents) {
  const target = resolve(mediaDir, relativePath);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, contents, 'utf8');
  return `/media/${relativePath}`;
}

/* ------------------------------------------------------------------ */
/* Editorial artwork                                                   */
/* ------------------------------------------------------------------ */

/** Vineyard rows receding towards a horizon, drawn as a trellis. */
function vineyardHero(width, height) {
  const horizon = height * 0.42;
  const rows = [];
  for (let i = 0; i < 11; i += 1) {
    const t = i / 10;
    const bottom = width * (-0.9 + t * 2.8);
    const top = width * (0.32 + t * 0.36);
    rows.push(
      `<path d="M ${bottom.toFixed(1)} ${height} L ${top.toFixed(1)} ${horizon.toFixed(1)}" stroke="${
        i % 2 === 0 ? PALETTE.vine : '#4B7359'
      }" stroke-width="${(2.4 + (1 - Math.abs(t - 0.5) * 2) * 3).toFixed(2)}" stroke-linecap="round" opacity="0.9"/>`,
    );
  }
  const posts = [];
  for (let i = 0; i < 9; i += 1) {
    const t = i / 8;
    const y = horizon + (height - horizon) * Math.pow(t, 1.7);
    const inset = width * (0.5 - 0.5 * Math.pow(t, 1.25) * 1.85);
    posts.push(
      `<path d="M ${inset.toFixed(1)} ${y.toFixed(1)} H ${(width - inset).toFixed(1)}" stroke="${PALETTE.ink}" stroke-width="${(0.6 + t * 1.6).toFixed(2)}" opacity="${(0.10 + t * 0.16).toFixed(2)}"/>`,
    );
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${PALETTE.sky}"/>
      <stop offset="100%" stop-color="${PALETTE.page}"/>
    </linearGradient>
    <linearGradient id="ground" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#C9C4B2"/>
      <stop offset="100%" stop-color="#A9A991"/>
    </linearGradient>
    <clipPath id="frame"><rect width="${width}" height="${height}"/></clipPath>
  </defs>
  <g clip-path="url(#frame)">
    <rect width="${width}" height="${height}" fill="url(#sky)"/>
    <path d="M0 ${horizon} H ${width} V ${height} H 0 Z" fill="url(#ground)"/>
    <path d="M0 ${(horizon - height * 0.06).toFixed(1)} C ${width * 0.25} ${(horizon - height * 0.1).toFixed(1)}, ${width * 0.6} ${(horizon - height * 0.02).toFixed(1)}, ${width} ${(horizon - height * 0.08).toFixed(1)} L ${width} ${horizon} H 0 Z" fill="${PALETTE.lineStrong}" opacity="0.35"/>
    ${rows.join('\n    ')}
    ${posts.join('\n    ')}
    <rect width="${width}" height="${height}" fill="${PALETTE.accentDeep}" opacity="0.05"/>
  </g>
</svg>`;
}

/** Barrels in a cellar, reduced to arcs and staves. */
function cellarStory(width, height) {
  const barrels = [];
  const rowY = [height * 0.62, height * 0.36];
  rowY.forEach((y, row) => {
    const radius = height * (row === 0 ? 0.24 : 0.18);
    const count = row === 0 ? 4 : 3;
    for (let i = 0; i < count; i += 1) {
      const cx = (width / (count + 1)) * (i + 1) + (row === 1 ? width * 0.06 : 0);
      barrels.push(`<g transform="translate(${cx.toFixed(1)} ${y.toFixed(1)})">
      <ellipse rx="${radius.toFixed(1)}" ry="${(radius * 0.98).toFixed(1)}" fill="#8C6244" opacity="${row === 0 ? 1 : 0.75}"/>
      <ellipse rx="${(radius * 0.72).toFixed(1)}" ry="${(radius * 0.72).toFixed(1)}" fill="#A67A55" opacity="0.85"/>
      <ellipse rx="${(radius * 0.3).toFixed(1)}" ry="${(radius * 0.3).toFixed(1)}" fill="${PALETTE.accentDeep}" opacity="0.55"/>
      <circle r="${(radius * 0.86).toFixed(1)}" fill="none" stroke="${PALETTE.ink}" stroke-opacity="0.28" stroke-width="${(radius * 0.07).toFixed(1)}"/>
    </g>`);
    }
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img">
  <defs><linearGradient id="cellar" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="#3B2F2C"/><stop offset="100%" stop-color="#241C1F"/>
  </linearGradient></defs>
  <rect width="${width}" height="${height}" fill="url(#cellar)"/>
  <path d="M0 ${(height * 0.18).toFixed(1)} Q ${(width / 2).toFixed(1)} ${(height * -0.06).toFixed(1)} ${width} ${(height * 0.18).toFixed(1)} L ${width} 0 H 0 Z" fill="#4A3B36" opacity="0.7"/>
  ${barrels.join('\n  ')}
  <rect width="${width}" height="${height}" fill="${PALETTE.accent}" opacity="0.08"/>
</svg>`;
}

/** A harvest detail: hands are implied by shears and a bunch of grapes. */
function harvestDetail(width, height) {
  const grapes = [];
  const rows = [4, 3, 3, 2, 1];
  rows.forEach((count, row) => {
    for (let i = 0; i < count; i += 1) {
      const spread = width * 0.052;
      const cx = width * 0.5 + (i - (count - 1) / 2) * spread * 2;
      const cy = height * 0.42 + row * spread * 1.7;
      grapes.push(
        `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${spread.toFixed(1)}" fill="${
          (row + i) % 3 === 0 ? '#5C2438' : PALETTE.accentDeep
        }"/>`,
      );
    }
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img">
  <rect width="${width}" height="${height}" fill="${PALETTE.pageSubtle}"/>
  <path d="M ${width * 0.1} ${height * 0.14} C ${width * 0.35} ${height * 0.05}, ${width * 0.7} ${height * 0.22}, ${width * 0.94} ${height * 0.1}" stroke="${PALETTE.vine}" stroke-width="${(width * 0.012).toFixed(1)}" fill="none" stroke-linecap="round"/>
  <path d="M ${width * 0.5} ${height * 0.16} L ${width * 0.5} ${height * 0.4}" stroke="#6B5537" stroke-width="${(width * 0.012).toFixed(1)}" stroke-linecap="round"/>
  <path d="M ${width * 0.34} ${height * 0.2} C ${width * 0.4} ${height * 0.1}, ${width * 0.52} ${height * 0.12}, ${width * 0.48} ${height * 0.24} C ${width * 0.42} ${height * 0.3}, ${width * 0.32} ${height * 0.28}, ${width * 0.34} ${height * 0.2} Z" fill="${PALETTE.vine}"/>
  ${grapes.join('\n  ')}
  <circle cx="${(width * 0.5).toFixed(1)}" cy="${(height * 0.42).toFixed(1)}" r="${(width * 0.19).toFixed(1)}" fill="none" stroke="${PALETTE.ink}" stroke-opacity="0.06" stroke-width="2"/>
</svg>`;
}

/* ------------------------------------------------------------------ */
/* Bottle mockups                                                      */
/* ------------------------------------------------------------------ */

const GLASS = {
  red: { body: '#3E2A2E', highlight: '#6A4249', capsule: '#742C42' },
  white: { body: '#4E5738', highlight: '#7E8A5F', capsule: '#B49A5E' },
  rose: { body: '#7A5560', highlight: '#A8808B', capsule: '#C08994' },
  sparkling: { body: '#3A4438', highlight: '#67735F', capsule: '#8A8177' },
};

function bottle({ name, vintage, color, producer }) {
  const glass = GLASS[color] ?? GLASS.red;
  const width = 480;
  const height = 640;
  const cx = width / 2;
  const lines = name.length > 20 ? [name.slice(0, name.lastIndexOf(' ', 20)), name.slice(name.lastIndexOf(' ', 20) + 1)] : [name];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img">
  <defs>
    <linearGradient id="glass" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${glass.body}"/>
      <stop offset="34%" stop-color="${glass.highlight}"/>
      <stop offset="62%" stop-color="${glass.body}"/>
      <stop offset="100%" stop-color="#1F1A1C"/>
    </linearGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="${PALETTE.pageSubtle}"/>
  <ellipse cx="${cx}" cy="596" rx="118" ry="14" fill="${PALETTE.ink}" opacity="0.10"/>
  <path d="M ${cx - 26} 64 h 52 v 128 c 0 26 62 54 62 122 v 244 c 0 20 -14 34 -34 34 h -108 c -20 0 -34 -14 -34 -34 v -244 c 0 -68 62 -96 62 -122 z"
        fill="url(#glass)"/>
  <path d="M ${cx - 26} 64 h 14 v 128 c 0 30 -62 56 -62 124 v 240" fill="none" stroke="#FFFFFF" stroke-opacity="0.16" stroke-width="7" stroke-linecap="round"/>
  <path d="M ${cx - 30} 56 h 60 v 42 h -60 z" fill="${glass.capsule}"/>
  <rect x="${cx - 30}" y="92" width="60" height="7" fill="${PALETTE.ink}" opacity="0.35"/>
  <rect x="${cx - 92}" y="330" width="184" height="176" rx="4" fill="${PALETTE.page}"/>
  <rect x="${cx - 92}" y="330" width="184" height="176" rx="4" fill="none" stroke="${PALETTE.line}"/>
  <g stroke="${PALETTE.accent}" stroke-width="1.6" stroke-linecap="round">
    <path d="M ${cx - 24} 352 V 386"/><path d="M ${cx} 352 V 386"/><path d="M ${cx + 24} 352 V 386"/>
    <path d="M ${cx - 34} 362 H ${cx + 34}"/><path d="M ${cx - 34} 376 H ${cx + 34}"/>
  </g>
  ${lines
    .map(
      (line, index) =>
        `<text x="${cx}" y="${418 + index * 22}" text-anchor="middle" font-family="Georgia, serif" font-size="17" fill="${PALETTE.ink}">${line
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')}</text>`,
    )
    .join('\n  ')}
  <text x="${cx}" y="${lines.length > 1 ? 462 : 444}" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="12" letter-spacing="1.6" fill="${PALETTE.lineStrong}">${producer.toUpperCase()}</text>
  <text x="${cx}" y="${lines.length > 1 ? 486 : 470}" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="15" fill="${PALETTE.accent}">${vintage}</text>
  <text x="${cx}" y="497" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="9" letter-spacing="1.2" fill="${PALETTE.lineStrong}">SAMPLE · 750 ML</text>
</svg>`;
}

/* ------------------------------------------------------------------ */
/* Sample PDF documents                                                */
/* ------------------------------------------------------------------ */

function pdfEscape(text) {
  // Base-14 Helvetica with WinAnsiEncoding covers Latin-1; typographic dashes
  // and quotes are folded to ASCII so nothing renders as a stray glyph.
  return text
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u00A0/g, ' ')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

/** A minimal, valid single-page PDF with a visible sample watermark. */
function samplePdf({ title, subtitle, rows }) {
  const lines = [
    'BT /F2 20 Tf 1 0 0 1 64 720 Tm 0.16 0.12 0.14 rg',
    `(${pdfEscape(title)}) Tj ET`,
    'BT /F1 11 Tf 1 0 0 1 64 694 Tm 0.42 0.38 0.36 rg',
    `(${pdfEscape(subtitle)}) Tj ET`,
    '0.86 0.84 0.79 RG 1 w 64 680 m 531 680 l S',
  ];
  let y = 650;
  rows.forEach(([label, value]) => {
    lines.push(`BT /F1 10 Tf 1 0 0 1 64 ${y} Tm 0.42 0.38 0.36 rg (${pdfEscape(label)}) Tj ET`);
    lines.push(`BT /F2 12 Tf 1 0 0 1 220 ${y} Tm 0.16 0.12 0.14 rg (${pdfEscape(value)}) Tj ET`);
    y -= 26;
  });
  lines.push('0.45 0.17 0.26 rg BT /F2 26 Tf 0.94 0.34 -0.34 0.94 96 250 Tm 0.86 0.80 0.76 rg');
  lines.push('(SAMPLE DOCUMENT - NOT A CERTIFICATE) Tj ET');
  lines.push('BT /F1 9 Tf 1 0 0 1 64 96 Tm 0.42 0.38 0.36 rg');
  lines.push('(Generated for the Palissage prototype. Fictional organisations and figures. No signature or seal.) Tj ET');

  const content = lines.join('\n');
  const contentLength = Buffer.byteLength(content, 'latin1');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${contentLength} >>\nstream\n${content}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((body, index) => {
    offsets.push(Buffer.byteLength(pdf, 'latin1'));
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xrefStart = Buffer.byteLength(pdf, 'latin1');
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;
  return pdf;
}

/* ------------------------------------------------------------------ */
/* Generation                                                          */
/* ------------------------------------------------------------------ */

const LOTS = [
  { id: 'demo-lot-001', name: 'Les Terrasses — Récolte 2026', vintage: 2026, color: 'red', producer: 'Domaine des Trois Terrasses' },
  { id: 'demo-lot-002', name: 'Les Pierres Claires', vintage: 2024, color: 'red', producer: 'Domaine des Trois Terrasses' },
  { id: 'demo-lot-003', name: 'Lumière Blanche', vintage: 2025, color: 'white', producer: 'Atelier des Vignes Claires' },
  { id: 'demo-lot-004', name: 'Rosée du Matin', vintage: 2025, color: 'rose', producer: 'Atelier des Vignes Claires' },
  { id: 'demo-lot-005', name: 'Première Lueur — Récolte 2026', vintage: 2026, color: 'white', producer: 'Domaine du Vent Calme' },
  { id: 'demo-lot-006', name: 'La Ligne des Vignes', vintage: 2024, color: 'red', producer: 'Domaine du Vent Calme' },
];

const manifest = { generatedBy: 'scripts/prepare-media.mjs', assets: {} };

manifest.assets['HERO-01'] = {
  kind: 'generated_illustration',
  licence: 'original artwork for this prototype',
  variants: {
    portrait: write('editorial/vineyard-hero-portrait.svg', vineyardHero(1000, 1250)),
    landscape: write('editorial/vineyard-hero-landscape.svg', vineyardHero(1440, 1080)),
  },
  approved_for_demo: true,
};
manifest.assets['ESTATE-01'] = {
  kind: 'generated_illustration',
  licence: 'original artwork for this prototype',
  variants: { landscape: write('editorial/cellar-story.svg', cellarStory(1440, 960)) },
  approved_for_demo: true,
};
manifest.assets['PROCESS-01'] = {
  kind: 'generated_illustration',
  licence: 'original artwork for this prototype',
  variants: { landscape: write('editorial/harvest-detail.svg', harvestDetail(1200, 900)) },
  approved_for_demo: true,
};

LOTS.forEach((lot, index) => {
  const id = `BOTTLE-0${index + 1}`;
  manifest.assets[id] = {
    kind: 'generated_illustration',
    licence: 'original artwork for this prototype',
    lotId: lot.id,
    variants: { default: write(`bottles/${lot.id}.svg`, bottle(lot)) },
    approved_for_demo: true,
  };
});

manifest.assets['SOCIAL-01'] = {
  kind: 'generated_illustration',
  licence: 'original artwork for this prototype',
  variants: {
    default: write(
      'social/palissage-og.svg',
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630" role="img">
  <rect width="1200" height="630" fill="${PALETTE.page}"/>
  <g transform="translate(920 315) scale(3.4)" stroke="${PALETTE.accent}" stroke-width="2" stroke-linecap="round" fill="none" opacity="0.9">
    <path d="M-28 -28 V 28"/><path d="M0 -28 V 28"/><path d="M28 -28 V 28"/>
    <path d="M-32 -12 H 32"/><path d="M-32 12 H 32"/>
  </g>
  <text x="88" y="250" font-family="Georgia, serif" font-size="76" fill="${PALETTE.ink}">Good wine.</text>
  <text x="88" y="336" font-family="Georgia, serif" font-size="76" fill="${PALETTE.accent}">A more direct route.</text>
  <text x="88" y="404" font-family="Helvetica, Arial, sans-serif" font-size="24" fill="${PALETTE.lineStrong}">Direct trade between independent wineries and professional buyers</text>
  <text x="88" y="540" font-family="Helvetica, Arial, sans-serif" font-size="20" letter-spacing="3" fill="${PALETTE.ink}">PALISSAGE · PROTOTYPE</text>
</svg>`,
    ),
  },
  approved_for_demo: true,
};

writeFileSync(resolve(mediaDir, 'assets.manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

mkdirSync(docsDir, { recursive: true });
const DOCUMENTS = [
  {
    file: 'producer-001-declaration.pdf',
    title: 'Producer declaration',
    subtitle: 'Domaine des Trois Terrasses — fictional producer, demonstration data',
    rows: [
      ['Document reference', 'demo-doc-producer-001'],
      ['Organisation', 'Domaine des Trois Terrasses'],
      ['Declared region', 'Occitanie, France (sample location)'],
      ['Declared activity', 'Production and direct sale of wine lots'],
      ['Prepared for', 'Palissage prototype review desk (demo)'],
      ['Date of declaration', '1 June 2026'],
    ],
  },
  ...LOTS.map((lot, index) => ({
    file: `lot-00${index + 1}-record.pdf`,
    title: 'Lot specification',
    subtitle: `${lot.name} — fictional lot record, demonstration data`,
    rows: [
      ['Document reference', `demo-doc-lot-00${index + 1}`],
      ['Lot identifier', lot.id],
      ['Wine', lot.name],
      ['Vintage', String(lot.vintage)],
      ['Producer', lot.producer],
      ['Bottle size', '750 ml'],
      ['Prepared for', 'Palissage prototype review desk (demo)'],
    ],
  })),
  {
    file: 'lot-001-review.pdf',
    title: 'Lot review record',
    subtitle: 'Les Terrasses — Récolte 2026, simulated review',
    rows: [
      ['Document reference', 'demo-doc-lot-001-review'],
      ['Lot identifier', 'demo-lot-001'],
      ['Review scope', 'Lot specification and producer declaration only'],
      ['Reviewer', 'Palissage review desk — demo'],
      ['Result', 'Demo verification recorded'],
      ['Not covered', 'Physical inspection, laboratory analysis, legal compliance'],
    ],
  },
  {
    file: 'lot-001-production.pdf',
    title: 'Production record',
    subtitle: 'Les Terrasses — Récolte 2026, simulated production evidence',
    rows: [
      ['Document reference', 'demo-doc-lot-001-production'],
      ['Lot identifier', 'demo-lot-001'],
      ['Recorded stage', 'Vinification'],
      ['Declared by', 'Domaine des Trois Terrasses (demo)'],
      ['Basis', 'Producer statement, not an independent measurement'],
    ],
  },
  {
    file: 'lot-001-readiness.pdf',
    title: 'Readiness record',
    subtitle: 'Les Terrasses — Récolte 2026, simulated readiness evidence',
    rows: [
      ['Document reference', 'demo-doc-lot-001-readiness'],
      ['Lot identifier', 'demo-lot-001'],
      ['Recorded stage', 'Ready for delivery'],
      ['Bottled quantity', '2,400 bottles (sample figure)'],
      ['Declared by', 'Domaine des Trois Terrasses (demo)'],
    ],
  },
  {
    file: 'redemption-001-shipment.pdf',
    title: 'Shipment record',
    subtitle: 'Delivery request — simulated shipment evidence',
    rows: [
      ['Document reference', 'demo-doc-shipment-001'],
      ['Purpose', 'Records that a shipment was declared by the winery'],
      ['Destination', 'Held privately; not printed on this sample'],
      ['Basis', 'Producer statement, not a carrier confirmation'],
    ],
  },
];

const documentMeta = {};
DOCUMENTS.forEach((document) => {
  const bytes = Buffer.from(samplePdf(document), 'latin1');
  writeFileSync(resolve(docsDir, document.file), bytes);
  documentMeta[document.file] = { byteSize: bytes.byteLength, digest: sha256(bytes) };
});

// Byte sizes and digests are written from the real files, so the evidence panel
// never displays a figure that was typed by hand.
writeFileSync(
  resolve(root, 'src/content/documents.generated.ts'),
  `/* Generated by scripts/prepare-media.mjs. Do not edit by hand. */\n\n` +
    `export const GENERATED_DOCUMENT_META: Record<string, { byteSize: number; digest: \`0x\${string}\` }> = ${JSON.stringify(
      documentMeta,
      null,
      2,
    ).replace(/"(0x[0-9a-f]+)"/g, '"$1"')};\n`,
  'utf8',
);

console.log(`Generated ${Object.keys(manifest.assets).length} assets and ${DOCUMENTS.length} sample documents.`);
