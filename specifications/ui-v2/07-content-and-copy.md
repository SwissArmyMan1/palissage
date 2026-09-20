# 07 — Content and copy

## 1. Voice

Palissage is addressing two audiences who do not share a vocabulary: a winemaker in the
Cabardès who has never used a wallet, and a grant reviewer who reads a hundred protocol decks a
month. Both are unimpressed by hype and both can tell when a claim is not backed.

The voice is **plain, specific and checkable**.

- Concrete nouns and real numbers. *2 400 bottles*, not *significant volume*.
- The business meaning first; the chain mechanism one level down. *Your money is held until
  the harvest is confirmed* on the surface, `PrimaryMarket` escrow and `releaseMilestone` in
  the technical record.
- Sentence case everywhere except the small uppercase caption style. No Title Case Headings.
- Second person for the user's own things (*your allocation*), third person for the market
  (*this offer closes on 12 October*).
- Never exclamation marks. Never "seamless", "revolutionary", "unlock", "supercharge", "the
  future of". Never emoji in the product.
- French is a full translation, not a courtesy. Producer and wine names are never translated.

### The honesty rules — non-negotiable

These are not tone preferences. Palissage sells verifiability; copy that overstates destroys
the only thing it is selling.

| Never write | Unless |
|---|---|
| *Audited*, *insured*, *guaranteed*, *risk-free*, *regulated* | There is a citable basis, linked |
| *Investment*, *yield*, *return*, *APY*, *profit*, *appreciation* | Never in this product |
| *Live trading* | Mainnet writes are enabled |
| *Partner*, *client*, *customer* about a winery | An agreement exists. Until then: *in discussion* |
| A hectare count, a GMV, a user count, a trade count | It has been measured, with the date |
| *Certified*, *approved*, *guaranteed authentic* | The word is **verified**, with what/who/when/against-what |
| *Proves this bottle is genuine* | Never. The passport identifies the lot, not the bottle |
| A projected price, a forecast, an implied discount as a gain | Never |

Both mode markers are permanent, not dismissible: `Demo · sample data` and
`Base Sepolia · test assets only`.

## 2. Terminology

One word per concept, in code, in Figma, in copy, in both languages.

| Concept | EN | FR | Never |
|---|---|---|---|
| Batch of wine | **lot** | *lot* | batch, parcel, product, SKU, asset |
| Producer | **producer** (buyer-facing) / **winery** (role) | *producteur* / *vignoble* | vendor, seller, supplier, issuer |
| Primary sale terms | **offer** | *offre* | listing, sale, drop |
| Future-vintage offer | **En Primeur** | *En Primeur* | futures, presale, pre-order, IPO |
| A buyer's position in an offer | **allocation** | *allocation* | order, purchase, position |
| Secondary offer | **listing** | *annonce* | resale offer, order |
| Bottles held | **bottles** | *bouteilles* | tokens, units, shares |
| What a wallet holds | **balance / frozen / transferable** | *solde / gelé / transférable* | one merged number, ever |
| Physical delivery request | **delivery request** (buyer) / **redemption** (contract) | *demande de livraison* | claim, withdrawal, burn |
| Money held pending milestones | **escrow** | *séquestre* | vault, pool, lock |
| Production checkpoint | **milestone** | *étape* | stage (that is production stage), phase |
| Protocol charge | **protocol fee** | *frais de protocole* | commission, spread, tax |
| Producer's cut of a resale | **producer royalty** | *royalties du producteur* | rake, fee |
| Payment token | **EURe** (testnet: **test EURe**) | idem | stablecoin, currency, funds |
| Public bottle record | **passport** | *passeport* | certificate, proof, NFT |

## 3. Numbers, dates, money

- Currency: `€7.20`, two decimals always, thousands separated by a narrow no-break space:
  `€17 798.40`. Never wei, never 18-decimal raw values.
- Quantity: integer bottles with the same separator: `2 400 bottles`. Never fractional.
- Cases of 6 may be shown as a **secondary** conversion (`2 400 bottles · 400 cases`) and never
  as a contract-enforced constraint, because it is not one.
- Fees: both the rate and the amount — `3.00 % · €2 160.00`. A bps value alone is engineering,
  not copy.
- Dates: absolute, with month spelled out, and an explicit timezone on anything that is a
  deadline: `28 February 2027, 23:59 Europe/Paris`. **Relative dates are forbidden on
  deadlines.** They may be used only as a secondary hint next to the absolute date.
- Addresses: truncated `0x81cD…77f0` with a copy button; the full value in the accessible name
  and in the technical record.
- Percentages of progress: always with the raw pair — `7 of 10`, not `70 %` alone.

## 4. Error message pattern

Three parts, always in this order: **what happened · why (if it helps) · what to do now.**
A technical detail with a copyable id sits behind a disclosure, for support.

| Situation | Message |
|---|---|
| Wrong network | *You are connected to Ethereum Mainnet. Palissage runs on Base Sepolia for this release.* → **Switch to Base Sepolia** |
| Missing claim | *This wallet is not yet qualified as a B2B buyer, so bottles cannot be minted to it. Your KYB claim is issued; the B2B buyer claim is still pending.* → **See your qualification** |
| Insufficient balance | *You need €1 008.00 of test EURe to reserve 120 bottles. This wallet holds €412.00.* → **Get test EURe** |
| Offer sold out | *All 2 400 bottles in this offer are reserved. The producer has two other lots open.* → **See their lots** |
| Terms changed | *The price changed from €8.40 to €8.60 per bottle while you were reviewing. Your total is now €1 032.00.* → **Review and confirm** / **Cancel** |
| Transaction rejected | *Request declined in your wallet. Nothing was submitted and nothing was charged.* → **Try again** |
| Transaction reverted | *The reservation was not completed. The offer's payment window closed before the transaction confirmed.* → **Back to the offer** · details disclosure with the hash |
| Read timeout | *We have not confirmed the result yet. Check the transaction before submitting it again.* → **View transaction** · **Re-check** |
| Delivery not yet possible | *This lot is ageing. Delivery opens when the producer marks it ready — the producer's stated date is October 2027.* |
| Redemption escrow | *These 240 bottles are held while the delivery is arranged. They return to your balance if the delivery is cancelled.* |

**Never**: *Something went wrong.* *An error occurred.* *Invalid input.* *Please try again
later.* If you cannot say what to do next, the error state is not finished.

## 5. Empty-state copy

Two kinds, different jobs.

| Screen | First-run (teaches) | Filtered to zero (offers escape) |
|---|---|---|
| PUB-02 | **No lots are published yet.** Producers are being onboarded for the first pilot. → *Are you a producer?* | **No lots match these filters.** → **Clear filters** (with the active chips shown) |
| WIN-02 | **Publish your first lot.** A lot is one batch of wine. Describe it, attach your production documents, and an operator verifies it before you can sell. → **Create a lot** | **No lots match.** → **Clear filters** |
| WIN-07 | **No money in escrow yet.** When buyers pay, their money is held here and released to you as production milestones are confirmed. → **Publish an offer** | — |
| SHO-05 | **You have not reserved anything yet.** Reserve an allocation and it appears here with what you owe and when. → **Browse lots** | **No allocations match.** → **Clear filters** |
| SHO-07 | **No bottles yet.** Bottles appear here once an allocation is paid in full — a deposit reserves them but does not mint them. → **Browse lots** | — |
| ADM-01 | **All queues are clear.** Nothing is waiting for a decision. | — |
| COL-01 | **Scan a bottle to start your shelf.** The code is on the back label, near the batch number. | — |

`ADM-01`'s empty state is a **success** state and reads as one — muted, not sad, no illustration.

## 6. Public site copy

Ready to use. English is authoritative; French must be a real translation before release.

### PUB-01 — Landing

**Hero**

> ### Wine sold before it is bottled.
>
> Palissage lets independent producers sell lots directly to shops, importers and restaurants —
> including part of a vintage that is still on the vine. Buyers secure their inventory at a
> fixed price. Producers get paid while the wine is still ageing.
>
> **[ Explore the lots ]**  ·  Try the demo — no wallet needed

Beside the headline: one real lot summary — producer, wine, vintage, price per bottle,
production stage, availability. The product's actual subject, on the first screen.

**Trellis lifecycle section**

> ### One lot, from the vine to the shelf.
>
> Every lot follows the same path. What changes is where you join it.
>
> *Announced* — the producer publishes the lot and its documents.
> *In the vineyard* — the vintage is growing; En Primeur buyers reserve now.
> *Harvested · Vinification · Ageing* — each confirmed step releases part of the payment.
> *Bottled* — the wine exists; remaining balances fall due.
> *Ready for delivery* — buyers request their bottles.

**Two audiences**

> **For producers.** Sell direct at your price. Finance the vintage with advance purchases
> instead of a loan. Keep a royalty when an allocation is resold. → *For wineries*
>
> **For shops and importers.** Buy closer to the source, at terms you can see. Secure next
> year's inventory before it is allocated elsewhere. Resell what you no longer need.
> → *For buyers*

**The margin, stated factually**

> ### The same margin, shared differently.
>
> A 10 000-bottle lot, sold direct at €7.20 instead of through a distributor at €8.57.
>
> | The shop pays less | The producer receives more | Protocol fee |
> |---|---|---|
> | €13 700 | €9 840 | €2 160 |
>
> *An illustration using the demo lot's figures, not measured platform activity. Shipping,
> duties and taxes are not included.*

That disclaimer is mandatory and stays adjacent to the numbers.

**Trust**

> ### What "verified" actually means here.
>
> **Every lot is checked before it can be sold.** An operator reviews the producer's
> documents and records their hash on Base. The lot page shows who checked it, when, and
> against which documents.
>
> **Only qualified businesses can hold a lot.** Transfers are restricted at the contract
> level. A buyer who is not verified cannot receive bottles — the interface will not let a
> sale start that the contract would reject.
>
> **Money is released against confirmed production.** Buyer payments sit in escrow. Each
> production milestone a verifier confirms releases the share of the payment agreed in the
> offer.
>
> **Bottles are burned on delivery.** When a buyer confirms they received the wine, the
> matching bottles are destroyed on-chain. What remains on-chain matches what remains in the
> cellar.

**Stage, honestly**

> ### Where the project is.
>
> The contracts are written, tested and deployed to Base Sepolia. The interface runs against
> that deployment. No real wine has been traded and no real money has settled. We are preparing
> a closed pilot with producers in the Cabardès, in the south of France.
>
> **[ Talk to us about the pilot ]**

### PUB-06 — For wineries

> ### Get paid before the wine leaves the cellar.
>
> Production costs money now; the wine sells later. Palissage lets buyers pay for part of a
> vintage in advance, so a share of the revenue arrives while the wine is still ageing.
>
> **Publish a lot.** Describe the batch, attach your documents, get it verified.
> **Set your terms.** Price, quantity, and how much a buyer pays up front.
> **Choose your milestones.** Harvest, vinification, bottling — you decide which confirmed steps
> release which share of the payment.
> **Get paid as you go.** Money moves as production is confirmed, not all at the end.
> **Keep earning on resale.** When a buyer resells an allocation, a royalty you set returns
> to you.
>
> *You keep your customer relationship. Palissage is the channel, not the buyer.*

### PUB-07 — For buyers

> ### Buy closer to the source, on terms you can see.
>
> **Every lot is verified before it is sold**, with the documents and the verification date on
> the page.
> **Prices are per bottle, with the fee shown**, before you commit.
> **Deadlines are dates, not surprises.** What you owe and when is on your allocation.
> **Reserve next year's stock now.** En Primeur lets you secure a vintage at a fixed price
> before it is allocated elsewhere.
> **Resell what you no longer need**, to other qualified buyers, with the producer's royalty
> handled automatically.
> **Ask for the bottles when you want them.** Delivery opens when the producer marks the lot
> ready.

### PUB-09 — On Base

The page that must be exactly right for a Base reviewer. No overstatement, no omission.

> ### What runs on Base.
>
> Palissage settles on **Base**. Base Sepolia today; Base mainnet after an independent security
> review and pilot preparation.
>
> **On-chain**
> Lot issuance and bottle balances · participant eligibility and transfer restrictions ·
> primary purchases and stablecoin escrow · milestone-based release of funds · secondary sales
> and producer royalties · redemption records, and the burn when a delivery is confirmed.
>
> **Off-chain**
> Business verification and legal agreements · private documents (their hashes are on-chain) ·
> physical inspection, storage and shipping. Authorised participants submit the attestations
> and document hashes that connect those processes to the on-chain record.
>
> **Why Base.** Low, predictable fees matter when a single lot generates a reservation, a
> balance payment, a milestone release and a redemption — four transactions per buyer per lot.
> Stablecoin settlement matters when the two sides are in different countries. And a business
> that has never held crypto has to be able to complete a purchase without learning what a gas
> token is.
>
> *Earlier prototype contracts were deployed to Arbitrum Sepolia. Those addresses are historical
> and are not the deployment this interface reads.*

The deployment manifest, the verified contract addresses and the Lens version render on this
page from the manifest itself — never hand-typed.

### PUB-10 — Pilot enquiry

> ### Join the first pilot.
>
> We are looking for a small number of producers with wine to sell or a vintage to finance, and
> the shops, importers and restaurants that buy from them regularly.
>
> This is a prototype on a test network. Joining the pilot means helping shape how the terms,
> the payment steps and the delivery process actually work — not trading real wine yet.

Form: organisation, role, country, what you produce or buy, volume, email, message.
In this version the form produces a downloadable draft and **sends nothing** — the screen says
so above the submit button, not after it.

### PAS-01 — Passport

> **{Wine name} {vintage}**
> {Producer} · {Region}
>
> **Verified** on {date} by {verifier} against {n} documents. → *See what was checked*
>
> **{Production stage}** — {plain sentence for the stage}
>
> {n} of {total} bottles from this lot have been delivered.
>
> ---
>
> *This passport describes the lot this bottle came from. It does not prove that this
> individual bottle is genuine, unopened, or yours.*
>
> **[ See the producer ]**  ·  Record on Base ↗

That disclaimer is not fine print. It is body text, adjacent to the verification block, in both
languages.

## 7. Microcopy library

| Element | EN |
|---|---|
| Primary CTA, catalogue | Explore the lots |
| Primary CTA, demo | Try the demo |
| Reserve | Reserve {n} bottles |
| Deposit choice | Pay a {x} % deposit now — €{a}. Balance €{b} due {date}. |
| Full payment choice | Pay €{total} in full now |
| Approve step | Allow Palissage to use €{amount} of your test EURe |
| Confirm step | Confirm reservation |
| Pay balance | Pay the remaining €{amount} |
| List | List {n} bottles for resale |
| Buy listing | Buy {n} bottles for €{total} |
| Request delivery | Request delivery of {n} bottles |
| Confirm receipt | Confirm you received the wine |
| Withdraw | Withdraw €{amount} |
| Verify lot | Verify this lot |
| Confirm milestone | Confirm "{milestone}" — releases €{amount} |
| Destructive | Suspend {lot name} · Cancel listing #{id} |
| Roadmap strip | Roadmap — this programme is not implemented. Nothing on this screen is recorded on Base. |
| Demo marker | Demo · sample data |
| Testnet marker | Base Sepolia · test assets only |
| Deposit explainer | A deposit reserves bottles. Bottles are minted when the allocation is paid in full. |
| Escrow explainer | Held until production milestones are confirmed. |
| Frozen explainer | Owned, but not transferable right now. |

Buttons are verb phrases naming the outcome. Never *Submit*, *OK*, *Continue* on a money action.

## 8. Localisation

EN and FR complete before any public release. FR strings run 15–25 % longer — the French string
is the layout test in Figma and in review, not the English one. Producer names, wine names,
appellations and grape varieties are never translated. Number and date formatting follow the
active locale; the currency symbol stays `€` in both. No string is concatenated from fragments;
every message with a variable is a single parameterised template so word order can change in
translation.
