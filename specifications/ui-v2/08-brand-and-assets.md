# 08 — Brand and assets

## 1. Brand direction — Editorial modern

Decided in phase 0. The trellis is the brand's actual idea, and it is also the product's actual
mechanism, so it becomes a **system motif** rather than a decorative logo.

| Element | Role in v2 | Where it appears |
|---|---|---|
| **Vine mark** — one vine growing across three wires | **Primary symbol.** Simplified to a single-weight line drawing that survives 24 px. | Favicon, app top bar, mobile tab bar home, passport header, OG image |
| **Trellis line** — three wires and posts | **System motif.** Section dividers, the lifecycle component, progress rails, the footer rule. | Everywhere, as structure |
| **Ornate wordmark** — `PALISSAGE` in vine lettering | **Seal.** Never a header logo, never at a small size. | Footer, passport seal, PDF/document headers, OG image, `/legal/credits` |
| **Tagline** `REAL WORLD WINE ASSETS` | Retired from the interface. | Kept in the seal artwork only |

The wordmark in the header is set in the type system — Fraunces, `SOFT 0 WONK 0`, weight 600,
tracking −0.02em, in `--color-text-primary` — beside the vine mark. The ornate lettering is
beautiful at 400 px and unreadable at 32 px; using it as a header logo is what made the live
site feel like signage rather than a product.

The tagline is retired because `assets` is on the forbidden-words list in doc 07 §2. It stays
in the seal artwork, which is a picture of an object, not a claim in running copy.

## 2. Brand asset production — blocking

The four supplied files (`UI/white.jpg`, `UI/black.jpg`, `UI/white_crop.jpg`,
`UI/black_crop.jpg`, added 8 September 2026) are **JPEGs with a baked background and a drop
shadow**, rendered as a physical wrought-iron sign on a wall. They are excellent reference art
and unusable as interface assets: placed on the limestone page or the dark surface they show a
visible rectangle, and they cannot be recoloured per theme.

The four earlier PNGs in `UI/web/public/img/brand/` are 550 × 240 and 150 × 140 — too small for
any hero use, and the two `mark-*.png` files are the only ones with real alpha.

### Required deliverables

| ID | File | Source | Notes |
|---|---|---|---|
| BR-01 | `brand/mark.svg` | Trace from `white_crop.jpg` | Single path, `currentColor`, no baked colour. Must read at 24 px — simplify leaf count until it does. |
| BR-02 | `brand/mark-detailed.svg` | Trace | Full leaf and grape detail, for ≥ 96 px use |
| BR-03 | `brand/seal.svg` | Trace of the full lockup | The ornate wordmark + trellis, `currentColor`, min width 240 px, `aria-hidden` where decorative |
| BR-04 | `brand/trellis.svg` | Drawn, not traced | Three wires + post, tiling, 1–1.5 px stroke, `currentColor` |
| BR-05 | `brand/lifecycle.svg` | Drawn | The `Trellis lifecycle` component's geometry: 7 posts, 3 wires, one vine path with a known total length for `stroke-dasharray` |
| BR-06 | `favicon.svg` + `apple-touch-icon.png` 180×180 | From BR-01 | Light/dark aware via `prefers-color-scheme` inside the SVG |
| BR-07 | `social/og.jpg` 1200 × 630 | Composition | Vine mark + headline + hero crop + the seal. Safe text area 960 × 450 |

All brand SVGs use `currentColor` so one asset serves both themes. A white-filled PNG on a dark
surface haloes; that is why none of the supplied rasters can be shipped as-is.

**Trace, do not regenerate.** The vine drawing is the project's identity. Vectorise the existing
artwork (manual pen work or a traced path cleaned by hand). Do not ask an image generator for
"a similar vine" — it will not be the same mark.

## 3. Photography — audit and rights

### What exists

| File | What it is | Dimensions | Verdict |
|---|---|---|---|
| `estate/deumie-panorama.jpg` | Vineyard rows to the hills, trellis post in the foreground | 1352 × 1930 | **Best hero candidate.** Literally a palissage. Needs grading; sky is blown. Portrait only — a landscape crop loses the depth, so mobile and desktop need separate crops, not one image. |
| `estate/rissac-vineyard.jpg` | A person working a vine, close, back to camera | 1828 × 2560 | Documentary. Person is identifiable by posture, not by face. Usable under the rule below, as texture — **not** as a hero. |
| `estate/rissac-domain.jpg` | Estate view | 1828 × 2560 | Usable; check for people and signage before cropping |
| `wine/cazaban-*.jpg` (4) | Proper packshots, Nikon D800 / Z7, Lightroom | up to 300 dpi | **Best quality in the set.** Use as the reference standard for every other bottle image |
| `wine/botica-*.jpg` (3) | Packshots. **EXIF copyright: "Samuel le Photographe"** | 1000–1200 × 1500–1800 | Third-party photographer credit. **Blocked until cleared** — see below |
| `wine/parazols-niange.jpg` | Packshot | 1100 × 1400 | Usable subject to producer permission |
| `wine/mijane-galea-*.png` | Transparent cutouts | 284 × 632, 178 × 611 | **Too small.** Unusable above ~150 px. Request originals from the producer or re-shoot |
| `src/assets/hero.png` | — | 343 × 361 | Unusable at any hero size. Delete |

### The rule for people in frame

Per the owner's decision: people may appear **where they are incidental to the scene** — a
figure working in a row, hands on a vine, a silhouette at distance. People may **not** appear as
portraits, as the subject of the frame, or in any way that implies endorsement.

Domaine de Cazaban's woman-with-horse-and-plough image is explicitly cleared by the owner and
is one of that producer's own marks. It is a strong candidate for the `/for-wineries` hero and
for the Cazaban producer page, and it is the one image in the set that carries the "real
farming, real people" idea without becoming a portrait.

`estate/rissac-vineyard.jpg` sits at the edge of the rule — the person fills the frame. Use a
tighter crop of the hands and the vine, or do not use it.

### Rights manifest — required before any public release

Create `UI/web/asset-sources/manifest.json`. One record per file, and **only `granted` files may
be published**:

```json
{
  "id": "WINE-BOT-RISSAC",
  "path": "public/media/wine/botica-rissac-{640,960,1440}.{avif,webp,jpg}",
  "master": "asset-sources/wine/botica-rissac-master.jpg",
  "sha256": "…",
  "subject": "Tour de Rissac 2021 — packshot",
  "producer": "Domaines Botica Galy",
  "photographer": "Samuel le Photographe (from EXIF)",
  "rights_status": "pending",
  "permission_ref": null,
  "people_in_frame": false,
  "cleared_for": [],
  "alt_en": "…", "alt_fr": "…"
}
```

`rights_status` is one of `granted` · `pending` · `blocked`. A build that finds a non-`granted`
asset referenced from a public route fails. This is a build check, not a convention — it is the
only mechanism that reliably keeps an uncleared photograph off a live site.

Three separate permissions are needed and are different things: the **producer's** permission
to use their name, wine and brand; the **photographer's** licence for the image; and, where a
person is recognisable, that **person's** release. A producer saying "yes, use our photos" does
not grant the photographer's copyright.

### The label every producer page carries until an agreement exists

> *{Producer} is in discussion about joining the first Palissage pilot. No commercial agreement
> is in place, and no wine has been traded on the platform.*

### What must not appear

Stock portraits of invented founders · logos of unconfirmed partners · people drinking ·
abstract blockchain cubes, chains, glowing nodes or 3D coins · AI-generated "certificates" ·
emoji placeholders · a fictional label composited onto a real branded bottle.

## 4. Image pipeline

| Slot | Aspect | Widths | Formats | Loading |
|---|---|---|---|---|
| Hero, desktop | 4:5 | 960, 1440, 1920 | AVIF · WebP · JPEG | eager, `fetchpriority="high"`, preloaded |
| Hero, mobile | 4:3 | 640, 960 | AVIF · WebP · JPEG | eager, `fetchpriority="high"` |
| Editorial | 3:2 | 640, 960, 1440 | AVIF · WebP · JPEG | lazy |
| Bottle packshot | 3:4, `contain` | 320, 640, 960 | WebP + PNG (alpha) | lazy, first row eager |
| Producer card | 16:9 | 480, 800 | AVIF · WebP | lazy |
| Passport bottle | 3:4 | 320, 640 | WebP | eager — it is the LCP element |

Masters live in `UI/web/asset-sources/` (outside `public/`); only derivatives are published.
Every asset is served from the application origin — no runtime CDN URLs, so a local offline
demo works and no visitor request reaches a third party.

Bottle packshots need real alpha, no white fringe on the limestone background, a consistent
baseline across all bottles, and one consistent light direction. Six mismatched angles in a
grid is the failure mode; the Cazaban packshots set the standard the rest must match.

## 5. Alt text

Every content image carries alt text in EN and FR in the manifest. Decorative images —
the trellis motif, leaves, the seal used as ornament — get `alt=""` and `aria-hidden`.

Alt text describes what is in the frame and, where the image is illustrative rather than a
record, says so:

- `Vineyard rows and a trellis post at Domaine de Cazaban, Cabardès` — a record.
- `Vineyard rows in southern France, illustrative photograph` — not a record of a specific
  producer's site.

A photograph is never used as evidence of verification. Verification evidence is documents and
their hashes, shown in the evidence panel.
